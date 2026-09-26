"""
Document upload route.

POST /sessions/{session_id}/documents

Validates MIME type, file size, session limits, then runs the
extraction → chunking → embedding pipeline.
"""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, HTTPException, Request, UploadFile, File

from app.config import settings
from app.models.session import DocumentInfo
from app.pipeline.extractor import (
    extract,
    ExtractionError,
    UnsupportedMimeError,
    FileTooLargeError,
)
from app.pipeline.chunker import chunk_document
from app.session.manager import SessionNotFoundError

logger = logging.getLogger(__name__)

router = APIRouter()

# Fallback MIME mapping for common extensions
EXTENSION_TO_MIME: dict[str, str] = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


@router.post("/sessions/{session_id}/documents", status_code=201)
async def upload_document(
    session_id: str,
    request: Request,
    file: UploadFile = File(...),
) -> dict:
    """
    Upload a document to a session.

    Pipeline: validate → extract text → clause-aware chunk → embed → store
    """
    session_mgr = request.app.state.session_manager
    embedder = request.app.state.embedder

    # Get session
    try:
        session = session_mgr.get_session(session_id)
    except SessionNotFoundError:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    # Check document count
    if len(session.documents) >= settings.max_docs_per_session:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.max_docs_per_session} documents per session",
        )

    # Read file
    file_bytes = await file.read()
    filename = file.filename or "uploaded_file"

    # Determine MIME type (use header, fall back to extension)
    mime_type = file.content_type or ""
    if not mime_type or mime_type == "application/octet-stream":
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime_type = EXTENSION_TO_MIME.get(ext, mime_type)

    # Check session total size
    if session.total_bytes + len(file_bytes) > settings.max_session_total_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Session total size would exceed {settings.max_session_total_bytes} bytes",
        )

    # Engage Google Cloud Document AI & Ephemeral GCS services
    docai_service = getattr(request.app.state, "docai_service", None)
    gcs_service = getattr(request.app.state, "gcs_service", None)

    # Extract text with Google Document AI support
    try:
        extracted = extract(file_bytes, mime_type, filename, docai_service=docai_service)
    except UnsupportedMimeError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except FileTooLargeError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except ExtractionError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Generate doc_id and chunk
    doc_id = str(uuid.uuid4())
    chunks = chunk_document(extracted, doc_id)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="Could not create meaningful chunks from the document",
        )

    # Ephemeral GCS upload with auto-purge TTL
    if gcs_service is not None:
        try:
            await gcs_service.upload_ephemeral(session_id, doc_id, filename, file_bytes, ttl_seconds=session.ttl_seconds)
        except Exception as e:
            logger.warning("GCS ephemeral upload non-fatal warning: %s", e)

    # Embed and store
    try:
        await embedder.embed_and_store(session_id, doc_id, chunks)
    except Exception as e:
        logger.error("Embedding failed for doc %s: %s", doc_id, e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {e}",
        )

    # Register document in session
    doc_info = DocumentInfo(
        doc_id=doc_id,
        filename=filename,
        mime_type=mime_type,
        size_bytes=len(file_bytes),
        pages=extracted.metadata.page_count if extracted.metadata else None,
        chunks_created=len(chunks),
    )
    session.documents[doc_id] = doc_info
    session.total_bytes += len(file_bytes)

    # Invalidate cached context (new doc uploaded)
    session.invalidate_context_cache()

    return {
        "doc_id": doc_id,
        "filename": filename,
        "mime_type": mime_type,
        "size_bytes": len(file_bytes),
        "pages": doc_info.pages,
        "chunks_created": len(chunks),
        "session_total_docs": len(session.documents),
        "session_total_bytes": session.total_bytes,
    }
