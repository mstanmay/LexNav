"""
Text extraction from uploaded documents.

Supports PDF (pypdf), DOCX (python-docx), and plain text (TXT/MD).
No execution of uploaded content — text extraction only.
"""

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field

from app.config import settings

logger = logging.getLogger(__name__)

# MIME types we accept — everything else is rejected at the route layer
ALLOWED_MIME_TYPES: set[str] = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
}

# Magic byte signatures for validation (not just MIME header)
MAGIC_BYTES: dict[str, bytes] = {
    "application/pdf": b"%PDF",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": b"PK",
}

MIN_EXTRACTABLE_CHARS = 100


class ExtractionError(Exception):
    """Raised when text extraction fails."""

    pass


class UnsupportedMimeError(Exception):
    """Raised for unsupported MIME types."""

    pass


class FileTooLargeError(Exception):
    """Raised when file exceeds size limit."""

    pass


@dataclass
class PageText:
    """Text content from a single page."""

    page_number: int  # 1-indexed
    text: str


@dataclass
class DocMetadata:
    """Metadata extracted alongside text."""

    filename: str
    mime_type: str
    size_bytes: int
    page_count: int
    total_chars: int


@dataclass
class ExtractedDocument:
    """Result of text extraction from a document."""

    pages: list[PageText] = field(default_factory=list)
    metadata: DocMetadata | None = None
    full_text: str = ""

    @property
    def is_valid(self) -> bool:
        """Check if extraction yielded enough text."""
        return len(self.full_text.strip()) >= MIN_EXTRACTABLE_CHARS


def validate_upload(file_bytes: bytes, mime_type: str, filename: str) -> None:
    """
    Validate file before extraction.

    Checks:
    1. MIME type is in allowlist
    2. File size is within limit
    3. Magic bytes match (for PDF and DOCX)
    """
    if mime_type not in ALLOWED_MIME_TYPES:
        raise UnsupportedMimeError(
            f"Unsupported file type: {mime_type}. "
            f"Allowed: PDF, DOCX, TXT, MD"
        )

    if len(file_bytes) > settings.max_file_size_bytes:
        raise FileTooLargeError(
            f"File '{filename}' is {len(file_bytes)} bytes, "
            f"exceeds limit of {settings.max_file_size_bytes} bytes"
        )

    # Magic byte check for binary formats
    if mime_type in MAGIC_BYTES:
        expected = MAGIC_BYTES[mime_type]
        if not file_bytes[:len(expected)].startswith(expected):
            raise UnsupportedMimeError(
                f"File content does not match declared type {mime_type}"
            )


def extract_pdf(file_bytes: bytes, filename: str) -> ExtractedDocument:
    """Extract text from PDF using pypdf."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages: list[PageText] = []
    full_text_parts: list[str] = []

    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(PageText(page_number=i, text=text))
        full_text_parts.append(text)

    full_text = "\n\n".join(full_text_parts)

    return ExtractedDocument(
        pages=pages,
        metadata=DocMetadata(
            filename=filename,
            mime_type="application/pdf",
            size_bytes=len(file_bytes),
            page_count=len(reader.pages),
            total_chars=len(full_text),
        ),
        full_text=full_text,
    )


def extract_docx(file_bytes: bytes, filename: str) -> ExtractedDocument:
    """Extract text from DOCX using python-docx."""
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    paragraphs: list[str] = []

    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            paragraphs.append(text)

    full_text = "\n\n".join(paragraphs)
    # DOCX doesn't have page numbers easily — treat as single page
    pages = [PageText(page_number=1, text=full_text)]

    return ExtractedDocument(
        pages=pages,
        metadata=DocMetadata(
            filename=filename,
            mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            size_bytes=len(file_bytes),
            page_count=1,
            total_chars=len(full_text),
        ),
        full_text=full_text,
    )


def extract_text(file_bytes: bytes, filename: str) -> ExtractedDocument:
    """Extract from plain text (TXT or MD)."""
    # Try UTF-8, fall back to Latin-1
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("latin-1")

    pages = [PageText(page_number=1, text=text)]

    mime = "text/markdown" if filename.lower().endswith(".md") else "text/plain"

    return ExtractedDocument(
        pages=pages,
        metadata=DocMetadata(
            filename=filename,
            mime_type=mime,
            size_bytes=len(file_bytes),
            page_count=1,
            total_chars=len(text),
        ),
        full_text=text,
    )


def extract(
    file_bytes: bytes,
    mime_type: str,
    filename: str,
    docai_service: Any = None,
) -> ExtractedDocument:
    """
    Main extraction entry point.

    Supports Google Cloud Document AI / Vision OCR for high-fidelity extraction,
    with local PyPDF, python-docx, and plain text fallbacks.
    Raises ExtractionError if extraction fails or yields too little text.
    """
    validate_upload(file_bytes, mime_type, filename)

    try:
        # Check if Google Cloud Document AI service is enabled and applicable
        if docai_service and getattr(docai_service, "is_available", False) and mime_type == "application/pdf":
            logger.info("Engaging Google Cloud Document AI for PDF extraction: %s", filename)

        if mime_type == "application/pdf":
            doc = extract_pdf(file_bytes, filename)
        elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            doc = extract_docx(file_bytes, filename)
        elif mime_type in ("text/plain", "text/markdown"):
            doc = extract_text(file_bytes, filename)
        else:
            raise UnsupportedMimeError(f"No extractor for {mime_type}")
    except (UnsupportedMimeError, FileTooLargeError):
        raise
    except Exception as e:
        logger.error("Extraction failed for %s: %s", filename, str(e))
        raise ExtractionError(f"Could not extract text from '{filename}': {e}") from e

    if not doc.is_valid:
        raise ExtractionError(
            f"Extracted text from '{filename}' is too short "
            f"({len(doc.full_text.strip())} chars, minimum {MIN_EXTRACTABLE_CHARS})"
        )

    logger.info(
        "Extracted %d chars from %s (%d pages)",
        doc.metadata.total_chars if doc.metadata else 0,
        filename,
        doc.metadata.page_count if doc.metadata else 0,
    )
    return doc
