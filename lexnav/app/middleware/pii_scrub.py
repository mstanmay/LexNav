"""
PII scrubbing for log records.

Attaches a logging filter that redacts email addresses, phone numbers,
and SSN-like patterns from all log messages. Only the log output is
scrubbed — runtime data is unaffected.
"""

from __future__ import annotations

import re
import logging


# PII patterns to redact
PII_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # Email addresses
    (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"), "[EMAIL_REDACTED]"),
    # US phone numbers
    (re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"), "[PHONE_REDACTED]"),
    # SSN-like patterns
    (re.compile(r"\b\d{3}-\d{2}-\d{4}\b"), "[SSN_REDACTED]"),
    # Credit card-like patterns (16 digits)
    (re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b"), "[CARD_REDACTED]"),
]


class PIIScrubFilter(logging.Filter):
    """Logging filter that redacts PII patterns from log messages."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, replacement in PII_PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)

        # Also scrub args if they're strings
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: self._scrub(v) for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(self._scrub(a) for a in record.args)

        return True

    @staticmethod
    def _scrub(value: object) -> object:
        """Scrub PII from a single value."""
        if isinstance(value, str):
            for pattern, replacement in PII_PATTERNS:
                value = pattern.sub(replacement, value)
        return value


def setup_pii_scrub_logging() -> None:
    """Add PII scrubbing filter to the root logger."""
    root_logger = logging.getLogger()
    root_logger.addFilter(PIIScrubFilter())
