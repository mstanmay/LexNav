"""
Rate limiting middleware.

Per-session and per-IP sliding window rate limits.
Uses in-memory tracking (resets on server restart — acceptable for v1).
"""

from __future__ import annotations

import time
import logging
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter for per-IP request throttling."""

    def __init__(self, app, **kwargs) -> None:  # type: ignore[no-untyped-def]
        super().__init__(app, **kwargs)
        # IP -> list of request timestamps
        self._request_log: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        window = 60.0  # 1 minute sliding window

        # Clean old entries
        self._request_log[client_ip] = [
            ts for ts in self._request_log[client_ip]
            if now - ts < window
        ]

        # Check rate limit
        current_count = len(self._request_log[client_ip])

        # Use stricter limit for analyze endpoints
        path = request.url.path
        if "/analyze" in path:
            limit = settings.analyze_rate_limit_per_minute
        else:
            limit = settings.rate_limit_per_minute

        if current_count >= limit:
            logger.warning("Rate limit exceeded for IP %s on %s", client_ip, path)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limit_exceeded",
                    "detail": f"Rate limit exceeded. Maximum {limit} requests per minute.",
                    "retry_after_seconds": 60,
                },
            )

        self._request_log[client_ip].append(now)
        response = await call_next(request)
        return response
