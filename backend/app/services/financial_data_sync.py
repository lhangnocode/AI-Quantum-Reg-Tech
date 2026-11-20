from __future__ import annotations

import asyncio
import csv
import json
import os
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import HTTPException

from app.core.config import ROOT
from app.repositories.workbook import load_data_file


PROVIDER = "VNDirect Finfo API"
BASE_URL = "https://api-finfo.vndirect.com.vn/v4"
PRICE_PATH = Path(os.getenv("MARKET_PRICE_PATH") or ROOT / "data" / "market_prices_monthly.csv")
SNAPSHOT_PATH = Path(os.getenv("LATEST_FINANCIAL_DATA_PATH") or ROOT / "data" / "latest_financial_data.json")
PRICE_COLUMNS = ("VNM", "MCH", "MCM", "SBT", "QNS", "KDC", "PAN", "IDP", "SAB", "VNINDEX")
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; QuantumRegTech/1.0)",
    "Origin": "https://dstock.vndirect.com.vn",
    "Referer": "https://dstock.vndirect.com.vn/",
}


def _atomic_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as target:
            json.dump(payload, target, ensure_ascii=False, indent=2)
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _month_end(day: date) -> str:
    next_month = date(day.year + (day.month == 12), day.month % 12 + 1, 1)
    return (next_month - timedelta(days=1)).isoformat()


def _period_date(row: dict[str, Any]) -> str:
    for key in ("fiscalDate", "fiscal_date", "reportDate", "report_date", "date", "periodEnd", "period_end", "fiscalDateEnding"):
        value = row.get(key)
        if not value:
            continue
        raw = str(value)
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).date().isoformat()
        except ValueError:
            for fmt in ("%d/%m/%Y", "%Y%m%d", "%Y"):
                try:
                    return datetime.strptime(raw, fmt).date().isoformat()
                except ValueError:
                    continue
    year = row.get("yearReport", row.get("reportYear", row.get("fiscalYear")))
    quarter = row.get("lengthReport", row.get("reportQuarter", row.get("quarter")))
    try:
        y = int(year)
        q = int(quarter) if quarter is not None else 4
        return date(y, q * 3, 1).replace(day=1).isoformat()
    except (TypeError, ValueError):
        return ""


def _normalize_statement_rows(payload: Any) -> dict[str, Any]:
    data = payload.get("data", []) if isinstance(payload, dict) else []
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        data = []
    rows = [row for row in data if isinstance(row, dict)]
    dated = [(period, row) for row in rows if (period := _period_date(row))]
    if not dated:
        return {"period": None, "reportDate": None, "items": [], "recordCount": len(rows)}
    latest_period = max(period for period, _ in dated)
    latest_rows = [row for period, row in dated if period == latest_period]
    items: list[dict[str, Any]] = []
    for row in latest_rows:
        label = next((row.get(key) for key in ("itemName", "normName", "name", "title", "item", "itemCode", "normCode") if row.get(key) not in (None, "")), None)
        value = next((row.get(key) for key in ("numericValue", "value", "amount", "itemValue", "data") if row.get(key) is not None), None)
        if label is not None and value is not None:
            items.append({"label": str(label), "value": value, "unit": row.get("unit")})
        else:
            ignored = {"code", "symbol", "ticker", "reportDate", "report_date", "date", "periodEnd", "period_end", "fiscalDateEnding", "fiscalDate", "fiscal_date", "yearReport", "reportYear", "fiscalYear", "lengthReport", "reportQuarter", "quarter", "reportType", "type"}
            for key, item_value in row.items():
                if key not in ignored and isinstance(item_value, (int, float, str)) and item_value != "":
                    items.append({"label": str(key), "value": item_value, "unit": None})
    unique: dict[str, dict[str, Any]] = {}
    for item in items:
        unique[item["label"]] = item
    filed_date = None
    for row in latest_rows:
        filed_date = next((row.get(key) for key in ("publishedDate", "publishDate", "announcementDate", "createdDate") if row.get(key)), None)
        if filed_date:
            break
    return {
        "period": latest_period,
        "reportDate": str(filed_date) if filed_date else None,
        "items": list(unique.values())[:80],
        "recordCount": len(rows),
    }


