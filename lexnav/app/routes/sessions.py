"""
Session lifecycle routes.

POST /sessions — create a new session
DELETE /sessions/{session_id} — delete session and all data
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.session.manager import SessionLimitError, SessionNotFoundError

router = APIRouter()


class CreateSessionRequest(BaseModel):
    """Optional request body for session creation."""

    language: str = "en"


@router.post("/sessions", status_code=201)
async def create_session(request: Request, body: CreateSessionRequest | None = None) -> dict:
    """Create a new session."""
    session_mgr = request.app.state.session_manager
    client_ip = request.client.host if request.client else "unknown"

    try:
        session = session_mgr.create_session(client_ip=client_ip)
    except SessionLimitError as e:
        raise HTTPException(status_code=429, detail=str(e))

    if body and body.language:
        session.context_card.language = body.language

    base = f"/api/v1/sessions/{session.session_id}"

    return {
        "session_id": session.session_id,
        "created_at": datetime.fromtimestamp(session.created_at, tz=timezone.utc).isoformat(),
        "ttl_seconds": session.ttl_seconds,
        "endpoints": {
            "documents": f"{base}/documents",
            "context": f"{base}/context",
            "analyze": f"{base}/analyze",
        },
    }


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, request: Request) -> dict:
    """Delete a session and purge all associated data."""
    session_mgr = request.app.state.session_manager

    deleted = await session_mgr.delete_session(session_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Session not found or already expired",
        )

    return {"deleted": True, "session_id": session_id}
