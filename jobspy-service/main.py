"""JobTrail sidecar — thin FastAPI wrapper around python-jobspy.

Responsibilities:
- Expose POST /search that runs jobspy.scrape_jobs(...) and returns JSON.
- Cache identical queries for JOBSPY_CACHE_TTL seconds (default 600) to avoid
  hammering LinkedIn, per python-jobspy's rate-limit notes.
- Forward optional proxies from the JOBSPY_PROXIES env var (comma-separated)
  so heavy users can rotate IPs.

Kept intentionally small. The NestJS backend does all CRUD/business logic.
"""

import logging
import math
import os
from typing import List, Optional

from cachetools import TTLCache
from fastapi import FastAPI, HTTPException
from jobspy import scrape_jobs
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jobtrail-jobspy")

CACHE_TTL = int(os.environ.get("JOBSPY_CACHE_TTL", "600"))
PROXIES_RAW = os.environ.get("JOBSPY_PROXIES", "").strip()
PROXIES: Optional[List[str]] = (
    [p.strip() for p in PROXIES_RAW.split(",") if p.strip()] if PROXIES_RAW else None
)

# maxsize chosen to comfortably hold a few dozen recent searches in memory.
_cache: TTLCache = TTLCache(maxsize=128, ttl=CACHE_TTL)


class SearchRequest(BaseModel):
    site_name: List[str] = Field(default_factory=lambda: ["linkedin", "indeed"])
    search_term: str
    location: Optional[str] = None
    results_wanted: int = 25
    # Skip the first N results — used by the frontend's "Load more" pagination so a single
    # logical search can pull pages 0, 25, 50, … without rerunning everything from scratch.
    offset: int = 0
    hours_old: Optional[int] = None
    is_remote: Optional[bool] = None
    job_type: Optional[str] = None  # "fulltime" | "parttime" | "contract" | "internship"


class JobResult(BaseModel):
    site: str
    id: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    job_url: Optional[str] = None
    description: Optional[str] = None
    is_remote: Optional[bool] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    currency: Optional[str] = None
    date_posted: Optional[str] = None
    job_type: Optional[str] = None


class SearchResponse(BaseModel):
    cached: bool
    count: int
    results: List[JobResult]


app = FastAPI(title="JobTrail JobSpy Sidecar", version="0.1.0")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "cache_ttl": CACHE_TTL,
        "proxy_count": len(PROXIES) if PROXIES else 0,
    }


def _cache_key(req: SearchRequest) -> str:
    return "|".join(
        [
            ",".join(sorted(req.site_name)),
            req.search_term.lower().strip(),
            (req.location or "").lower().strip(),
            str(req.results_wanted),
            str(req.offset),
            str(req.hours_old),
            str(req.is_remote),
            str(req.job_type),
        ]
    )


def _clean(value):
    """Drop NaN / NaT / non-JSON-serializable values."""
    if value is None:
        return None
    try:
        if isinstance(value, float) and math.isnan(value):
            return None
    except TypeError:
        pass
    # pandas Timestamps -> ISO string
    iso = getattr(value, "isoformat", None)
    if callable(iso):
        try:
            return iso()
        except Exception:
            return str(value)
    return value


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest):
    key = _cache_key(req)
    if key in _cache:
        logger.info("cache hit: %s", key)
        return SearchResponse(cached=True, **_cache[key])

    sites = [
        "zip_recruiter" if site == "ziprecruiter" else site
        for site in req.site_name
    ]

    try:
        kwargs = {
            "site_name": sites,
            "search_term": req.search_term,
            "results_wanted": req.results_wanted,
            "offset": req.offset,
            "proxies": PROXIES,
        }
        if req.location is not None:
            kwargs["location"] = req.location
        if req.hours_old is not None:
            kwargs["hours_old"] = req.hours_old
        if req.is_remote is not None:
            kwargs["is_remote"] = req.is_remote
        if req.job_type is not None:
            kwargs["job_type"] = req.job_type

        df = scrape_jobs(**kwargs)
    except Exception as exc:  # noqa: BLE001
        logger.exception("scrape_jobs failed")
        raise HTTPException(status_code=502, detail=f"jobspy error: {exc}") from exc

    results: List[JobResult] = []
    if df is not None and len(df) > 0:
        for _, row in df.iterrows():
            site = _clean(row.get("site")) or "unknown"
            external_id = _clean(row.get("id")) or _clean(row.get("job_url")) or ""
            results.append(
                JobResult(
                    site=str(site),
                    id=str(external_id),
                    title=_clean(row.get("title")),
                    company=_clean(row.get("company")),
                    location=_clean(row.get("location")),
                    job_url=_clean(row.get("job_url")),
                    description=_clean(row.get("description")),
                    is_remote=_clean(row.get("is_remote")),
                    min_amount=_clean(row.get("min_amount")),
                    max_amount=_clean(row.get("max_amount")),
                    currency=_clean(row.get("currency")),
                    date_posted=_clean(row.get("date_posted")),
                    job_type=_clean(row.get("job_type")),
                )
            )

    payload = {"count": len(results), "results": [r.model_dump() for r in results]}
    _cache[key] = payload
    return SearchResponse(cached=False, **payload)
