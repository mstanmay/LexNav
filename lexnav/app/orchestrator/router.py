"""
Intent router — maps analysis intents to minimum agent chains.

Uses the ContextCard and session state to select agents.
Skips ContextExtractor if context was already extracted this session.
Handles 'auto' intent by inferring from context.
"""

from __future__ import annotations

import logging
from typing import Literal

from app.models.context_card import ContextCard
from app.models.session import Session

logger = logging.getLogger(__name__)

# Valid intents
Intent = Literal["simplify", "risks", "compare", "qa", "checklist", "brief", "auto"]

VALID_INTENTS: set[str] = {"simplify", "risks", "compare", "qa", "checklist", "brief", "auto"}

# Intent → required agent type names (in execution order)
INTENT_TO_AGENT_NAMES: dict[str, list[str]] = {
    "simplify": ["ContextExtractor", "Simplifier"],
    "risks": ["ContextExtractor", "ClauseRiskAnalyzer"],
    "compare": ["ContextExtractor", "Comparator"],
    "qa": ["QuestionAnswerer"],
    "checklist": ["ContextExtractor", "ClauseRiskAnalyzer", "ActionPlanner"],
    "brief": ["ContextExtractor", "ClauseRiskAnalyzer", "ActionPlanner", "LawyerBriefGenerator"],
}


def resolve_auto_intent(
    context_card: ContextCard,
    session: Session,
    user_query: str | None = None,
) -> str:
    """
    Infer the best intent from context when 'auto' is specified.

    Rules:
    1. If there's a user query → qa
    2. If multiple documents → compare
    3. If urgency is high → risks
    4. Default → simplify
    """
    if user_query:
        return "qa"

    doc_count = len(context_card.doc_ids) or len(session.documents)
    if doc_count >= 2:
        return "compare"

    if context_card.urgency == "high":
        return "risks"

    return "simplify"


def select_agent_names(
    intent: str,
    session: Session,
    user_query: str | None = None,
) -> tuple[str, list[str]]:
    """
    Select the minimum agent chain for the given intent.

    Returns (resolved_intent, agent_name_list).

    Optimizations:
    - If ContextExtractor output is cached, skip it (saves 1 LLM call).
    - For 'auto', resolve to a concrete intent first.
    """
    # Resolve 'auto'
    resolved = intent
    if intent == "auto":
        resolved = resolve_auto_intent(session.context_card, session, user_query)
        logger.info("Auto-resolved intent: %s", resolved)

    agent_names = list(INTENT_TO_AGENT_NAMES.get(resolved, ["ContextExtractor", "Simplifier"]))

    # Skip ContextExtractor if already cached
    if "context_card_enriched" in session.cached_artifacts and "ContextExtractor" in agent_names:
        agent_names.remove("ContextExtractor")
        logger.info("Skipping ContextExtractor (cached)")

    # Skip ClauseRiskAnalyzer if already cached (for checklist/brief chains)
    if "clauses" in session.cached_artifacts and "ClauseRiskAnalyzer" in agent_names:
        agent_names.remove("ClauseRiskAnalyzer")
        logger.info("Skipping ClauseRiskAnalyzer (cached)")

    return resolved, agent_names
