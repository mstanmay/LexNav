"""
Advice filter — catches and rewrites advice-shaped language.

Scans agent output for phrases that could constitute legal advice.
Flags violations and rewrites them into information-only language.

Direct document quotes (inside quotation marks) are exempt.
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class AdviceViolation:
    """A detected advice-shaped phrase."""

    pattern: str
    matched_text: str
    position: int
    suggested_rewrite: str


# Pattern → suggested rewrite mapping
ADVICE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\byou should\b", re.I), "you may want to consider"),
    (re.compile(r"\bI recommend\b", re.I), "one option is"),
    (re.compile(r"\bI advise\b", re.I), "it may be worth considering"),
    (re.compile(r"\byou must\b", re.I), "the document states that"),
    (re.compile(r"\byou need to\b", re.I), "you may want to"),
    (re.compile(r"\byou have to\b", re.I), "the document indicates"),
    (re.compile(r"\bthe court will\b", re.I), "the document language suggests"),
    (re.compile(r"\byou will win\b", re.I), "the document text states"),
    (re.compile(r"\byou will lose\b", re.I), "the document text states"),
    (re.compile(r"\bguaranteed\b", re.I), "as stated in the document"),
    (re.compile(r"\bdefinitely\b", re.I), "based on the document"),
    (re.compile(r"\bmy advice\b", re.I), "based on the document analysis"),
    (re.compile(r"\bI suggest\b", re.I), "one consideration is"),
    (re.compile(r"\btake action\b", re.I), "consider whether action"),
    (re.compile(r"\bdo not sign\b", re.I), "consider reviewing before signing"),
    (re.compile(r"\bsign immediately\b", re.I), "consider reviewing before signing"),
]

# Pattern for quoted text (to skip)
QUOTE_PATTERN = re.compile(r'"[^"]*?"|\'[^\']*?\'|"[^"]*?"')


def _is_inside_quote(text: str, position: int) -> bool:
    """Check if a position falls inside quoted text (direct document quote)."""
    for match in QUOTE_PATTERN.finditer(text):
        if match.start() <= position < match.end():
            return True
    return False


def scan_for_advice(text: str) -> list[AdviceViolation]:
    """
    Scan text for advice-shaped language.

    Returns a list of violations. Phrases inside quotation marks
    (direct document quotes) are exempt.
    """
    violations: list[AdviceViolation] = []

    for pattern, rewrite in ADVICE_PATTERNS:
        for match in pattern.finditer(text):
            if not _is_inside_quote(text, match.start()):
                violations.append(AdviceViolation(
                    pattern=pattern.pattern,
                    matched_text=match.group(),
                    position=match.start(),
                    suggested_rewrite=rewrite,
                ))

    return violations


def rewrite_advice(text: str) -> tuple[str, int]:
    """
    Scan and rewrite advice-shaped language in text.

    Returns (rewritten_text, count_of_rewrites).
    Phrases inside quotation marks are preserved.
    """
    violations = scan_for_advice(text)
    if not violations:
        return text, 0

    # Sort by position descending so we can replace from end to start
    # without messing up positions
    violations.sort(key=lambda v: v.position, reverse=True)

    result = text
    count = 0
    for violation in violations:
        # Replace matched text with suggested rewrite
        start = violation.position
        end = start + len(violation.matched_text)
        result = result[:start] + violation.suggested_rewrite + result[end:]
        count += 1

    if count > 0:
        logger.info("Rewrote %d advice-shaped phrases in agent output", count)

    return result, count


def filter_artifact(artifact: dict, depth: int = 0) -> dict:
    """
    Recursively scan and rewrite advice-shaped language in artifact values.

    Only processes string values. Limits recursion depth to prevent
    infinite loops on circular references.
    """
    if depth > 10:
        return artifact

    result = {}
    for key, value in artifact.items():
        if isinstance(value, str):
            rewritten, _ = rewrite_advice(value)
            result[key] = rewritten
        elif isinstance(value, dict):
            result[key] = filter_artifact(value, depth + 1)
        elif isinstance(value, list):
            result[key] = [
                filter_artifact(item, depth + 1) if isinstance(item, dict)
                else (rewrite_advice(item)[0] if isinstance(item, str) else item)
                for item in value
            ]
        else:
            result[key] = value

    return result
