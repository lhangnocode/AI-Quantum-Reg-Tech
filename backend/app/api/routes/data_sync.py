from __future__ import annotations

from fastapi import APIRouter

from app.services.financial_data_sync import get_financial_data_status, refresh_financial_data


router = APIRouter(prefix="/api/v1/data", tags=["data-sync"])


@router.get("/latest")
def latest_financial_data() -> dict:
    return get_financial_data_status()


@router.post("/refresh")
async def refresh_latest_financial_data() -> dict:
    return await refresh_financial_data()
