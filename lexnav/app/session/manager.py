"""
Session Manager — in-memory session store with TTL reaper.

All session data lives in a plain dict. A background asyncio task
reaps expired sessions every N seconds. On delete, the ChromaDB
collection is also dropped.

No data survives a process restart — by design.
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any

from app.config import settings
from app.models.session import Session

logger = logging.getLogger(__name__)


class SessionNotFoundError(Exception):
    """Raised when a session ID is not found or has expired."""

    pass


class SessionLimitError(Exception):
    """Raised when per-IP session limit is exceeded."""

    pass


class SessionManager:
    """
    In-memory session store.

    Thread-safety note: FastAPI runs on a single asyncio event loop,
    so dict mutations are safe without locks. If we ever move to
    multi-worker, we'd need shared state (Redis, etc.).
    """

    def __init__(self, chroma_client: Any = None, gcs_service: Any = None) -> None:
        self._sessions: dict[str, Session] = {}
        self._chroma_client = chroma_client
        self._gcs_service = gcs_service
        self._reaper_task: asyncio.Task[None] | None = None

    # ── Lifecycle ──────────────────────────────────────────────────────────

    async def start_reaper(self) -> None:
        """Start the background TTL reaper task."""
        self._reaper_task = asyncio.create_task(self._reaper_loop())
        logger.info("Session reaper started (interval=%ds)", settings.session_reaper_interval_seconds)

    async def stop_reaper(self) -> None:
        """Stop the background TTL reaper task."""
        if self._reaper_task:
            self._reaper_task.cancel()
            try:
                await self._reaper_task
            except asyncio.CancelledError:
                pass
            logger.info("Session reaper stopped")

    async def _reaper_loop(self) -> None:
        """Periodically reap expired sessions."""
        while True:
            await asyncio.sleep(settings.session_reaper_interval_seconds)
            expired = [
                sid for sid, session in self._sessions.items()
                if session.is_expired()
            ]
            for sid in expired:
                await self.delete_session(sid)
                # Log session_id only — no content
                logger.info("Reaped expired session: %s", sid)

    # ── CRUD ───────────────────────────────────────────────────────────────

    def create_session(self, client_ip: str = "") -> Session:
        """
        Create a new session.

        Raises SessionLimitError if the IP has too many active sessions.
        """
        # Check per-IP limit
        ip_sessions = sum(
            1 for s in self._sessions.values()
            if s.client_ip == client_ip and not s.is_expired()
        )
        if ip_sessions >= settings.max_concurrent_sessions_per_ip:
            raise SessionLimitError(
                f"Maximum {settings.max_concurrent_sessions_per_ip} "
                f"concurrent sessions per IP"
            )

        session_id = str(uuid.uuid4())
        session = Session(
            session_id=session_id,
            ttl_seconds=settings.session_ttl_seconds,
            client_ip=client_ip,
        )
        self._sessions[session_id] = session
        logger.info("Created session: %s", session_id)
        return session

    def get_session(self, session_id: str) -> Session:
        """
        Get a session by ID.

        Raises SessionNotFoundError if not found or expired.
        """
        session = self._sessions.get(session_id)
        if session is None or session.is_expired():
            # Clean up expired session if it exists
            if session is not None:
                self._sessions.pop(session_id, None)
            raise SessionNotFoundError(f"Session not found or expired: {session_id}")
        session.touch()
        return session

    async def delete_session(self, session_id: str) -> bool:
        """
        Delete a session and all associated data.

        Returns True if session existed, False otherwise.
        """
        session = self._sessions.pop(session_id, None)
        if session is None:
            return False

        # Drop ChromaDB collection
        if self._chroma_client is not None:
            collection_name = f"session_{session_id}"
            try:
                self._chroma_client.delete_collection(name=collection_name)
                logger.info("Dropped ChromaDB collection: %s", collection_name)
            except Exception:
                # Collection may not exist yet
                pass

        # Purge ephemeral documents from Google Cloud Storage
        if self._gcs_service is not None:
            try:
                await self._gcs_service.purge_session_documents(session_id)
            except Exception as e:
                logger.warning("Failed to purge GCS documents for session %s: %s", session_id, e)

        logger.info("Deleted session: %s", session_id)
        return True

    # ── Stats ──────────────────────────────────────────────────────────────

    @property
    def active_session_count(self) -> int:
        """Number of non-expired sessions."""
        return sum(1 for s in self._sessions.values() if not s.is_expired())

    def get_all_sessions(self) -> dict[str, Session]:
        """Get all sessions (for testing/monitoring)."""
        return dict(self._sessions)
