"""
Response envelope — wraps all agent output for the API.

Every response includes a mandatory disclaimer.
The orchestrator injects the disclaimer — agents cannot suppress it.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.chunks import Citation
from app.models.context_card import ContextCard


class ArtifactWrapper(BaseModel):
    """Wrapper around a single agent's output artifact."""

    artifact_type: str = Field(description="Type discriminator: summary, clauses, comparison, etc.")
    artifact: dict[str, Any] = Field(description="The typed agent output as dict")
    confidence: Literal["high", "medium", "low", "insufficient"] = Field(
        default="high",
        description="Agent's confidence in this artifact",
    )


class ResponseEnvelope(BaseModel):
    """
    Standard response wrapper for all /analyze responses.

    The disclaimer field is ALWAYS present and non-empty.
    It is injected by the orchestrator, not by individual agents.
    """

    session_id: str
    request_id: str
    intent: str
    context_card: ContextCard
    artifacts: list[ArtifactWrapper] = Field(default_factory=list)
    citations: list[Citation] = Field(
        default_factory=list,
        description="Deduplicated citations across all agents",
    )
    llm_calls_used: int = 0
    disclaimer: str = Field(
        description="Mandatory legal disclaimer — ALWAYS present",
    )
    timestamp: str = Field(description="ISO8601 timestamp")
