"""
Pipeline tests — extraction, chunking, embedding.
"""

from __future__ import annotations

import pytest
from pathlib import Path

from app.pipeline.extractor import (
    extract,
    validate_upload,
    ExtractionError,
    UnsupportedMimeError,
    FileTooLargeError,
    ALLOWED_MIME_TYPES,
)
from app.pipeline.chunker import chunk_document, detect_boundaries


FIXTURES = Path(__file__).parent / "fixtures"


class TestExtraction:
    """Tests for text extraction."""

    def test_extract_txt(self, lease_bytes):
        """TXT extraction works."""
        result = extract(lease_bytes, "text/plain", "lease.txt")
        assert result.is_valid
        assert len(result.full_text) > 100
        assert result.metadata is not None
        assert result.metadata.page_count == 1

    def test_extract_markdown(self, policy_bytes):
        """MD extraction works."""
        result = extract(policy_bytes, "text/markdown", "policy.md")
        assert result.is_valid

    def test_reject_unsupported_mime(self):
        """Unsupported MIME types are rejected."""
        with pytest.raises(UnsupportedMimeError):
            validate_upload(b"fake content", "application/zip", "file.zip")

    def test_reject_oversized_file(self):
        """Files over the size limit are rejected."""
        huge = b"x" * (11 * 1024 * 1024)  # 11 MB
        with pytest.raises(FileTooLargeError):
            validate_upload(huge, "text/plain", "huge.txt")

    def test_reject_empty_extraction(self):
        """Files with too little text are rejected."""
        short = b"hi"
        with pytest.raises(ExtractionError):
            extract(short, "text/plain", "short.txt")

    def test_allowed_mime_types(self):
        """All expected MIME types are in the allowlist."""
        assert "application/pdf" in ALLOWED_MIME_TYPES
        assert "text/plain" in ALLOWED_MIME_TYPES
        assert "text/markdown" in ALLOWED_MIME_TYPES
        assert "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in ALLOWED_MIME_TYPES

    def test_encoding_fallback(self):
        """Latin-1 encoded text is handled gracefully."""
        latin1_text = "Résumé of legal términos with spëcial characters and enough text to pass the minimum length check for extraction validation. " * 3
        latin1_bytes = latin1_text.encode("latin-1")
        result = extract(latin1_bytes, "text/plain", "latin1.txt")
        assert result.is_valid


class TestChunking:
    """Tests for clause-aware chunking."""

    def test_basic_chunking(self, lease_text):
        """Lease text is chunked into multiple pieces."""
        from app.pipeline.extractor import ExtractedDocument, PageText

        doc = ExtractedDocument(
            pages=[PageText(page_number=1, text=lease_text)],
            full_text=lease_text,
        )
        chunks = chunk_document(doc, "doc-1")
        assert len(chunks) > 0
        # All chunks have required fields
        for chunk in chunks:
            assert chunk.chunk_id
            assert chunk.doc_id == "doc-1"
            assert chunk.text
            assert chunk.char_start >= 0
            assert chunk.char_end > chunk.char_start

    def test_boundary_detection(self, lease_text):
        """Section boundaries are detected in the lease."""
        boundaries = detect_boundaries(lease_text)
        assert len(boundaries) > 0
        # Should find "Section" patterns
        refs = [b.section_ref for b in boundaries if b.section_ref]
        section_refs = [r for r in refs if "Section" in r or "SECTION" in r]
        assert len(section_refs) > 0

    def test_empty_text_produces_no_chunks(self):
        """Empty text produces no chunks."""
        from app.pipeline.extractor import ExtractedDocument

        doc = ExtractedDocument(pages=[], full_text="")
        chunks = chunk_document(doc, "doc-empty")
        assert len(chunks) == 0

    def test_chunk_overlap(self, lease_text):
        """Later chunks have overlap_prev set."""
        from app.pipeline.extractor import ExtractedDocument, PageText

        doc = ExtractedDocument(
            pages=[PageText(page_number=1, text=lease_text)],
            full_text=lease_text,
        )
        chunks = chunk_document(doc, "doc-1")
        if len(chunks) > 1:
            # At least one chunk should have overlap
            overlapping = [c for c in chunks if c.overlap_prev]
            assert len(overlapping) > 0
