"""
Mandatory disclaimer — injected on every AI response.

The orchestrator calls inject_disclaimer() on every ResponseEnvelope.
Individual agents cannot suppress the disclaimer.
"""

DISCLAIMER: str = (
    "⚠️ LexNav provides legal information only, not legal advice. "
    "This analysis is based solely on the uploaded document text and may not reflect "
    "the complete legal picture. For advice specific to your situation, consult a "
    "qualified legal professional in your jurisdiction."
)


def get_disclaimer() -> str:
    """Return the mandatory disclaimer text."""
    return DISCLAIMER
