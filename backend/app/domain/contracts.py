from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class Provenance(BaseModel):
    source_type: Literal["workbook", "user_registry"]
    source_reference: str
    data_version: str
    as_of_date: date | None = None
    status: Literal["demo", "pending_data"]


class UniverseEntry(BaseModel):
    ticker: str
    name: str | None = None
    exchange: str | None = None
    subsector: str | None = None
    availability: Literal["analysis_ready", "pending_data"]
    missing_required_fields: list[str] = Field(default_factory=list)
    source_reference: str
    provenance: Provenance


class CompanyPage(BaseModel):
    items: list[UniverseEntry]
    companies: list[dict]
    next_cursor: str | None
    limit: int
    total: int
    provenance: Provenance


class RegisterCompany(BaseModel):
    ticker: str = Field(min_length=1, max_length=12)
    source_reference: str = Field(min_length=1, max_length=500)
    source_version: str | None = Field(default=None, max_length=100)


class OsintScanRequest(BaseModel):
    tickers: list[str] = Field(min_length=1, max_length=4)
    # Date range is used for current monitoring; year remains for older API callers.
    from_date: date | None = None
    to_date: date | None = None
    year: int | None = Field(default=None, ge=2000, le=2100)


class PortfolioOptimizeRequest(BaseModel):
    data_year: int = Field(ge=2021, le=2024)
    tickers: list[str] = Field(min_length=3, max_length=9)
    gamma: float = Field(ge=0, le=0.3)
    delta: float = Field(ge=0, le=0.3)
    accepted_osint_levels: dict[str, int] = Field(default_factory=dict)


class DocumentLine(BaseModel):
    page: int = Field(ge=1, le=500)
    text: str = Field(min_length=1, max_length=1200)
    source: Literal["text", "ocr"]


class PrivateDocumentExtractRequest(BaseModel):
    lines: list[DocumentLine] = Field(min_length=1, max_length=500)
