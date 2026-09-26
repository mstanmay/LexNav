"""
Fake LLM client for testing.

Drop-in replacement for the real LLMClient. Returns canned JSON
responses based on system prompt keywords. No API keys required.

Also tracks call count for budget tests and supports streaming mode.
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator

from app.llm.client import BudgetExhaustedError


# ── Canned responses per agent ────────────────────────────────────────────

CONTEXT_EXTRACT_RESPONSE = {
    "detected_jurisdiction": "US-CA",
    "detected_doc_type": "residential-lease",
    "parties": ["Landlord: Sunrise Properties LLC", "Tenant: Jane Smith"],
    "effective_date": "2024-01-01",
    "key_terms_summary": "This is a 12-month residential lease agreement for a 2-bedroom apartment at 456 Oak Avenue. Monthly rent is $2,500 with a $5,000 security deposit.",
    "language_detected": "en",
    "cited_chunks": [],
}

SIMPLIFY_RESPONSE = {
    "title": "Residential Lease Agreement Summary",
    "plain_language": "This lease is a 12-month agreement between Sunrise Properties LLC (the landlord) and Jane Smith (the tenant) for a 2-bedroom apartment. The monthly rent is $2,500, due on the 1st of each month. A security deposit of $5,000 is required.",
    "sections": [
        {
            "heading": "Rent and Payment",
            "original_ref": "Section 3",
            "simplified": "Rent is $2,500 per month, due on the first day of each month. Late payments after the 5th incur a $150 fee.",
            "important_note": "The late fee is applied after only 5 days, which is a short grace period.",
        },
        {
            "heading": "Security Deposit",
            "original_ref": "Section 4",
            "simplified": "A $5,000 security deposit is required. The landlord may keep all or part of it for damages beyond normal wear.",
            "important_note": None,
        },
    ],
    "reading_level": "8th grade",
    "key_dates": [
        {"date": "2024-01-01", "context": "Lease start date"},
        {"date": "2024-12-31", "context": "Lease end date"},
    ],
    "key_amounts": [
        {"amount": "$2,500", "context": "Monthly rent"},
        {"amount": "$5,000", "context": "Security deposit"},
        {"amount": "$150", "context": "Late payment fee"},
    ],
    "cited_chunks": [],
}

CLAUSE_RISK_RESPONSE = {
    "clauses": [
        {
            "clause_id": "clause_001",
            "clause_ref": "Section 7.2",
            "clause_type": "termination",
            "original_text": "Landlord may terminate this lease with 30 days written notice for any reason.",
            "explanation": "The landlord can end the lease with just 30 days notice, without needing a specific reason.",
            "risk_level": "warning",
            "risk_factors": ["One-sided termination right", "No cause required", "Short notice period"],
            "obligations": ["Tenant must vacate within 30 days of notice"],
            "typical_vs_unusual": "unusual",
        },
        {
            "clause_id": "clause_002",
            "clause_ref": "Section 4.3",
            "clause_type": "liability",
            "original_text": "Tenant shall be responsible for all repairs and maintenance of the premises.",
            "explanation": "The tenant is responsible for all repairs, including those that would typically be the landlord's responsibility.",
            "risk_level": "caution",
            "risk_factors": ["Broad responsibility transfer", "May conflict with local tenant protection laws"],
            "obligations": ["Tenant must handle all repairs at own expense"],
            "typical_vs_unusual": "somewhat_unusual",
        },
        {
            "clause_id": "clause_003",
            "clause_ref": "Section 3.1",
            "clause_type": "payment",
            "original_text": "Rent of $2,500 is due on the first day of each calendar month.",
            "explanation": "Monthly rent payment terms with a specific due date.",
            "risk_level": "info",
            "risk_factors": [],
            "obligations": ["Pay $2,500 by the 1st of each month"],
            "typical_vs_unusual": "typical",
        },
    ],
    "risk_summary": {
        "total_clauses": 3,
        "by_risk_level": {"info": 1, "caution": 1, "warning": 1, "critical": 0},
        "top_concerns": [
            "Landlord has one-sided termination right with no cause required",
            "Tenant bears all repair and maintenance responsibility",
        ],
    },
    "cited_chunks": [],
}

COMPARISON_RESPONSE = {
    "doc_a_label": "Original Lease",
    "doc_b_label": "Revised Lease",
    "differences": [
        {
            "topic": "Monthly Rent",
            "doc_a_position": "$2,500 per month",
            "doc_b_position": "$2,800 per month",
            "significance": "major",
            "note": "The revised lease increases rent by $300/month ($3,600/year).",
        },
        {
            "topic": "Termination Notice Period",
            "doc_a_position": "30 days written notice",
            "doc_b_position": "60 days written notice",
            "significance": "moderate",
            "note": "The revised lease provides a longer notice period for termination.",
        },
    ],
    "inconsistencies": [
        {
            "description": "The revised lease references 'Section 5.2' for pet policy but Section 5.2 covers parking in this version.",
            "doc_a_ref": "Section 5.2 (Pets)",
            "doc_b_ref": "Section 5.2 (Parking)",
            "severity": "medium",
        },
    ],
    "overall_assessment": "The revised lease increases financial obligations but improves tenant protections with longer notice periods.",
    "cited_chunks": [],
}

QA_RESPONSE = {
    "question": "Can the landlord enter the apartment without notice?",
    "answer_text": "According to Section 6.1, the landlord must provide at least 24 hours written notice before entering the premises, except in cases of emergency. Emergency is defined as situations involving immediate risk to life, safety, or property.",
    "confidence": "high",
    "relevant_sections": ["Section 6.1", "Section 6.2"],
    "follow_up_questions": [
        "What constitutes an 'emergency' under this lease?",
        "Are there any restrictions on when the landlord can schedule visits?",
        "What happens if the landlord enters without proper notice?",
    ],
    "what_is_missing": None,
    "cited_chunks": [],
}

CHECKLIST_RESPONSE = {
    "title": "Lease Review Action Options",
    "preamble": "Based on the document analysis, you may want to consider the following options:",
    "items": [
        {
            "item_id": "item_001",
            "category": "negotiate",
            "description": "Consider asking about adding a cause requirement to the termination clause",
            "reason": "The current clause allows termination without cause, which is unusual for residential leases",
            "priority": "important",
            "related_clause_ids": ["clause_001"],
        },
        {
            "item_id": "item_002",
            "category": "seek-clarification",
            "description": "You may want to clarify the scope of tenant repair responsibilities",
            "reason": "The broad maintenance clause could include major repairs typically covered by landlords",
            "priority": "recommended",
            "related_clause_ids": ["clause_002"],
        },
        {
            "item_id": "item_003",
            "category": "before-signing",
            "description": "Consider reviewing local tenant protection laws for your jurisdiction",
            "reason": "Some clauses may be unenforceable under California tenant protection statutes",
            "priority": "recommended",
            "related_clause_ids": ["clause_001", "clause_002"],
        },
    ],
    "cited_chunks": [],
}

LAWYER_BRIEF_RESPONSE = {
    "case_summary": "Jane Smith is reviewing a 12-month residential lease with Sunrise Properties LLC for a 2-bedroom apartment in California. The lease contains several clauses that may warrant discussion, including a no-cause termination provision and broad tenant maintenance obligations.",
    "client_situation": "Tenant reviewing residential lease in California (US-CA). Issue type: lease review. Urgency: medium.",
    "document_overview": [
        {"doc_id": "doc-1", "filename": "lease.pdf", "doc_type": "residential-lease", "pages": 12},
    ],
    "key_clauses": [
        {
            "clause_id": "clause_001",
            "clause_ref": "Section 7.2",
            "clause_type": "termination",
            "original_text": "Landlord may terminate this lease with 30 days written notice for any reason.",
            "explanation": "One-sided termination right without cause requirement.",
            "risk_level": "warning",
            "risk_factors": ["One-sided", "No cause required"],
            "obligations": ["Vacate within 30 days"],
            "typical_vs_unusual": "unusual",
        },
    ],
    "risk_areas": [
        "One-sided termination provisions",
        "Broad tenant maintenance obligations",
    ],
    "client_questions": [],
    "suggested_discussion_points": [
        "Is the no-cause termination clause enforceable under California law?",
        "What standard maintenance obligations are typical for this type of lease?",
        "Are there any tenant protections that override specific lease clauses?",
    ],
    "timeline": [
        {"date": "2024-01-01", "context": "Lease start date"},
        {"date": "2024-12-31", "context": "Lease end date"},
    ],
    "appendix_references": ["Section 7.2", "Section 4.3", "Section 3.1"],
    "cited_chunks": [],
}

# Route system prompt keywords to canned responses
RESPONSE_MAP: dict[str, dict[str, Any]] = {
    "context_extract": CONTEXT_EXTRACT_RESPONSE,
    "document analyst": CONTEXT_EXTRACT_RESPONSE,
    "simplif": SIMPLIFY_RESPONSE,
    "clause risk": CLAUSE_RISK_RESPONSE,
    "risk analyst": CLAUSE_RISK_RESPONSE,
    "compar": COMPARISON_RESPONSE,
    "question answer": QA_RESPONSE,
    "action planner": CHECKLIST_RESPONSE,
    "brief": LAWYER_BRIEF_RESPONSE,
}


def _route_response(system_prompt: str) -> dict[str, Any]:
    """Route a system prompt to the appropriate canned response."""
    prompt_lower = system_prompt.lower()
    for keyword, response in RESPONSE_MAP.items():
        if keyword in prompt_lower:
            return response
    # Default fallback
    return CONTEXT_EXTRACT_RESPONSE


class FakeLLMClient:
    """
    Drop-in fake LLM client for testing.

    No API keys required. Returns canned JSON based on system prompt keywords.
    Tracks call count for budget tests.
    """

    def __init__(self, max_calls: int = 5) -> None:
        self._call_count = 0
        self._max_calls = max_calls
        self._embed_call_count = 0

    def reset_budget(self) -> None:
        """Reset call counter."""
        self._call_count = 0

    @property
    def calls_used(self) -> int:
        """Number of LLM calls used."""
        return self._call_count

    def _check_budget(self) -> None:
        if self._call_count >= self._max_calls:
            raise BudgetExhaustedError(
                f"LLM call budget exhausted ({self._max_calls} calls)"
            )

    async def chat(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        json_mode: bool = True,
    ) -> str:
        """Return canned JSON response."""
        self._check_budget()
        self._call_count += 1
        response = _route_response(system_prompt)
        return json.dumps(response)

    async def chat_json(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> dict[str, Any]:
        """Return canned response as dict."""
        self._check_budget()
        self._call_count += 1
        return dict(_route_response(system_prompt))

    async def chat_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """Yield tokens from canned response."""
        self._check_budget()
        self._call_count += 1
        response = _route_response(system_prompt)
        text = json.dumps(response)
        # Yield in small chunks
        for i in range(0, len(text), 20):
            yield text[i:i + 20]

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """
        Return fake embeddings (384-dim zero vectors).

        NOT counted against call budget.
        """
        self._embed_call_count += 1
        return [[0.0] * 384 for _ in texts]


# Google Gemini fake client alias
FakeGeminiClient = FakeLLMClient
