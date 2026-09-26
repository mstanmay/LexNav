"""
LexNav FastAPI application.

Assembles all components: routes, middleware, session manager,
LLM client, vector store, and orchestrator.

Lifespan handler manages startup/shutdown of background tasks.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import chromadb
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.llm.client import LLMClient
from app.middleware.pii_scrub import setup_pii_scrub_logging
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.orchestrator.runner import OrchestratorRunner
from app.pipeline.embedder import Embedder
from app.retrieval.retriever import Retriever
from app.routes import analyze, context, documents, health, sessions
from app.session.manager import SessionManager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle — startup and shutdown."""
    # ── Startup ────────────────────────────────────────────────────────
    setup_pii_scrub_logging()

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    )

    logger.info("Starting LexNav v1.0.0")

    # Initialize ChromaDB (in-memory, ephemeral)
    chroma_client = chromadb.Client()
    app.state.chroma_client = chroma_client

    # Initialize LLM client
    llm_client = LLMClient()
    app.state.llm_client = llm_client

    # Initialize Google Cloud Services (Document AI, Translation, Ephemeral GCS)
    from app.services.google_services import (
        GoogleDocumentAIService,
        GoogleTranslationService,
        GoogleCloudStorageService,
    )
    docai_service = GoogleDocumentAIService()
    translation_service = GoogleTranslationService()
    gcs_service = GoogleCloudStorageService()
    app.state.docai_service = docai_service
    app.state.translation_service = translation_service
    app.state.gcs_service = gcs_service

    # Initialize session manager with GCS ephemeral purge support
    session_mgr = SessionManager(chroma_client=chroma_client, gcs_service=gcs_service)
    app.state.session_manager = session_mgr
    await session_mgr.start_reaper()

    # Initialize pipeline components
    embedder = Embedder(llm_client=llm_client, chroma_client=chroma_client)
    app.state.embedder = embedder

    # Initialize retriever
    retriever = Retriever(llm_client=llm_client, chroma_client=chroma_client)
    app.state.retriever = retriever

    # Initialize orchestrator with Gemini and Translation service
    runner = OrchestratorRunner(
        llm_client=llm_client,
        retriever=retriever,
        translation_service=translation_service,
    )
    app.state.orchestrator_runner = runner

    logger.info("LexNav ready on %s:%d (Gemini + Google Services active)", settings.host, settings.port)

    yield

    # ── Shutdown ───────────────────────────────────────────────────────
    await session_mgr.stop_reaper()
    logger.info("LexNav shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="LexNav API",
        description=(
            "AI-powered legal document analysis. "
            "Provides legal information only — never legal advice."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # ── Middleware (order matters: last added = first executed) ─────────
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routes ─────────────────────────────────────────────────────────
    prefix = "/api/v1"
    app.include_router(health.router, prefix=prefix, tags=["Health"])
    app.include_router(sessions.router, prefix=prefix, tags=["Sessions"])
    app.include_router(documents.router, prefix=prefix, tags=["Documents"])
    app.include_router(context.router, prefix=prefix, tags=["Context"])
    app.include_router(analyze.router, prefix=prefix, tags=["Analyze"])

    return app


# Application instance (used by uvicorn)
app = create_app()
