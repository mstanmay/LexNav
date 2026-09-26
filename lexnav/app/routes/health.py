"""
Health check endpoint.

Returns server status, LLM reachability, active sessions, and uptime.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, Request

router = APIRouter()

_start_time = time.time()


@router.get("/health")
async def health_check(request: Request) -> dict:
    """
    Health check endpoint.

    Returns:
    - status: "ok"
    - version: API version
    - active_sessions: count of non-expired sessions
    - uptime_seconds: server uptime
    """
    session_mgr = request.app.state.session_manager

    return {
        "status": "ok",
        "version": "1.0.0",
        "active_sessions": session_mgr.active_session_count,
        "uptime_seconds": int(time.time() - _start_time),
    }
