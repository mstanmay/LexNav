"""
Embedding and vector storage.

Embeds document chunks via the LLM embedding endpoint and stores them
in a per-session ChromaDB collection (in-memory, ephemeral).

Embedding calls are infrastructure — NOT counted against the per-action
LLM call budget.
"""

from __future__ import annotations

import logging
from typing import Any

from app.models.chunks import Chunk

logger = logging.getLogger(__name__)


class EmbeddingError(Exception):
    """Raised when embedding fails."""

    pass


class Embedder:
    """Embeds chunks and stores them in ChromaDB."""

    def __init__(self, llm_client: Any, chroma_client: Any) -> None:
        """
        Args:
            llm_client: LLM client with an embed() method.
            chroma_client: ChromaDB client instance.
        """
        self._llm = llm_client
        self._chroma = chroma_client

    async def embed_and_store(
        self,
        session_id: str,
        doc_id: str,
        chunks: list[Chunk],
    ) -> int:
        """
        Embed chunks and store in ChromaDB.

        Creates a collection named "session_{session_id}" if it doesn't exist.
        Returns the number of chunks stored.
        """
        if not chunks:
            return 0

        collection_name = f"session_{session_id}"

        try:
            collection = self._chroma.get_or_create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"},
            )
        except Exception as e:
            logger.error("Failed to create/get ChromaDB collection: %s", e)
            raise EmbeddingError(f"Vector store error: {e}") from e

        # Batch embed
        texts = [chunk.text for chunk in chunks]
        try:
            embeddings = await self._llm.embed(texts)
        except Exception as e:
            logger.error("Embedding failed: %s", e)
            raise EmbeddingError(f"Embedding failed: {e}") from e

        # Upsert into ChromaDB
        ids = [chunk.chunk_id for chunk in chunks]
        metadatas = [
            {
                "doc_id": chunk.doc_id,
                "page_number": chunk.page_number or -1,
                "section_ref": chunk.section_ref or "",
                "char_start": chunk.char_start,
                "char_end": chunk.char_end,
            }
            for chunk in chunks
        ]
        documents = texts

        try:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas,
                documents=documents,
            )
        except Exception as e:
            logger.error("ChromaDB upsert failed: %s", e)
            raise EmbeddingError(f"Vector store upsert failed: {e}") from e

        logger.info(
            "Stored %d chunks for doc %s in collection %s",
            len(chunks), doc_id, collection_name,
        )
        return len(chunks)
