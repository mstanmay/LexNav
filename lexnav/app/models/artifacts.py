"""
Artifact models — typed output schemas for every agent.

Each agent produces a specific artifact type. These models define the
contract between agents, the orchestrator, and the API response.

Key design rule: checklist items are OPTIONS, not orders.
Language uses "consider", "you may want to" — never "you must".
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ─── ContextExtractor output ──────────────────────────────────────────────────

class EnrichedContextCard(BaseModel):
    """Enriched context extracted from document content by ContextExtractor."""

    detected_jurisdiction: str | None = Field(default=None, description="Jurisdiction detected from document")
    detected_doc_type: str = Field(description="Document type: lease, NDA, privacy-policy, etc.")
    parties: list[str] = Field(
        default_factory=list,
        description="Parties identified in document",
        examples=[["Landlord: ACME Corp", "Tenant: Jane Doe"]],
    )
    effective_date: str | None = Field(default=None, description="Effective date if found")
    key_terms_summary: str = Field(description="2-3 sentence overview of key terms")
    language_detected: str = Field(default="en", description="Detected document language")


# ─── Simplifier output ────────────────────────────────────────────────────────

class KeyDate(BaseModel):
    """A significant date extracted from the document."""

    date: str = Field(description="The date string as found")
    context: str = Field(description="What this date relates to")


class KeyAmount(BaseModel):
    """A significant monetary amount extracted from the document."""

    amount: str = Field(description="The amount as found")
    context: str = Field(description="What this amount relates to")


class SectionSummary(BaseModel):
    """Plain-language summary of a document section."""

    heading: str = Field(description="Section heading")
    original_ref: str = Field(description="Original reference, e.g. 'Section 4.2'")
    simplified: str = Field(description="Plain-language explanation")
    important_note: str | None = Field(default=None, description="Callout for unusual terms")


class Summary(BaseModel):
    """Full document summary produced by Simplifier agent."""

    title: str = Field(description="Document title or generated title")
    plain_language: str = Field(description="Full simplified text")
    sections: list[SectionSummary] = Field(default_factory=list, description="Per-section breakdowns")
    reading_level: str = Field(default="8th grade", description="Target reading level")
    key_dates: list[KeyDate] = Field(default_factory=list)
    key_amounts: list[KeyAmount] = Field(default_factory=list)


# ─── ClauseRiskAnalyzer output ────────────────────────────────────────────────

class AnalyzedClause(BaseModel):
    """A single clause analyzed for risk, obligations, and typicality."""

    clause_id: str = Field(description="Unique clause identifier")
    clause_ref: str = Field(description="Section reference, e.g. 'Section 3.1(a)'")
    clause_type: str = Field(description="Type: termination, liability, confidentiality, etc.")
    original_text: str = Field(description="Exact quote from document")
    explanation: str = Field(description="Plain-language explanation")
    risk_level: Literal["info", "caution", "warning", "critical"] = Field(description="Risk severity")
    risk_factors: list[str] = Field(default_factory=list, description="Specific risk factors identified")
    obligations: list[str] = Field(default_factory=list, description="What this clause requires")
    typical_vs_unusual: Literal["typical", "somewhat_unusual", "unusual", "highly_unusual"] = Field(
        default="typical",
        description="How typical this clause is compared to standard contracts",
    )


class RiskSummary(BaseModel):
    """Aggregate risk summary across all analyzed clauses."""

    total_clauses: int = Field(description="Total clauses analyzed")
    by_risk_level: dict[str, int] = Field(
        default_factory=dict,
        description="Count by risk level",
    )
    top_concerns: list[str] = Field(
        default_factory=list,
        description="Top concerns in plain language, ranked",
    )


class ClauseAnalysis(BaseModel):
    """Full clause risk analysis output."""

    clauses: list[AnalyzedClause] = Field(default_factory=list)
    risk_summary: RiskSummary = Field(description="Aggregate risk overview")


# ─── Comparator output ────────────────────────────────────────────────────────

class ComparisonItem(BaseModel):
    """A single point of difference between two documents."""

    topic: str = Field(description="Topic being compared: termination clause, payment terms, etc.")
    doc_a_position: str = Field(description="Doc A's stance on this topic")
    doc_b_position: str = Field(description="Doc B's stance on this topic")
    significance: Literal["minor", "moderate", "major"] = Field(description="How significant the difference is")
    note: str = Field(description="Plain-language implication of the difference")


class Inconsistency(BaseModel):
    """An internal inconsistency found between documents."""

    description: str = Field(description="What the inconsistency is")
    doc_a_ref: str = Field(description="Reference in document A")
    doc_b_ref: str = Field(description="Reference in document B")
    severity: Literal["low", "medium", "high"] = Field(description="Severity of the inconsistency")


class Comparison(BaseModel):
    """Full comparison output between two documents."""

    doc_a_label: str = Field(description="Label for document A")
    doc_b_label: str = Field(description="Label for document B")
    differences: list[ComparisonItem] = Field(default_factory=list)
    inconsistencies: list[Inconsistency] = Field(default_factory=list)
    overall_assessment: str = Field(description="High-level assessment of the comparison")


# ─── QuestionAnswerer output ──────────────────────────────────────────────────

class Answer(BaseModel):
    """Grounded answer to a user question about their documents."""

    question: str = Field(description="The user's original question")
    answer_text: str = Field(description="Answer grounded in document chunks only")
    confidence: Literal["high", "medium", "low", "insufficient"] = Field(
        description="Confidence in the answer"
    )
    relevant_sections: list[str] = Field(
        default_factory=list,
        description="Section references relevant to the answer",
    )
    follow_up_questions: list[str] = Field(
        default_factory=list,
        description="Suggested follow-up questions",
    )
    what_is_missing: str | None = Field(
        default=None,
        description="If confidence is insufficient, what info is missing",
    )


# ─── ActionPlanner output ─────────────────────────────────────────────────────

class ChecklistItem(BaseModel):
    """A single action option — an OPTION, not an order."""

    item_id: str = Field(description="Unique item identifier")
    category: str = Field(description="Category: before-signing, negotiate, seek-clarification")
    description: str = Field(description="What to consider (option, not directive)")
    reason: str = Field(description="Why this matters, grounded in the document")
    priority: Literal["important", "recommended", "optional"] = Field(description="Priority level")
    related_clause_ids: list[str] = Field(
        default_factory=list,
        description="Related clause IDs from ClauseRiskAnalyzer",
    )


class Checklist(BaseModel):
    """Action checklist — options the user may want to consider."""

    title: str = Field(description="Checklist title")
    preamble: str = Field(
        description="Framing text: 'Based on the document, you may want to consider...'"
    )
    items: list[ChecklistItem] = Field(default_factory=list)


# ─── LawyerBriefGenerator output ──────────────────────────────────────────────

class DocumentMeta(BaseModel):
    """Metadata about a document included in a lawyer brief."""

    doc_id: str
    filename: str
    doc_type: str
    pages: int | None = None


class LawyerBrief(BaseModel):
    """Structured brief to prepare for a lawyer meeting."""

    case_summary: str = Field(description="3-5 sentence overview for the lawyer")
    client_situation: str = Field(description="Role, jurisdiction, issue context")
    document_overview: list[DocumentMeta] = Field(default_factory=list)
    key_clauses: list[AnalyzedClause] = Field(
        default_factory=list,
        description="Clauses at caution+ risk level",
    )
    risk_areas: list[str] = Field(default_factory=list)
    client_questions: list[str] = Field(
        default_factory=list,
        description="Questions the user asked during session",
    )
    suggested_discussion_points: list[str] = Field(
        default_factory=list,
        description="Topics to discuss with the lawyer",
    )
    timeline: list[KeyDate] = Field(default_factory=list, description="Key dates and deadlines")
    appendix_references: list[str] = Field(
        default_factory=list,
        description="Section references for quick lawyer lookup",
    )
