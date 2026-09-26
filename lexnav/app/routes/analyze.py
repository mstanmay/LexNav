"""
Analyze route.

POST /sessions/{session_id}/analyze — run analysis with SSE streaming.

Supports intents: simplify, risks, compare, qa, checklist, brief, auto.
Returns Server-Sent Events with typed event stream.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.guardrails.input_sanitizer import sanitize_query, InputSanitizationError
from app.orchestrator.router import VALID_INTENTS, select_agent_names
from app.session.manager import SessionNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzeRequest(BaseModel):
    """Request body for /analyze endpoint."""

    intent: str = Field(
        description="Analysis intent: simplify|risks|compare|qa|checklist|brief|auto",
    )
    query: str | None = Field(
        default=None,
        description="User question (required for 'qa' intent)",
    )
    doc_ids: list[str] | None = Field(
        default=None,
        description="Override context_card.doc_ids for this analysis",
    )


@router.post("/sessions/{session_id}/analyze")
async def analyze(
    session_id: str,
    body: AnalyzeRequest,
    request: Request,
) -> EventSourceResponse:
    """
    Run analysis on session documents.

    Returns an SSE stream with events: status, artifact, done, error.
    """
    session_mgr = request.app.state.session_manager
    runner = request.app.state.orchestrator_runner

    # Validate intent
    if body.intent not in VALID_INTENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid intent: {body.intent}. Valid: {', '.join(sorted(VALID_INTENTS))}",
        )

    # Get session
    try:
        session = session_mgr.get_session(session_id)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    # Check documents exist
    if not session.documents:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded to this session. Upload at least one document first.",
        )

    # Validate QA intent requires a query
    user_query = body.query
    if body.intent == "qa":
        if not user_query:
            raise HTTPException(
                status_code=400,
                detail="Query is required for 'qa' intent",
            )
        try:
            user_query = sanitize_query(user_query)
        except InputSanitizationError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Validate compare intent requires 2+ documents
    if body.intent == "compare":
        doc_count = len(body.doc_ids or session.context_card.doc_ids or session.documents)
        if doc_count < 2:
            raise HTTPException(
                status_code=400,
                detail="Compare intent requires at least 2 documents",
            )

    # Override doc_ids if provided
    if body.doc_ids:
        session.context_card.doc_ids = body.doc_ids

    # Select agent chain
    request_id = getattr(request.state, "request_id", None)
    resolved_intent, agent_names = select_agent_names(
        intent=body.intent,
        session=session,
        user_query=user_query,
    )

    logger.info(
        "Analyze: session=%s intent=%s resolved=%s agents=%s",
        session_id, body.intent, resolved_intent, agent_names,
    )

    # Create SSE generator
    async def event_generator():
        async for event in runner.run_chain_sse(
            agent_names=agent_names,
            session=session,
            intent=resolved_intent,
            user_query=user_query,
            request_id=request_id,
        ):
            yield event

    return EventSourceResponse(event_generator())
