"""
End-to-end API integration tests for LexNav:
- Health check
- Session lifecycle (create, update context, delete)
- Document upload and chunking
- Analyze endpoint with SSE streaming
- Error handling (not found, invalid intent)
"""

from __future__ import annotations

import io
import json
import pytest


@pytest.mark.asyncio
class TestAPIEndpoints:
    """Integration test suite for LexNav REST & SSE endpoints."""

    async def test_health_check(self, client):
        """GET /api/v1/health returns status ok and server info."""
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "active_sessions" in data
        assert "uptime_seconds" in data
        assert data["version"] == "1.0.0"

    async def test_session_lifecycle(self, client):
        """POST /api/v1/sessions creates a session; DELETE removes it."""
        # Create session
        create_res = await client.post("/api/v1/sessions", json={"language": "en"})
        assert create_res.status_code == 201
        session_data = create_res.json()
        session_id = session_data["session_id"]
        assert session_id is not None
        assert "endpoints" in session_data

        # Delete session
        delete_res = await client.delete(f"/api/v1/sessions/{session_id}")
        assert delete_res.status_code == 200
        assert delete_res.json()["deleted"] is True

        # Deleting again returns 404
        delete_again = await client.delete(f"/api/v1/sessions/{session_id}")
        assert delete_again.status_code == 404

    async def test_set_context(self, client):
        """POST /api/v1/sessions/{session_id}/context updates the context card."""
        create_res = await client.post("/api/v1/sessions")
        session_id = create_res.json()["session_id"]

        context_payload = {
            "user_role": "tenant",
            "jurisdiction": "US-CA",
            "issue_type": "lease-dispute",
            "urgency": "medium",
            "language": "en",
        }

        res = await client.post(
            f"/api/v1/sessions/{session_id}/context",
            json=context_payload,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["user_role"] == "tenant"
        assert data["jurisdiction"] == "US-CA"
        assert data["issue_type"] == "lease-dispute"

    async def test_upload_document(self, client, lease_bytes):
        """POST /api/v1/sessions/{session_id}/documents uploads and processes document."""
        create_res = await client.post("/api/v1/sessions")
        session_id = create_res.json()["session_id"]

        files = {
            "file": ("sample_lease.txt", io.BytesIO(lease_bytes), "text/plain")
        }

        res = await client.post(
            f"/api/v1/sessions/{session_id}/documents",
            files=files,
        )
        assert res.status_code == 201
        data = res.json()
        assert "doc_id" in data
        assert data["filename"] == "sample_lease.txt"
        assert data["chunks_created"] > 0
        assert data["pages"] is not None

    async def test_analyze_invalid_intent(self, client):
        """POST /api/v1/sessions/{session_id}/analyze rejects invalid intent."""
        create_res = await client.post("/api/v1/sessions")
        session_id = create_res.json()["session_id"]

        res = await client.post(
            f"/api/v1/sessions/{session_id}/analyze",
            json={"intent": "hack_the_system"},
        )
        assert res.status_code == 400
        assert "Invalid intent" in res.json()["detail"]

    async def test_analyze_streaming(self, client, lease_bytes):
        """POST /api/v1/sessions/{session_id}/analyze runs SSE analysis stream."""
        # 1. Create session
        create_res = await client.post("/api/v1/sessions")
        session_id = create_res.json()["session_id"]

        # 2. Upload document
        files = {
            "file": ("lease.txt", io.BytesIO(lease_bytes), "text/plain")
        }
        upload_res = await client.post(
            f"/api/v1/sessions/{session_id}/documents",
            files=files,
        )
        assert upload_res.status_code == 201

        # 3. Request analysis
        analyze_payload = {
            "intent": "simplify",
        }
        res = await client.post(
            f"/api/v1/sessions/{session_id}/analyze",
            json=analyze_payload,
        )
        assert res.status_code == 200
        assert "text/event-stream" in res.headers["content-type"]

        body = res.text
        assert "event: status" in body
        assert "event: artifact" in body
        assert "event: done" in body
        assert "LexNav provides legal information only" in body
