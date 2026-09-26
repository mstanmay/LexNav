"""
Tests for Google Cloud Services integrations:
- Google Document AI / Vision
- Google Cloud Translation
- Google Cloud Storage (ephemeral document management with TTL)
- Native Gemini client initialization and budgeting
"""

from __future__ import annotations

import pytest

from app.services.google_services import (
    GoogleDocumentAIService,
    GoogleTranslationService,
    GoogleCloudStorageService,
)
from app.llm.client import GeminiClient, LLMClient, BudgetExhaustedError


@pytest.mark.asyncio
class TestGoogleServices:
    """Validation suite for Google Cloud Services and Gemini components."""

    async def test_documentai_service_fallback(self):
        """Document AI operates in local fallback mode when project is not set."""
        service = GoogleDocumentAIService(project_id=None)
        assert service.is_available is False
        res = await service.process_document(b"sample pdf bytes", "application/pdf")
        assert res is None

    async def test_translation_service_english(self):
        """English text is returned directly without translation overhead."""
        service = GoogleTranslationService(project_id="test-proj")
        text = "This contract is valid for 12 months."
        translated = await service.translate_text(text, target_language="en")
        assert translated == text

    async def test_translation_service_fallback_formatting(self):
        """When translation service runs in offline mode, it marks text with target language."""
        service = GoogleTranslationService(project_id=None)
        text = "Rent is due on the first of each month."
        translated = await service.translate_text(text, target_language="hi")
        assert "[HI]" in translated
        assert "Rent is due" in translated

    async def test_gcs_ephemeral_storage_lifecycle(self):
        """GCS ephemeral service stores temporary bytes and purges on session delete."""
        gcs = GoogleCloudStorageService(bucket_name="test-legal-ephemeral-bucket")
        session_id = "sess_gcs_test_123"
        doc_id = "doc_001"
        file_bytes = b"Sample legal contract bytes"

        # 1. Ephemeral upload
        uri = await gcs.upload_ephemeral(session_id, doc_id, "agreement.pdf", file_bytes, ttl_seconds=1800)
        assert uri.startswith("gs://test-legal-ephemeral-bucket/")
        assert session_id in uri
        assert doc_id in uri

        # 2. Ephemeral purge
        purged = await gcs.purge_session_documents(session_id)
        assert purged == 1

        # 3. Purging again returns 0 (idempotent)
        purged_again = await gcs.purge_session_documents(session_id)
        assert purged_again == 0

    async def test_gemini_client_alias_and_budgeting(self):
        """GeminiClient acts as primary LLMClient with budget tracking."""
        client = GeminiClient(api_key=None, model="gemini-2.5-flash")
        assert LLMClient is GeminiClient
        assert client.calls_used == 0

        client.reset_budget()
        assert client.calls_used == 0