def _load_old_prices() -> dict[str, dict[str, str]]:
    if not PRICE_PATH.exists():
        return {}
    with PRICE_PATH.open(encoding="utf-8-sig", newline="") as source:
        return {row["date"]: row for row in csv.DictReader(source) if row.get("date")}


async def _fetch_json(client: httpx.AsyncClient, endpoint: str, params: dict[str, str]) -> Any:
    response = await client.get(f"{BASE_URL}/{endpoint}", params=params, headers=HEADERS)
    response.raise_for_status()
    return response.json()


async def _fetch_ticker(client: httpx.AsyncClient, ticker: str, start: str, end: str) -> tuple[str, Any, Any]:
    escaped = quote(ticker, safe="")
    price_task = _fetch_json(client, "stock_prices", {
        "sort": "date",
        "q": f"code:{escaped}~date:gte:{start}~date:lte:{end}",
        "size": "9999",
        "page": "1",
    })
    statement_task = _fetch_json(client, "financial_statements", {
        "sort": "fiscalDate:desc",
        "q": f"code:{escaped}~fiscalDate:lte:{end}~reportType:QUARTER",
        "size": "500",
        "page": "1",
    })
    prices, statements = await asyncio.gather(price_task, statement_task, return_exceptions=True)
    return ticker, prices, statements


