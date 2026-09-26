"""
Session model — in-memory session state with TTL tracking.

Sessions hold uploaded documents, context cards, cached artifacts,
and metadata. All data is ephemeral — destroyed on TTL expiry or
explicit DELETE.
"""

from __future__ import annotations

import time
from typing import Any

from pydantic import BaseModel, Field

from app.models.context_card import ContextCard


class DocumentInfo(BaseModel):
    """Metadata about an uploaded document within a session."""

    doc_id: str
    filename: str
    mime_type: str
    size_bytes: int
    pages: int | None = None
    chunks_created: int = 0
    uploaded_at: float = Field(default_factory=time.time)


class Session(BaseModel):
    """In-memory session state. Not persisted anywhere."""

    session_id: str
    created_at: float = Field(default_factory=time.time)
    last_access: float = Field(default_factory=time.time)
    ttl_seconds: int = 3600

    # Documents
    documents: dict[str, DocumentInfo] = Field(default_factory=dict)
    total_bytes: int = 0

    # Context
    context_card: ContextCard = Field(default_factory=ContextCard)

    # Cached agent outputs (keyed by artifact_type)
    cached_artifacts: dict[str, Any] = Field(default_factory=dict)

    # Questions asked during session (for lawyer brief)
    questions_asked: list[str] = Field(default_factory=list)

    # Client IP for rate limiting
    client_ip: str = ""

    def touch(self) -> None:
        """Update last_access timestamp."""
        self.last_access = time.time()

    def is_expired(self) -> bool:
        """Check if session has exceeded TTL."""
        return (time.time() - self.last_access) > self.ttl_seconds

    def invalidate_context_cache(self) -> None:
        """Clear cached context extraction (called on new doc upload)."""
        self.cached_artifacts.pop("context_card_enriched", None)


class SessionInfo(BaseModel):
    """Public-facing session info returned by API."""

    session_id: str
    created_at: str
    ttl_seconds: int
    endpoints: dict[str, str]
