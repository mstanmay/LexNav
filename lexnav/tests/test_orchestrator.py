"""
Tests for orchestrator routing and chain execution:
- Intent router (agent chain mapping, auto-intent resolution, artifact caching optimization)
- Orchestrator runner (sequential execution, artifact piping, disclaimer injection, SSE streaming)
- LLM budget enforcement
"""

from __future__ import annotations

import json
import pytest

from app.models.context_card import ContextCard
from app.models.session import Session, DocumentInfo
from app.orchestrator.router import (
    select_agent_names,
    resolve_auto_intent,
    INTENT_TO_AGENT_NAMES,
)
from app.orchestrator.runner import OrchestratorRunner


class TestRouter:
    """Tests for intent routing logic."""

    def test_intent_agent_mappings(self):
        """Standard intents map to their expected agent sequences."""
        session = Session(session_id="s1")

        intent, agents = select_agent_names("simplify", session)
        assert intent == "simplify"
        assert agents == ["ContextExtractor", "Simplifier"]

        intent, agents = select_agent_names("risks", session)
        assert intent == "risks"
        assert agents == ["ContextExtractor", "ClauseRiskAnalyzer"]

        intent, agents = select_agent_names("compare", session)
        assert intent == "compare"
        assert agents == ["ContextExtractor", "Comparator"]

        intent, agents = select_agent_names("qa", session, user_query="What is rent?")
        assert intent == "qa"
        assert agents == ["QuestionAnswerer"]

        intent, agents = select_agent_names("checklist", session)
        assert intent == "checklist"
        assert agents == ["ContextExtractor", "ClauseRiskAnalyzer", "ActionPlanner"]

        intent, agents = select_agent_names("brief", session)
        assert intent == "brief"
        assert agents == ["ContextExtractor", "ClauseRiskAnalyzer", "ActionPlanner", "LawyerBriefGenerator"]

    def test_caching_skips_context_extractor(self):
        """When context_card_enriched is already cached, ContextExtractor is omitted."""
        session = Session(session_id="s2")
        session.cached_artifacts["context_card_enriched"] = {"detected_jurisdiction": "US-CA"}

        intent, agents = select_agent_names("simplify", session)
        assert "ContextExtractor" not in agents
        assert agents == ["Simplifier"]

    def test_caching_skips_clause_analyzer(self):
        """When clauses are already cached, ClauseRiskAnalyzer is omitted for checklist."""
        session = Session(session_id="s3")
        session.cached_artifacts["context_card_enriched"] = {"detected_jurisdiction": "US-CA"}
        session.cached_artifacts["clauses"] = [{"clause_ref": "3"}]

        intent, agents = select_agent_names("checklist", session)
        assert "ContextExtractor" not in agents
        assert "ClauseRiskAnalyzer" not in agents
        assert agents == ["ActionPlanner"]

    def test_resolve_auto_intent(self):
        """Auto intent resolves according to query, document count, and urgency."""
        session = Session(session_id="s4")

        # Query provided -> qa
        assert resolve_auto_intent(session.context_card, session, user_query="How much is rent?") == "qa"

        # 2 documents -> compare
        session.documents["doc1"] = DocumentInfo(doc_id="doc1", filename="lease1.txt", mime_type="text/plain", size_bytes=100)
        session.documents["doc2"] = DocumentInfo(doc_id="doc2", filename="lease2.txt", mime_type="text/plain", size_bytes=100)
        assert resolve_auto_intent(session.context_card, session) == "compare"

        # High urgency -> risks
        session.documents.clear()
        session.context_card.urgency = "high"
        assert resolve_auto_intent(session.context_card, session) == "risks"

        # Default -> simplify
        session.context_card.urgency = "low"
        assert resolve_auto_intent(session.context_card, session) == "simplify"


@pytest.mark.asyncio
class TestRunner:
    """Tests for OrchestratorRunner executing agent chains."""

    async def test_run_chain_basic(self, fake_llm, retriever):
        """run_chain executes agents, injects disclaimer, and returns ResponseEnvelope."""
        runner = OrchestratorRunner(llm_client=fake_llm, retriever=retriever)
        session = Session(session_id="test_sess_001")
        session.documents["d1"] = DocumentInfo(doc_id="d1", filename="lease.txt", mime_type="text/plain", size_bytes=500)

        envelope = await runner.run_chain(
            agent_names=["ContextExtractor", "Simplifier"],
            session=session,
            intent="simplify",
        )

        assert envelope.session_id == "test_sess_001"
        assert envelope.intent == "simplify"
        assert len(envelope.artifacts) == 2
        assert envelope.disclaimer is not None
        assert "not legal advice" in envelope.disclaimer
        # Artifacts should be cached in session
        assert "context_card_enriched" in session.cached_artifacts
        assert "summary" in session.cached_artifacts

    async def test_run_chain_sse_events(self, fake_llm, retriever):
        """run_chain_sse streams status, artifact, and done events."""
        runner = OrchestratorRunner(llm_client=fake_llm, retriever=retriever)
        session = Session(session_id="test_sess_stream")
        session.documents["d1"] = DocumentInfo(doc_id="d1", filename="lease.txt", mime_type="text/plain", size_bytes=500)

        events = []
        async for event in runner.run_chain_sse(
            agent_names=["ContextExtractor", "Simplifier"],
            session=session,
            intent="simplify",
        ):
            events.append(event)

        event_types = [e["event"] for e in events]
        assert "status" in event_types
        assert "artifact" in event_types
        assert "done" in event_types

        artifact_events = [e for e in events if e["event"] == "artifact"]
        assert len(artifact_events) == 2

        # Check the 'done' event has disclaimer and stats
        done_event = next(e for e in events if e["event"] == "done")
        done_data = json.loads(done_event["data"])
        assert "disclaimer" in done_data
        assert done_data["llm_calls_used"] >= 1