async def refresh_financial_data() -> dict[str, Any]:
    engine = load_data_file("financial_engine.json")
    tickers = [str(ticker).upper() for ticker in engine.get("tickers", [])]
    if not tickers:
        raise HTTPException(status_code=503, detail="Không tìm thấy danh sách mã cần đồng bộ.")
    today = date.today()
    start = date(2018, 11, 1)
    end = today
    all_symbols = [*tickers, "VNINDEX"]
    sem = asyncio.Semaphore(4)

    async def guarded(client: httpx.AsyncClient, symbol: str) -> tuple[str, Any, Any | None]:
        async with sem:
            if symbol == "VNINDEX":
                prices = await _fetch_json(client, "vnmarket_prices", {
                    "sort": "date", "q": f"code:{symbol}~date:gte:{start.isoformat()}~date:lte:{end.isoformat()}", "size": "9999", "page": "1",
                })
                return symbol, prices, None
            return await _fetch_ticker(client, symbol, start.isoformat(), end.isoformat())

    timeout = httpx.Timeout(25.0, connect=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            results = await asyncio.gather(*(guarded(client, symbol) for symbol in all_symbols), return_exceptions=True)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Không kết nối được nguồn dữ liệu {PROVIDER}: {exc}") from exc

    price_failures: list[dict[str, str]] = []
    fundamental_failures: list[dict[str, str]] = []
    prices_by_symbol: dict[str, list[dict[str, Any]]] = {}
    fundamentals: dict[str, dict[str, Any]] = {}
    previous_snapshot = get_financial_data_status()
    fundamentals.update(previous_snapshot.get("fundamentals", {}))
    for symbol, result in zip(all_symbols, results):
        if isinstance(result, BaseException):
            price_failures.append({"ticker": symbol, "error": str(result)[:240]})
            continue
        _, price_payload, statement_payload = result
        if isinstance(price_payload, BaseException):
            price_failures.append({"ticker": symbol, "error": str(price_payload)[:240]})
            continue
        price_data = price_payload.get("data", []) if isinstance(price_payload, dict) else []
        normalized_prices = []
        for row in price_data if isinstance(price_data, list) else []:
            if not isinstance(row, dict) or not row.get("date"):
                continue
            close = row.get("adClose") if symbol != "VNINDEX" else row.get("close")
            close = close if close is not None else row.get("close")
            try:
                parsed = float(close)
                day = date.fromisoformat(str(row["date"])[:10])
            except (TypeError, ValueError):
                continue
            if parsed > 0:
                normalized_prices.append({"date": day.isoformat(), "close": parsed})
        if not normalized_prices:
            price_failures.append({"ticker": symbol, "error": "Nguồn không trả dữ liệu giá hợp lệ."})
            continue
        prices_by_symbol[symbol] = normalized_prices
        if symbol != "VNINDEX" and isinstance(statement_payload, BaseException):
            fundamental_failures.append({"ticker": symbol, "error": str(statement_payload)[:240]})
        elif symbol != "VNINDEX" and statement_payload is not None:
            normalized = _normalize_statement_rows(statement_payload)
            if normalized["period"]:
                fundamentals[symbol] = normalized
            else:
                fundamental_failures.append({"ticker": symbol, "error": "Không nhận diện được kỳ báo cáo trong dữ liệu tài chính."})

    missing_prices = sorted(set(all_symbols) - set(prices_by_symbol))
    if missing_prices:
        raise HTTPException(status_code=502, detail={
            "message": "Thiếu chuỗi giá của một số mã; dữ liệu trước đó được giữ nguyên.",
            "missingPrices": missing_prices,
            "priceFailures": price_failures,
        })

    current_month = date(today.year, today.month, 1)
    monthly = {period: row for period, row in _load_old_prices().items() if date.fromisoformat(period) < current_month}
    for symbol, rows in prices_by_symbol.items():
        grouped: dict[str, tuple[str, float]] = {}
        for item in rows:
            day = date.fromisoformat(item["date"])
            if day >= current_month:
                continue
            month_key = _month_end(day)
            # Retain the latest trading row in each calendar month.
            current = grouped.get(month_key)
            if current is None or item["date"] > current[0]:
                grouped[month_key] = (item["date"], item["close"])
        for month_key, (_, close) in grouped.items():
            row = monthly.setdefault(month_key, {"date": month_key, **{column: "" for column in PRICE_COLUMNS}})
            row[symbol] = f"{close:.8f}".rstrip("0").rstrip(".")

    PRICE_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".market_prices_monthly.", dir=PRICE_PATH.parent, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as target:
            writer = csv.DictWriter(target, fieldnames=("date", *PRICE_COLUMNS), lineterminator="\n")
            writer.writeheader()
            for day in sorted(monthly):
                writer.writerow({"date": day, **{ticker: monthly[day].get(ticker, "") for ticker in PRICE_COLUMNS}})
            target.flush()
            os.fsync(target.fileno())
        os.replace(temporary, PRICE_PATH)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

    snapshot = {
        "provider": PROVIDER,
        "sourceUrl": "https://api-finfo.vndirect.com.vn/v4",
        "fetchedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "priceThrough": {ticker: max(row["date"] for row in rows) for ticker, rows in prices_by_symbol.items()},
        "prices": {ticker: max(rows, key=lambda row: row["date"]) for ticker, rows in prices_by_symbol.items()},
        "fundamentals": fundamentals,
        "fundamentalFailures": fundamental_failures,
        "notes": "Giá cổ phiếu là giá đóng cửa điều chỉnh; VN-Index dùng giá đóng cửa. Báo cáo tài chính được giữ nguyên nguồn, chưa ghi đè điểm Z/ESG cho tới khi kiểm tra ánh xạ chỉ tiêu.",
    }
    _atomic_json(SNAPSHOT_PATH, snapshot)
    return {key: value for key, value in snapshot.items() if key != "fundamentals"} | {
        "tickersUpdated": len(fundamentals),
        "latestReportPeriods": {ticker: item["period"] for ticker, item in fundamentals.items()},
        "fundamentalFailures": fundamental_failures,
    }


def get_financial_data_status() -> dict[str, Any]:
    if not SNAPSHOT_PATH.exists():
        return {"provider": PROVIDER, "fetchedAt": None, "prices": {}, "priceThrough": {}, "fundamentals": {}, "status": "not_synced"}
    try:
        payload = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        return {**payload, "status": "ready"}
    except (OSError, json.JSONDecodeError):
        return {"provider": PROVIDER, "fetchedAt": None, "prices": {}, "priceThrough": {}, "fundamentals": {}, "status": "unavailable"}
