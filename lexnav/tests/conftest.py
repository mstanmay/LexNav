"""
Pytest fixtures for LexNav test suite.

Provides:
- Fake LLM client
- In-memory ChromaDB
- Test app with all components wired
- HTTPX AsyncClient for API tests
- Session factory
- Fixture file loader
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
import pytest_asyncio
import chromadb
from httpx import ASGITransport, AsyncClient

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.main import create_app
from app.session.manager import SessionManager
from app.pipeline.embedder import Embedder
from app.retrieval.retriever import Retriever
from app.orchestrator.runner import OrchestratorRunner
from app.services.google_services import (
    GoogleDocumentAIService,
    GoogleTranslationService,
    GoogleCloudStorageService,
)
from tests.fake_llm import FakeLLMClient, FakeGeminiClient


FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fake_llm():
    """Create a fresh FakeGeminiClient."""
    return FakeGeminiClient()


@pytest.fixture
def fake_gemini(fake_llm):
    """Google Gemini fake client fixture alias."""
    return fake_llm


@pytest.fixture
def chroma_client():
    """Create an in-memory ChromaDB client."""
    return chromadb.Client()


@pytest.fixture
def gcs_service():
    """Create an ephemeral GCS mock service."""
    return GoogleCloudStorageService(bucket_name="test-ephemeral-bucket")


@pytest.fixture
def docai_service():
    """Create a Document AI mock service."""
    return GoogleDocumentAIService(project_id=None)


@pytest.fixture
def translation_service():
    """Create a Google Translation mock service."""
    return GoogleTranslationService(project_id=None)


@pytest.fixture
def session_manager(chroma_client, gcs_service):
    """Create a SessionManager with in-memory ChromaDB and ephemeral GCS."""
    return SessionManager(chroma_client=chroma_client, gcs_service=gcs_service)


@pytest.fixture
def embedder(fake_llm, chroma_client):
    """Create an Embedder with fake LLM."""
    return Embedder(llm_client=fake_llm, chroma_client=chroma_client)


@pytest.fixture
def retriever(fake_llm, chroma_client):
    """Create a Retriever with fake LLM."""
    return Retriever(llm_client=fake_llm, chroma_client=chroma_client)


@pytest.fixture
def runner(fake_llm, retriever, translation_service):
    """Create an OrchestratorRunner with fake LLM and translation service."""
    return OrchestratorRunner(
        llm_client=fake_llm,
        retriever=retriever,
        translation_service=translation_service,
    )


@pytest_asyncio.fixture
async def app(
    fake_llm,
    chroma_client,
    session_manager,
    embedder,
    retriever,
    runner,
    docai_service,
    translation_service,
    gcs_service,
):
    """Create a test app with fake Google services and Gemini dependencies."""
    test_app = create_app()

    # Override app state with test dependencies
    test_app.state.llm_client = fake_llm
    test_app.state.chroma_client = chroma_client
    test_app.state.session_manager = session_manager
    test_app.state.embedder = embedder
    test_app.state.retriever = retriever
    test_app.state.orchestrator_runner = runner
    test_app.state.docai_service = docai_service
    test_app.state.translation_service = translation_service
    test_app.state.gcs_service = gcs_service

    return test_app


@pytest_asyncio.fixture
async def client(app):
    """Create an HTTPX AsyncClient for API tests."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
def lease_text():
    """Load the sample lease fixture text."""
    return (FIXTURES_DIR / "sample_lease.txt").read_text(encoding="utf-8")


@pytest.fixture
def policy_text():
    """Load the sample policy fixture text."""
    return (FIXTURES_DIR / "sample_policy.txt").read_text(encoding="utf-8")


@pytest.fixture
def injection_text():
    """Load the malicious injection fixture text."""
    return (FIXTURES_DIR / "malicious_injection.txt").read_text(encoding="utf-8")


@pytest.fixture
def lease_bytes():
    """Load the sample lease fixture as bytes."""
    return (FIXTURES_DIR / "sample_lease.txt").read_bytes()


@pytest.fixture
def policy_bytes():
    """Load the sample policy fixture as bytes."""
    return (FIXTURES_DIR / "sample_policy.txt").read_bytes()
