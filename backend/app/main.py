"""FastAPI composition root. Domain routes and services live in dedicated modules."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

# Import config first so backend/.env (or the legacy root .env.local) is loaded before service modules.
from app.core.config import CORS_ORIGINS  # noqa: E402
from app.api.routes import analysis, companies, data_sync, financial_engine, osint, portfolio, private  # noqa: E402


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    from app.services.neo4j import close_neo4j_service

    close_neo4j_service()


app = FastAPI(
    title="QuantumRegTech Assessment API",
    version="0.1.0",
    description="Demo API. Workbook-backed metrics are labeled as demo data; pending symbols have no invented metrics.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    # The backend has no UI; send browsers to the interactive API docs.
    return RedirectResponse("/docs")


@app.get("/health", tags=["system"])
def health() -> dict:
    return {"status": "ok", "service": "quantumregtech-api", "api_version": app.version}


app.include_router(companies.router)
app.include_router(data_sync.router)
app.include_router(financial_engine.router)
app.include_router(analysis.router)
app.include_router(osint.router)
app.include_router(portfolio.router)
app.include_router(private.router)
