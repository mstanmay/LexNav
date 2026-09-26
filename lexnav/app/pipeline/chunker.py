"""
Clause-aware chunking for legal documents.

Strategy:
1. Detect clause/section boundaries via regex patterns
2. Primary split on detected boundaries
3. Secondary split on paragraph breaks if a clause is too long
4. Add 2-sentence overlap between consecutive chunks
5. Merge chunks that are too short with neighbors

Target chunk size: 300-800 tokens (~1200-3200 chars at ~4 chars/token).
"""

from __future__ import annotations

import re
import uuid
import logging
from dataclasses import dataclass

from app.models.chunks import Chunk
from app.pipeline.extractor import ExtractedDocument, PageText

logger = logging.getLogger(__name__)

# ── Configuration ──────────────────────────────────────────────────────────

MIN_CHUNK_CHARS = 300 * 4   # ~300 tokens
MAX_CHUNK_CHARS = 800 * 4   # ~800 tokens
OVERLAP_SENTENCES = 2

# ── Clause boundary patterns ──────────────────────────────────────────────

CLAUSE_PATTERNS: list[re.Pattern[str]] = [
    # Numbered sections: "1.", "1.1", "1.1.1", "Section 1", "Article 1"
    re.compile(r"^(?:Section|SECTION|Article|ARTICLE|Clause|CLAUSE)\s+\d+", re.MULTILINE),
    re.compile(r"^\d+\.\d*(?:\.\d+)*\s+[A-Z]", re.MULTILINE),
    # Legal headers
    re.compile(r"^(?:WHEREAS|NOW,?\s+THEREFORE|RECITALS|DEFINITIONS|TERMS AND CONDITIONS)", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^(?:ARTICLE|SCHEDULE|EXHIBIT|APPENDIX|ANNEX)\s+[A-Z0-9]", re.MULTILINE | re.IGNORECASE),
    # Uppercase headings (common in contracts)
    re.compile(r"^[A-Z][A-Z\s]{5,}$", re.MULTILINE),
]

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z])")


@dataclass
class ChunkBoundary:
    """A detected boundary in the document text."""

    char_pos: int
    section_ref: str | None


def detect_boundaries(text: str) -> list[ChunkBoundary]:
    """
    Find clause/section boundaries in the document text.

    Returns sorted list of character positions where new sections start.
    """
    boundaries: list[ChunkBoundary] = []
    seen_positions: set[int] = set()

    for pattern in CLAUSE_PATTERNS:
        for match in pattern.finditer(text):
            pos = match.start()
            if pos not in seen_positions:
                seen_positions.add(pos)
                # Extract a clean section reference
                ref = match.group().strip()[:50]
                boundaries.append(ChunkBoundary(char_pos=pos, section_ref=ref))

    boundaries.sort(key=lambda b: b.char_pos)
    return boundaries


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences."""
    sentences = SENTENCE_SPLIT.split(text)
    return [s.strip() for s in sentences if s.strip()]


def get_last_n_sentences(text: str, n: int) -> str:
    """Get the last N sentences from a text block."""
    sentences = split_into_sentences(text)
    if len(sentences) <= n:
        return ""  # Don't overlap the entire chunk
    return " ".join(sentences[-n:])


def map_char_to_page(char_pos: int, pages: list[PageText]) -> int | None:
    """Map a character position in full_text back to a page number."""
    running = 0
    for page in pages:
        page_end = running + len(page.text) + 2  # +2 for \n\n join
        if char_pos < page_end:
            return page.page_number
        running = page_end
    return pages[-1].page_number if pages else None


def chunk_document(doc: ExtractedDocument, doc_id: str) -> list[Chunk]:
    """
    Split an extracted document into clause-aware chunks.

    Algorithm:
    1. Detect clause/section boundaries
    2. Split text at boundaries
    3. If any segment > MAX_CHUNK_CHARS, sub-split on paragraph breaks
    4. If any segment < MIN_CHUNK_CHARS, merge with neighbor
    5. Add 2-sentence overlap between consecutive chunks
    """
    text = doc.full_text
    if not text.strip():
        return []

    # Step 1: Detect boundaries
    boundaries = detect_boundaries(text)

    # Step 2: Create initial segments from boundaries
    segments: list[tuple[int, int, str | None]] = []  # (start, end, section_ref)

    if not boundaries:
        # No structure detected — split on paragraphs
        segments.append((0, len(text), None))
    else:
        # Before first boundary
        if boundaries[0].char_pos > 0:
            segments.append((0, boundaries[0].char_pos, None))

        # Between boundaries
        for i, boundary in enumerate(boundaries):
            end = boundaries[i + 1].char_pos if i + 1 < len(boundaries) else len(text)
            segments.append((boundary.char_pos, end, boundary.section_ref))

    # Step 3: Sub-split oversized segments on paragraph breaks
    refined_segments: list[tuple[int, int, str | None]] = []
    for start, end, ref in segments:
        segment_text = text[start:end]
        if len(segment_text) <= MAX_CHUNK_CHARS:
            refined_segments.append((start, end, ref))
        else:
            # Split on double newlines (paragraph breaks)
            para_splits = list(re.finditer(r"\n\n+", segment_text))
            if not para_splits:
                # No paragraph breaks — hard split
                pos = start
                while pos < end:
                    chunk_end = min(pos + MAX_CHUNK_CHARS, end)
                    refined_segments.append((pos, chunk_end, ref if pos == start else None))
                    pos = chunk_end
            else:
                sub_start = start
                current_ref = ref
                for split_match in para_splits:
                    split_pos = start + split_match.end()
                    if split_pos - sub_start >= MAX_CHUNK_CHARS:
                        refined_segments.append((sub_start, start + split_match.start(), current_ref))
                        sub_start = split_pos
                        current_ref = None
                # Remaining
                if sub_start < end:
                    refined_segments.append((sub_start, end, current_ref))

    # Step 4: Merge undersized segments with neighbors
    merged: list[tuple[int, int, str | None]] = []
    for seg in refined_segments:
        seg_text = text[seg[0]:seg[1]].strip()
        if not seg_text:
            continue
        if merged and len(seg_text) < MIN_CHUNK_CHARS:
            # Merge with previous
            prev = merged[-1]
            merged[-1] = (prev[0], seg[1], prev[2])
        else:
            merged.append(seg)

    # Step 5: Create Chunk objects with overlap
    chunks: list[Chunk] = []
    for i, (start, end, section_ref) in enumerate(merged):
        chunk_text = text[start:end].strip()
        if not chunk_text:
            continue

        # Add overlap from previous chunk
        overlap = False
        if i > 0:
            prev_text = text[merged[i - 1][0]:merged[i - 1][1]]
            overlap_text = get_last_n_sentences(prev_text, OVERLAP_SENTENCES)
            if overlap_text:
                chunk_text = overlap_text + "\n\n" + chunk_text
                overlap = True

        page_num = map_char_to_page(start, doc.pages)

        chunks.append(Chunk(
            chunk_id=str(uuid.uuid4()),
            doc_id=doc_id,
            page_number=page_num,
            section_ref=section_ref,
            text=chunk_text,
            char_start=start,
            char_end=end,
            overlap_prev=overlap,
        ))

    logger.info("Chunked document %s into %d chunks", doc_id, len(chunks))
    return chunks
