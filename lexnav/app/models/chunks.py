"""
Chunk and Citation models for the document pipeline.

Chunks are clause-aware segments of document text stored in the vector DB.
Citations link agent claims back to specific chunks for grounding.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class Chunk(BaseModel):
    """A clause-aware segment of document text."""

    chunk_id: str = Field(description="Unique chunk identifier (UUID)")
    doc_id: str = Field(description="Parent document ID")
    page_number: int | None = Field(default=None, description="Source page number (1-indexed)")
    section_ref: str | None = Field(
        default=None,
        description="Detected section reference, e.g. 'Section 3.1'",
    )
    text: str = Field(description="Chunk text content (300-800 tokens)")
    char_start: int = Field(description="Character offset start in full document text")
    char_end: int = Field(description="Character offset end in full document text")
    overlap_prev: bool = Field(default=False, description="Whether this chunk overlaps with previous")


class Citation(BaseModel):
    """A reference linking an agent's claim to a source chunk."""

    chunk_id: str = Field(description="ID of the cited chunk")
    doc_id: str = Field(description="ID of the source document")
    doc_filename: str = Field(description="Original filename of the source document")
    page_number: int | None = Field(default=None, description="Page number in source")
    section_ref: str | None = Field(default=None, description="Section reference if detected")
    snippet: str = Field(description="~50 char excerpt showing where the fact came from")
