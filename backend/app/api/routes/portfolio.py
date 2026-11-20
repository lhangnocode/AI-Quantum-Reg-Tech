from __future__ import annotations

from fastapi import APIRouter

from app.domain.contracts import PortfolioOptimizeRequest
from app.services.portfolio_optimizer import optimize_portfolio


router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


@router.post("/optimize")
def recommend_portfolio(body: PortfolioOptimizeRequest) -> dict:
    """Return a classical Markowitz + ESG recommendation from the notebook method."""
    return optimize_portfolio(
        data_year=body.data_year,
        tickers=body.tickers,
        gamma=body.gamma,
        delta=body.delta,
        accepted_osint_levels=body.accepted_osint_levels,
    )
