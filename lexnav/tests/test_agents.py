"""
Tests for all LexNav agents with Fake LLM:
- ContextExtractor
- Simplifier
- ClauseRiskAnalyzer
- Comparator
- QuestionAnswerer
- ActionPlanner
- LawyerBriefGenerator
"""

from __future__ import annotations

import pytest

from app.models.context_card import ContextCard
from app.models.chunks import Chunk
from app.agents.base import AgentInput
from app.agents import (
    ContextExtractorAgent,
    SimplifierAgent,
    ClauseRiskAnalyzerAgent,
    ComparatorAgent,
    QuestionAnswererAgent,
    ActionPlannerAgent,
    LawyerBriefGeneratorAgent,
)


@pytest.fixture
def sample_context():
    return ContextCard(
        user_role="tenant",
        jurisdiction="US-CA",
        issue_type="lease-dispute",
        urgency="medium",
    )


@pytest.fixture
def sample_chunks():
    return [
        Chunk(
            chunk_id="chunk_001",
            doc_id="doc_lease",
            text="RESIDENTIAL LEASE AGREEMENT. Parties: Sunrise Properties LLC (Landlord) and Jane Smith (Tenant).",
            char_start=0,
            char_end=95,
            page_number=1,
            section_ref="Title & Parties",
        ),
        Chunk(
            chunk_id="chunk_002",
            doc_id="doc_lease",
            text="Section 3: Rent is $2,500 per month due on the 1st. Late fee of $150 after the 5th.",
            char_start=96,
            char_end=180,
            page_number=1,
            section_ref="Section 3",
        ),
        Chunk(
            chunk_id="chunk_003",
            doc_id="doc_lease",
            text="Section 7.2: Landlord may terminate this lease with 30 days written notice for any reason.",
            char_start=181,
            char_end=275,
            page_number=2,
            section_ref="Section 7.2",
        ),
    ]


@pytest.mark.asyncio
class TestAgents:
    """Integration test suite for individual agents using fake LLM client."""

    async def test_context_extractor(self, fake_llm, sample_context, sample_chunks):
        agent = ContextExtractorAgent(llm_client=fake_llm)
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "context_card_enriched"
        assert "parties" in output.artifact
        assert output.artifact["detected_jurisdiction"] == "US-CA"
        assert output.confidence in ["high", "medium"]
        assert output.llm_calls_used >= 1

    async def test_simplifier(self, fake_llm, sample_context, sample_chunks):
        agent = SimplifierAgent(llm_client=fake_llm)
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "summary"
        assert "plain_language" in output.artifact
        assert "sections" in output.artifact
        assert len(output.artifact["sections"]) > 0
        assert output.artifact["reading_level"] is not None

    async def test_clause_risk_analyzer(self, fake_llm, sample_context, sample_chunks):
        agent = ClauseRiskAnalyzerAgent(llm_client=fake_llm)
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "clauses"
        assert "clauses" in output.artifact
        clauses = output.artifact["clauses"]
        assert len(clauses) > 0
        assert any(c.get("risk_level") in ["info", "warning", "high"] for c in clauses)

    async def test_comparator(self, fake_llm, sample_context, sample_chunks):
        agent = ComparatorAgent(llm_client=fake_llm)
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "comparison"
        assert "differences" in output.artifact

    async def test_question_answerer(self, fake_llm, sample_context, sample_chunks):
        agent = QuestionAnswererAgent(llm_client=fake_llm)
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            user_query="Can the landlord terminate without cause?",
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "answer"
        assert "answer_text" in output.artifact
        assert len(output.artifact["answer_text"]) > 10

    async def test_action_planner(self, fake_llm, sample_context, sample_chunks):
        agent = ActionPlannerAgent(llm_client=fake_llm)
        prior_clauses = {
            "clauses": [
                {
                    "clause_id": "c1",
                    "clause_ref": "Section 7.2",
                    "risk_level": "warning",
                    "explanation": "Landlord can terminate with 30 days notice.",
                }
            ]
        }
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            prior_artifacts={"clauses": prior_clauses},
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "checklist"
        assert "items" in output.artifact
        items = output.artifact["items"]
        assert len(items) > 0

    async def test_lawyer_brief_generator(self, fake_llm, sample_context, sample_chunks):
        agent = LawyerBriefGeneratorAgent(llm_client=fake_llm)
        prior_artifacts = {
            "summary": {"plain_language": "A 1-year lease with Sunrise Properties."},
            "clauses": {"clauses": [{"clause_ref": "7.2", "risk_level": "warning"}]},
        }
        agent_input = AgentInput(
            context_card=sample_context,
            chunks=sample_chunks,
            prior_artifacts=prior_artifacts,
            doc_filenames={"doc_lease": "lease.txt"},
        )
        output = await agent.run(agent_input)

        assert output.artifact_type == "lawyer_brief"
        assert "case_summary" in output.artifact
