"""
Input sanitization for user queries.

Guards against:
- Overly long queries
- Control characters
- High non-alphanumeric ratio (potential injection/binary)
"""

from __future__ import annotations

import re
import logging

from app.config import settings

logger = logging.getLogger(__name__)


class InputSanitizationError(Exception):
    """Raised when input fails sanitization checks."""

    pass


# Control characters except common whitespace
CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_query(query: str) -> str:
    """
    Sanitize a user query.

    1. Check length limit
    2. Strip control characters
    3. Check non-alphanumeric ratio
    4. Trim whitespace

    Returns sanitized query or raises InputSanitizationError.
    """
    if not query or not query.strip():
        raise InputSanitizationError("Query cannot be empty")

    # Length check
    if len(query) > settings.max_query_length:
        raise InputSanitizationError(
            f"Query exceeds maximum length of {settings.max_query_length} characters"
        )

    # Strip control characters
    cleaned = CONTROL_CHAR_PATTERN.sub("", query)
    if len(cleaned) < len(query):
        logger.warning("Stripped %d control characters from query", len(query) - len(cleaned))

    # Non-alphanumeric ratio check
    if cleaned:
        alnum_count = sum(1 for c in cleaned if c.isalnum() or c.isspace())
        ratio = alnum_count / len(cleaned)
        if ratio < 0.5:
            raise InputSanitizationError(
                "Query contains too many special characters"
            )

    return cleaned.strip()
