from __future__ import annotations

import csv
import os
from datetime import date
from pathlib import Path
from typing import Any

import numpy as np
from scipy.optimize import minimize
from fastapi import HTTPException

from app.core.config import ROOT
from app.repositories.workbook import load_data_file


PRICE_PATH = Path(os.getenv("MARKET_PRICE_PATH") or ROOT / "data" / "market_prices_monthly.csv")
PRICE_COLUMNS = ("VNM", "MCH", "MCM", "SBT", "QNS", "KDC", "PAN", "IDP", "SAB", "VNINDEX")
WINDOW_MONTHS = 36
MIN_OBSERVATIONS = 11
WEIGHT_MIN = 0.02
WEIGHT_MAX = 0.40


def _load_prices() -> list[dict[str, Any]]:
    if not PRICE_PATH.exists():
        raise HTTPException(status_code=503, detail="Thiếu chuỗi giá tháng dùng cho bộ đề xuất Markowitz + ESG.")
    try:
        with PRICE_PATH.open(encoding="utf-8-sig", newline="") as source:
            rows = []
            for row in csv.DictReader(source):
                values: dict[str, Any] = {"date": date.fromisoformat(row["date"])}
                for ticker in PRICE_COLUMNS:
                    value = row.get(ticker, "").strip()
                    values[ticker] = float(value) if value else None
                rows.append(values)
            return sorted(rows, key=lambda row: row["date"])
    except (OSError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=503, detail="Không đọc được chuỗi giá tháng của bộ đề xuất.") from exc


def _annualized_covariance(rows: list[dict[str, Any]], tickers: list[str], data_year: int) -> tuple[np.ndarray, np.ndarray, float, list[dict[str, int]]]:
    cutoff = date(data_year, 12, 31)
    prices = [row for row in rows if row["date"] <= cutoff][-WINDOW_MONTHS - 1 :]
    if len(prices) < MIN_OBSERVATIONS + 1:
        raise HTTPException(status_code=422, detail=f"Không đủ chuỗi giá trước {cutoff.isoformat()} để tính covariance.")

    returns: list[dict[str, Any]] = []
    for previous, current in zip(prices, prices[1:]):
        item: dict[str, Any] = {"date": current["date"]}
        for ticker in [*tickers, "VNINDEX"]:
            start, end = previous[ticker], current[ticker]
            item[ticker] = end / start - 1 if start not in (None, 0) and end is not None else None
        returns.append(item)

    counts = [{"ticker": ticker, "observations": sum(row[ticker] is not None for row in returns)} for ticker in tickers]
    insufficient = [item for item in counts if item["observations"] < MIN_OBSERVATIONS]
    if insufficient:
        detail = ", ".join(f"{item['ticker']} ({item['observations']})" for item in insufficient)
        raise HTTPException(status_code=422, detail=f"Thiếu tối thiểu {MIN_OBSERVATIONS} tháng lợi suất cho: {detail}.")

    covariance = np.zeros((len(tickers), len(tickers)), dtype=float)
    for i, left in enumerate(tickers):
        for j in range(i, len(tickers)):
            right = tickers[j]
            paired = [(row[left], row[right]) for row in returns if row[left] is not None and row[right] is not None]
            if len(paired) < MIN_OBSERVATIONS:
                raise HTTPException(status_code=422, detail=f"Không đủ tháng chung để ước lượng covariance {left}/{right}.")
            x = np.asarray([pair[0] for pair in paired], dtype=float)
            y = np.asarray([pair[1] for pair in paired], dtype=float)
            value = float(np.cov(x, y, ddof=1)[0, 1] * 12)
            covariance[i, j] = covariance[j, i] = value

    # Match the notebook's PSD repair before passing the matrix to SLSQP.
    eigenvalues, eigenvectors = np.linalg.eigh((covariance + covariance.T) / 2)
    covariance = eigenvectors @ np.diag(np.clip(eigenvalues, 1e-8, None)) @ eigenvectors.T

    market_returns = np.asarray([row["VNINDEX"] for row in returns if row["VNINDEX"] is not None], dtype=float)
    if len(market_returns) < MIN_OBSERVATIONS:
        raise HTTPException(status_code=422, detail="Không đủ dữ liệu VN-Index để tính hệ số ngại rủi ro λ.")
    market_variance = float(np.var(market_returns, ddof=1) * 12)
    return covariance, np.asarray(market_returns), market_variance, counts


def _solve(mu: np.ndarray, sigma: np.ndarray, lam: float) -> np.ndarray:
    def objective(weights: np.ndarray) -> float:
        return float(-(weights @ mu - 0.5 * lam * weights @ sigma @ weights))

    def gradient(weights: np.ndarray) -> np.ndarray:
        return -(mu - lam * sigma @ weights)

    result = minimize(
        objective,
        np.full(len(mu), 1 / len(mu)),
        jac=gradient,
        method="SLSQP",
        bounds=[(WEIGHT_MIN, WEIGHT_MAX)] * len(mu),
        constraints=[{"type": "eq", "fun": lambda weights: float(weights.sum() - 1), "jac": lambda weights: np.ones(len(weights))}],
        options={"ftol": 1e-12, "maxiter": 500},
    )
    if not result.success:
        raise HTTPException(status_code=422, detail=f"Không tìm được phân bổ khả thi: {result.message}")
    return np.asarray(result.x, dtype=float)


