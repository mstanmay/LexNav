"""
Google Gemini LLM client wrapper for LexNav.

Native integration with the official google-genai SDK (gemini-2.5-flash / gemini-1.5-pro)
and Google Cloud text-embedding-004.

Features:
- Native Gemini 2.5 Flash client with structured JSON mode
- Streaming support for SSE relay
- Per-action call budgeting
- text-embedding-004 support for vector retrieval
- Zero external non-Google LLM dependencies
"""

from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised when Gemini LLM call fails."""
    pass


class BudgetExhaustedError(Exception):
    """Raised when LLM call budget is exceeded."""
    pass


class GeminiClient:
    """
    Google Gemini native client using official google-genai SDK.

    - Default model: gemini-2.5-flash
    - Native JSON schema mode via response_mime_type="application/json"
    - Strict per-action call budgeting to prevent runaway execution
    - text-embedding-004 for vector embeddings
    """

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        embedding_model: str | None = None,
    ) -> None:
        self._api_key = api_key or settings.gemini_api_key or settings.llm_api_key
        self._model = model or settings.gemini_model or "gemini-2.5-flash"
        self._embedding_model = embedding_model or settings.gemini_embedding_model or "text-embedding-004"

        if self._api_key:
            self._client = genai.Client(api_key=self._api_key)
            logger.info("Initialized Google GenAI client with model: %s", self._model)
        else:
            self._client = None
            logger.info("GeminiClient initialized without API key (test / mock mode)")

        # Per-action call budget tracking
        self._call_count = 0
        self._max_calls = settings.max_llm_calls_per_action

    # ── Call budget ────────────────────────────────────────────────────────

    def reset_budget(self) -> None:
        """Reset the call counter (invoked at start of each action chain)."""
        self._call_count = 0

    @property
    def calls_used(self) -> int:
        """Number of LLM calls consumed in the current action."""
        return self._call_count

    def _check_budget(self) -> None:
        """Enforce strict call limit per action."""
        if self._call_count >= self._max_calls:
            raise BudgetExhaustedError(
                f"Gemini call budget exhausted ({self._max_calls} calls limit)"
            )

    # ── Chat completions ──────────────────────────────────────────────────

    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = True,
    ) -> str:
        """
        Execute chat generation with Google Gemini.
        Returns response text.
        """
        self._check_budget()

        if not self._client:
            raise LLMError("GEMINI_API_KEY is not configured. For testing, use FakeGeminiClient.")

        try:
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                system_instruction=system_prompt,
                response_mime_type="application/json" if json_mode else "text/plain",
            )

            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=user_prompt,
                config=config,
            )
            self._call_count += 1
            return response.text or "{}"
        except Exception as e:
            logger.error("Gemini generation failed: %s", e)
            raise LLMError(f"Gemini API call failed: {e}") from e

    async def chat_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """
        Stream tokens from Google Gemini as they arrive.
        """
        self._check_budget()

        if not self._client:
            raise LLMError("GEMINI_API_KEY is not configured.")

        try:
            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                system_instruction=system_prompt,
            )
            response_stream = await self._client.aio.models.generate_content_stream(
                model=self._model,
                contents=user_prompt,
                config=config,
            )
            self._call_count += 1

            async for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error("Gemini streaming failed: %s", e)
            raise LLMError(f"Gemini streaming failed: {e}") from e

    # ── Embeddings ────────────────────────────────────────────────────────

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Embed texts using Google text-embedding-004.
        """
        if not texts:
            return []

        if not self._client:
            # Fallback zero vector for test / mock mode
            return [[0.0] * 768 for _ in texts]

        try:
            result = await self._client.aio.models.embed_content(
                model=self._embedding_model,
                contents=texts,
            )
            embeddings = [emb.values for emb in result.embeddings]
            return embeddings
        except Exception as e:
            logger.error("Gemini embedding failed: %s", e)
            raise LLMError(f"Gemini embedding failed: {e}") from e

    # ── Structured JSON output helper ─────────────────────────────────────

    async def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """
        Generate structured output parsed as JSON dict.
        """
        raw = await self.chat(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
            json_mode=True,
        )

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("Gemini response is not valid JSON: %s", raw[:200])
            raise LLMError(f"Invalid JSON from Gemini: {e}") from e


# Standard alias for drop-in agent compatibility
LLMClient = GeminiClient
