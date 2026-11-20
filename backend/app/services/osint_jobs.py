"""In-memory OSINT scan jobs.

A Firecrawl Agent run takes minutes, longer than a proxied HTTP request should stay open, so a scan is started as a
background task and polled. State lives in this process only: it is lost on restart and is not shared between
workers – run the API with a single worker (the Dockerfile default) until a durable store/queue exists.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from typing import Awaitable, Callable

JOB_TTL_SECONDS = 3600
MAX_JOBS = 50

_jobs: dict[str, dict] = {}
_tasks: dict[str, asyncio.Task] = {}


def _prune() -> None:
    now = time.time()
    for job_id, job in list(_jobs.items()):
        if job["status"] != "running" and now - job["updated_at"] > JOB_TTL_SECONDS:
            _jobs.pop(job_id, None)
    finished = sorted((job for job in _jobs.values() if job["status"] != "running"), key=lambda job: job["updated_at"])
    while len(_jobs) > MAX_JOBS and finished:
        _jobs.pop(finished.pop(0)["scan_id"], None)


def running_count() -> int:
    return sum(1 for job in _jobs.values() if job["status"] == "running")


def start_job(
    tickers: list[str],
    runner: Callable[[list[str]], Awaitable[dict]],
    year: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    _prune()
    job_id = uuid.uuid4().hex
    now = time.time()
    job = {"scan_id": job_id, "status": "running", "tickers": tickers, "year": year, "start_date": start_date, "end_date": end_date, "created_at": now, "updated_at": now}
    _jobs[job_id] = job

    async def run() -> None:
        try:
            job["result"] = await runner(tickers)
            job["status"] = "completed"
        except Exception as exc:  # report the failure to the poller instead of losing it in the task
            job["status"] = "failed"
            job["error"] = f"OSINT scan lỗi ({type(exc).__name__})."
        finally:
            job["updated_at"] = time.time()
            _tasks.pop(job_id, None)

    _tasks[job_id] = asyncio.create_task(run())  # keep a reference so the task is not garbage-collected
    return public_view(job)


def get_job(job_id: str) -> dict | None:
    job = _jobs.get(job_id)
    return public_view(job) if job else None


def public_view(job: dict) -> dict:
    view = {
        "scan_id": job["scan_id"],
        "status": job["status"],
        "tickers": job["tickers"],
        "year": job.get("year"),
        "from_date": job.get("start_date"),
        "to_date": job.get("end_date"),
        "elapsed_ms": round(((job["updated_at"] if job["status"] != "running" else time.time()) - job["created_at"]) * 1000),
    }
    if "result" in job:
        view["result"] = job["result"]
    if "error" in job:
        view["error"] = job["error"]
    return view
