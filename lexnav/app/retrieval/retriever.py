"""
Chunk retriever — similarity search with re-ranking.

Retrieves relevant chunks from ChromaDB for a given query,
with optional doc_id filtering and section-ref/clause-type bonuses.

Low-evidence flag when best similarity score < threshold.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.models.chunks import Chunk

logger = logging.getLogger(__name__)

# Similarity threshold below which we flag as low evidence
LOW_EVIDENCE_THRESHOLD = 0.3

# How many candidates to retrieve before re-ranking
CANDIDATE_K = 15

# How many to return after re-ranking
RESULT_K = 8

# Bonus for section-ref match in query
SECTION_REF_BONUS = 0.05

# Bonus for clause-type match
CLAUSE_TYPE_BONUS = 0.03

# Common clause type keywords for matching
CLAUSE_TYPE_KEYWORDS = [
    "termination", "liability", "confidentiality", "indemnification",
    "payment", "warranty", "limitation", "force majeure", "governing law",
    "arbitration", "notice", "assignment", "amendment", "severability",
    "non-compete", "non-disclosure", "intellectual property", "insurance",
    "renewal", "breach", "default", "remedy", "damages",
]


class RetrievalResult:
    """Result from a retrieval operation."""

    def __init__(
        self,
        chunks: list[Chunk],
        scores: list[float],
        low_evidence: bool,
    ) -> None:
        self.chunks = chunks
        self.scores = scores
        self.low_evidence = low_evidence


class Retriever:
    """Retrieves and re-ranks chunks from ChromaDB."""

    def __init__(self, llm_client: Any, chroma_client: Any) -> None:
        self._llm = llm_client
        self._chroma = chroma_client

    async def retrieve(
        self,
        session_id: str,
        query: str,
        doc_ids: list[str] | None = None,
        top_k: int = RESULT_K,
    ) -> RetrievalResult:
        """
        Retrieve relevant chunks for a query.

        1. Embed query
        2. Search ChromaDB collection
        3. Filter by doc_ids if specified
        4. Re-rank with section-ref and clause-type bonuses
        5. Return top_k with low-evidence flag
        """
        collection_name = f"session_{session_id}"

        try:
            collection = self._chroma.get_collection(name=collection_name)
        except Exception:
            logger.warning("No collection found for session %s", session_id)
            return RetrievalResult(chunks=[], scores=[], low_evidence=True)

        # Embed query
        try:
            query_embedding = await self._llm.embed([query])
            query_embedding = query_embedding[0]
        except Exception as e:
            logger.error("Query embedding failed: %s", e)
            return RetrievalResult(chunks=[], scores=[], low_evidence=True)

        # Build where filter for doc_ids
        where_filter = None
        if doc_ids and len(doc_ids) == 1:
            where_filter = {"doc_id": doc_ids[0]}
        elif doc_ids and len(doc_ids) > 1:
            where_filter = {"doc_id": {"$in": doc_ids}}

        # Query ChromaDB
        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=min(CANDIDATE_K, collection.count()),
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as e:
            logger.error("ChromaDB query failed: %s", e)
            return RetrievalResult(chunks=[], scores=[], low_evidence=True)

        if not results["ids"] or not results["ids"][0]:
            return RetrievalResult(chunks=[], scores=[], low_evidence=True)

        # Build chunks with scores
        chunk_scores: list[tuple[Chunk, float]] = []
        ids = results["ids"][0]
        documents = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []
        distances = results["distances"][0] if results["distances"] else []

        for i, chunk_id in enumerate(ids):
            meta = metadatas[i] if i < len(metadatas) else {}
            text = documents[i] if i < len(documents) else ""
            # ChromaDB returns distances; convert to similarity
            # For cosine distance: similarity = 1 - distance
            distance = distances[i] if i < len(distances) else 1.0
            similarity = max(0.0, 1.0 - distance)

            chunk = Chunk(
                chunk_id=chunk_id,
                doc_id=meta.get("doc_id", ""),
                page_number=meta.get("page_number") if meta.get("page_number", -1) != -1 else None,
                section_ref=meta.get("section_ref") or None,
                text=text,
                char_start=meta.get("char_start", 0),
                char_end=meta.get("char_end", 0),
            )

            # Re-ranking bonuses
            bonus = 0.0

            # Section-ref match: if query mentions a section that appears in chunk
            section_refs = re.findall(r"(?:section|article|clause)\s+[\d.]+", query, re.IGNORECASE)
            if section_refs and chunk.section_ref:
                for ref in section_refs:
                    ref_num = re.search(r"[\d.]+", ref)
                    if ref_num and ref_num.group() in chunk.section_ref:
                        bonus += SECTION_REF_BONUS
                        break

            # Clause-type match: if query mentions a clause type found in chunk
            query_lower = query.lower()
            chunk_text_lower = (chunk.section_ref or "").lower() + " " + text.lower()
            for keyword in CLAUSE_TYPE_KEYWORDS:
                if keyword in query_lower and keyword in chunk_text_lower:
                    bonus += CLAUSE_TYPE_BONUS
                    break

            chunk_scores.append((chunk, similarity + bonus))

        # Sort by score descending
        chunk_scores.sort(key=lambda x: x[1], reverse=True)

        # Take top_k
        top_chunks = chunk_scores[:top_k]
        chunks = [c for c, _ in top_chunks]
        scores = [s for _, s in top_chunks]

        # Check for low evidence
        best_score = scores[0] if scores else 0.0
        low_evidence = best_score < LOW_EVIDENCE_THRESHOLD

        if low_evidence:
            logger.warning(
                "Low evidence for query in session %s (best score: %.3f)",
                session_id, best_score,
            )

        return RetrievalResult(
            chunks=chunks,
            scores=scores,
            low_evidence=low_evidence,
        )
