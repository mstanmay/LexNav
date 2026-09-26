"""
Context Card — drives agent selection and scoping.

The context card captures user situation metadata: jurisdiction, role,
issue type, urgency, and language. The orchestrator uses it to select
the minimum set of agents and tailor prompts.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ContextCard(BaseModel):
    """User context that drives agent selection and prompt shaping."""

    jurisdiction: str | None = Field(
        default=None,
        description="Jurisdiction code, e.g. 'US-CA', 'IN-MH', 'UK'",
        examples=["US-CA", "UK", "IN-MH"],
    )
    user_role: str | None = Field(
        default=None,
        description="User's role in the legal context",
        examples=["tenant", "employee", "small-business-owner"],
    )
    issue_type: str | None = Field(
        default=None,
        description="Type of legal issue",
        examples=["lease-dispute", "employment-contract", "privacy-policy"],
    )
    urgency: Literal["low", "medium", "high", "critical", "urgent"] = Field(
        default="medium",
        description="How urgent the user's situation is",
    )
    language: str = Field(
        default="en",
        description="ISO 639-1 language code",
    )
    doc_ids: list[str] = Field(
        default_factory=list,
        description="Document IDs to scope analysis to",
    )