def _portfolio_metrics(weights: np.ndarray, records: list[dict[str, Any]], sigma: np.ndarray) -> dict[str, float]:
    mu = np.asarray([record["calculated"]["returns"]["capmExpected"] for record in records], dtype=float)
    realized = np.asarray([record["calculated"]["returns"]["adjustedPricePeriod"] for record in records], dtype=float)
    esg = np.asarray([record["calculated"]["esg"]["total"] for record in records], dtype=float)
    risk = np.asarray([record["calculated"]["altman"]["rFinTotal"] for record in records], dtype=float)
    return {
        "expectedReturn": float(weights @ mu),
        "historicalReturn": float(weights @ realized),
        "esgScore": float(weights @ esg),
        "rFinTotal": float(weights @ risk),
        "annualizedVolatility": float(np.sqrt(max(weights @ sigma @ weights, 0))),
    }


def _price_validation_warnings(price_rows: list[dict[str, Any]], records: list[dict[str, Any]]) -> list[str]:
    warnings = []
    for record in records:
        ticker = record["ticker"]
        forecast_year = record["forecastYear"]
        previous = [row for row in price_rows if row["date"].year == forecast_year - 1 and row[ticker] is not None]
        current = [row for row in price_rows if row["date"].year == forecast_year and row[ticker] is not None]
        if not previous or not current:
            warnings.append(f"Thiếu giá để đối chiếu lợi suất lịch sử {forecast_year} của {ticker}.")
            continue
        price_return = current[-1][ticker] / previous[-1][ticker] - 1
        sheet_return = record["calculated"]["returns"]["adjustedPricePeriod"]
        difference = price_return - sheet_return
        if abs(difference) > 0.05:
            warnings.append(f"{ticker} ({forecast_year}): lợi suất từ CSV lệch {difference * 100:+.2f} điểm % so với workbook.")
    return warnings


def optimize_portfolio(data_year: int, tickers: list[str], gamma: float, delta: float, accepted_osint_levels: dict[str, int] | None = None) -> dict[str, Any]:
    tickers = [ticker.strip().upper() for ticker in tickers]
    if len(set(tickers)) != len(tickers):
        raise HTTPException(status_code=422, detail="Danh sách mã bị lặp.")
    if len(tickers) * WEIGHT_MIN > 1 or len(tickers) * WEIGHT_MAX < 1:
        raise HTTPException(status_code=422, detail="Với giới hạn 2%–40% của mô hình, cần chọn từ 3 đến 9 mã.")

    engine = load_data_file("financial_engine.json")
    records_by_ticker = {record["ticker"]: record for record in engine["records"] if record["dataYear"] == data_year}
    missing = [ticker for ticker in tickers if ticker not in records_by_ticker]
    if missing:
        raise HTTPException(status_code=422, detail=f"Không có dữ liệu năm {data_year} cho: {', '.join(missing)}.")
    records = [records_by_ticker[ticker] for ticker in tickers]

    penalties = engine["penaltyTable"]
    accepted_osint_levels = accepted_osint_levels or {}
    for record in records:
        ticker = record["ticker"]
        accepted = accepted_osint_levels.get(ticker, 0)
        if accepted not in (0, 1, 2, 3):
            raise HTTPException(status_code=422, detail=f"Mức OSINT không hợp lệ cho {ticker}.")
        altman = record["calculated"]["altman"]
        current_level = record["calculated"]["osint"]["penaltyLevel"]
        level = max(current_level, accepted)
        if level > current_level:
            altman["rFinTotal"] = altman["rFinBase"] + penalties[str(level)]

    price_rows = _load_prices()
    covariance, _market_returns, market_variance, observations = _annualized_covariance(price_rows, tickers, data_year)
    market = engine["params"]["market"].get(str(data_year))
    if not market or market_variance <= 0:
        raise HTTPException(status_code=422, detail=f"Không có MRP hợp lệ cho năm {data_year}.")
    lam = float(market["marketRiskPremium"]) / market_variance
    mu = np.asarray([record["calculated"]["returns"]["capmExpected"] for record in records], dtype=float)
    esg = np.asarray([record["calculated"]["esg"]["total"] for record in records], dtype=float)
    risk = np.asarray([record["calculated"]["altman"]["rFinTotal"] for record in records], dtype=float)

    weights = _solve(mu + gamma * esg - delta * risk, covariance, lam)
    baseline_weights = _solve(mu, covariance, lam)
    cutoff = date(data_year, 12, 31)
    window_prices = [row for row in price_rows if row["date"] <= cutoff][-WINDOW_MONTHS - 1 :]
    window_start = window_prices[0]["date"].isoformat()
    window_end = window_prices[-1]["date"].isoformat()
    warnings = [
        "Bộ tham số notebook khởi đầu γ=0,30 và δ=0,25 được chọn ex-post trên kết quả 2022–2025; chưa phải kiểm định ngoài mẫu.",
        "Lợi suất lịch sử năm dự báo chỉ dùng để đối chiếu; không phải dự báo hay cam kết lợi nhuận.",
        *_price_validation_warnings(price_rows, records),
    ]
    return {
        "status": "prototype",
        "dataYear": data_year,
        "forecastYear": int(records[0]["forecastYear"]),
        "tickers": tickers,
        "gamma": gamma,
        "delta": delta,
        "riskAversionLambda": lam,
        "windowStart": window_start,
        "windowEnd": window_end,
        "windowMonths": WINDOW_MONTHS,
        "observations": observations,
        "weights": {ticker: float(weight) for ticker, weight in zip(tickers, weights)},
        "baselineWeights": {ticker: float(weight) for ticker, weight in zip(tickers, baseline_weights)},
        "metrics": _portfolio_metrics(weights, records, covariance),
        "baselineMetrics": _portfolio_metrics(baseline_weights, records, covariance),
        "warnings": warnings,
        "source": "Kaggle notebook portfolio_esg.py; prices_monthly.csv from VNDirect adjusted close / VN-Index monthly close.",
    }
