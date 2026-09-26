"""
Context card route.

POST /sessions/{session_id}/context — set or update the session context card.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.context_card import ContextCard
from app.session.manager import SessionNotFoundError

router = APIRouter()


@router.post("/sessions/{session_id}/context")
async def set_context(
    session_id: str,
    context: ContextCard,
    request: Request,
) -> dict:
    """Set or update the session's context card."""
    session_mgr = request.app.state.session_manager

    try:
        session = session_mgr.get_session(session_id)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    session.context_card = context
    session.touch()

    return context.model_dump()
