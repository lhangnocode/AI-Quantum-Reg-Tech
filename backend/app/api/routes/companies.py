from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.core.config import DATA_VERSION, METHODOLOGY_VERSION
from app.domain.contracts import CompanyPage, RegisterCompany, UniverseEntry
from app.repositories.universe import register_company as register_universe_company, registry_entries
from app.repositories.workbook import company_data, company_events, provenance, workbook_companies, workbook_pending


router = APIRouter(tags=["companies"])


@router.get("/api/v1/companies", response_model=CompanyPage)
def list_companies(
    q: str | None = Query(default=None, max_length=100),
    universe_version: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    cursor: str | None = None,
) -> CompanyPage:
    if universe_version and universe_version != DATA_VERSION:
        raise HTTPException(status_code=409, detail=f"Unknown universe version: {universe_version}")
    workbook = workbook_companies()
    entries: list[UniverseEntry] = []
    known: set[str] = set()
    for company in workbook:
        ticker = str(company.get("ticker", "")).upper()
        if not ticker:
            continue
        known.add(ticker)
        entries.append(UniverseEntry(
            ticker=ticker,
            name=company.get("name"),
            exchange=company.get("exchange"),
            subsector=company.get("subsector"),
            availability="analysis_ready",
            source_reference=f"workbook:{DATA_VERSION}",
            provenance=provenance("demo", f"workbook:{DATA_VERSION}"),
        ))
    for pending in workbook_pending():
        ticker = str(pending.get("ticker", "")).upper()
        if not ticker or ticker in known:
            continue
        known.add(ticker)
        source_reference = pending.get("source_reference") or f"workbook:{DATA_VERSION}"
        entries.append(UniverseEntry(
            ticker=ticker,
            name=pending.get("name"),
            exchange=pending.get("exchange"),
            subsector=pending.get("subsector"),
            availability="pending_data",
            missing_required_fields=pending.get("missing_required_fields", []),
            source_reference=source_reference,
            provenance=provenance("pending_data", source_reference),
        ))
    for row in registry_entries(DATA_VERSION):
        if row["ticker"] in known:
            continue
        entries.append(UniverseEntry(
            ticker=row["ticker"],
            availability="pending_data",
            missing_required_fields=["company_name", "financial_metrics", "market_data", "esg_inputs"],
            source_reference=row["source_reference"],
            provenance=provenance("pending_data", row["source_reference"]),
        ))
    entries.sort(key=lambda item: item.ticker)
    if q:
        needle = q.casefold()
        entries = [item for item in entries if needle in item.ticker.casefold() or needle in (item.name or "").casefold()]
    start = 0
    if cursor:
        matches = [i for i, item in enumerate(entries) if item.ticker == cursor.upper()]
        if not matches:
            raise HTTPException(status_code=400, detail="Invalid cursor for this filtered universe")
        start = matches[0] + 1
    total = len(entries)
    page = entries[start : start + limit]
    next_cursor = page[-1].ticker if start + len(page) < total and page else None
    page_tickers = {item.ticker for item in page}
    ready_companies = [company for company in workbook if str(company.get("ticker", "")).upper() in page_tickers]
    return CompanyPage(
        items=page,
        companies=ready_companies,
        next_cursor=next_cursor,
        limit=limit,
        total=total,
        provenance=provenance("demo", f"workbook:{DATA_VERSION}; registry:sqlite"),
    )


@router.post("/api/v1/universes/{universe_id}/companies", response_model=UniverseEntry, status_code=201)
def create_company(universe_id: str, body: RegisterCompany) -> UniverseEntry:
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", universe_id):
        raise HTTPException(status_code=422, detail="Invalid universe_id")
    return register_universe_company(universe_id, body)


@router.get("/api/v1/companies/{ticker}/assessment")
def company_assessment(ticker: str) -> dict:
    ticker = ticker.upper()
    company = next((item for item in workbook_companies() if item.get("ticker", "").upper() == ticker), None)
    if company is None:
        raise HTTPException(status_code=404, detail="Company is not analysis-ready in this demo dataset")
    return {
        "company": company,
        "zscore": company_data("zscore.json", ticker),
        "esg": company_data("esg.json", ticker),
        "osint_events": company_events(ticker),
        "data_status": "demo",
        "provenance": provenance("demo", f"workbook:{DATA_VERSION}"),
        "methodology_version": METHODOLOGY_VERSION,
        "message": "Assessment metrics use the current workbook demo dataset; see docs/DEMO_STATUS.md for source and date limits.",
    }


@router.get("/api/v1/companies/{ticker}/zscore")
def company_zscore(ticker: str) -> dict:
    return company_data("zscore.json", ticker)


@router.get("/api/v1/companies/{ticker}/esg")
def company_esg(ticker: str) -> dict:
    return company_data("esg.json", ticker)


@router.get("/api/v1/companies/{ticker}/osint")
def company_osint(ticker: str, months: Annotated[int, Query(ge=1, le=120)] = 36) -> list[dict]:
    cutoff = date.today() - timedelta(days=months * 30)
    today = date.today()
    selected = []
    for event in company_events(ticker):
        note = str(event.get("dateNote") or "")
        exact = re.search(r"(\d{2})/(\d{2})/(\d{4})", note)
        if exact:
            try:
                event_date = date(int(exact.group(3)), int(exact.group(2)), int(exact.group(1)))
                if cutoff <= event_date <= today:
                    selected.append(event)
            except ValueError:
                continue
            continue
        event_year = int(event.get("decisionYear") or 0)
        if event_year and event_year >= cutoff.year and event_year <= today.year:
            selected.append(event)
    return selected
