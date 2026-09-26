"""
Orchestrator runner — executes agent chains sequentially.

Manages:
- Agent instantiation from names
- Sequential execution with output piping
- LLM call budget enforcement
- Advice filter on all outputs
- Disclaimer injection
- SSE event generation
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from app.agents.base import AgentInput, AgentOutput, BaseAgent
from app.agents.context_extractor import ContextExtractorAgent
from app.agents.simplifier import SimplifierAgent
from app.agents.clause_risk_analyzer import ClauseRiskAnalyzerAgent
from app.agents.comparator import ComparatorAgent
from app.agents.question_answerer import QuestionAnswererAgent
from app.agents.action_planner import ActionPlannerAgent
from app.agents.lawyer_brief_generator import LawyerBriefGeneratorAgent
from app.guardrails.advice_filter import filter_artifact
from app.guardrails.disclaimer import get_disclaimer
from app.llm.client import LLMClient, BudgetExhaustedError
from app.models.chunks import Chunk, Citation
from app.models.context_card import ContextCard
from app.models.envelope import ArtifactWrapper, ResponseEnvelope
from app.models.session import Session
from app.retrieval.retriever import Retriever

logger = logging.getLogger(__name__)

# Agent name → class mapping
AGENT_REGISTRY: dict[str, type[BaseAgent]] = {
    "ContextExtractor": ContextExtractorAgent,
    "Simplifier": SimplifierAgent,
    "ClauseRiskAnalyzer": ClauseRiskAnalyzerAgent,
    "Comparator": ComparatorAgent,
    "QuestionAnswerer": QuestionAnswererAgent,
    "ActionPlanner": ActionPlannerAgent,
    "LawyerBriefGenerator": LawyerBriefGeneratorAgent,
}


class OrchestratorRunner:
    """
    Executes an ordered list of agents, piping outputs forward.

    Each agent receives:
    - Retrieved chunks (from vector store)
    - Context card
    - Prior artifacts from upstream agents
    - User query (for QA)
    """

    def __init__(
        self,
        llm_client: LLMClient,
        retriever: Retriever,
        translation_service: Any = None,
    ) -> None:
        self._llm = llm_client
        self._retriever = retriever
        self._translation_service = translation_service

    async def run_chain(
        self,
        agent_names: list[str],
        session: Session,
        intent: str,
        user_query: str | None = None,
        request_id: str | None = None,
    ) -> ResponseEnvelope:
        """
        Execute a chain of agents and return the final ResponseEnvelope.

        Steps:
        1. Reset LLM budget
        2. Retrieve relevant chunks
        3. Run each agent in sequence, piping artifacts forward
        4. Apply advice filter to all artifacts
        5. Attach disclaimer
        """
        request_id = request_id or str(uuid.uuid4())

        # Reset LLM budget for this action
        self._llm.reset_budget()

        # Retrieve chunks
        doc_ids = session.context_card.doc_ids or list(session.documents.keys())
        retrieval_query = user_query or intent
        retrieval_result = await self._retriever.retrieve(
            session_id=session.session_id,
            query=retrieval_query,
            doc_ids=doc_ids if doc_ids else None,
        )
        chunks = retrieval_result.chunks

        # Build doc_id → filename mapping
        doc_filenames = {
            doc_id: info.filename
            for doc_id, info in session.documents.items()
        }

        # Collect prior artifacts (start with any cached ones)
        prior_artifacts: dict[str, Any] = dict(session.cached_artifacts)
        all_artifacts: list[ArtifactWrapper] = []
        all_citations: list[Citation] = []
        total_llm_calls = 0

        # Execute each agent
        for agent_name in agent_names:
            agent_class = AGENT_REGISTRY.get(agent_name)
            if not agent_class:
                logger.error("Unknown agent: %s", agent_name)
                continue

            agent = agent_class(self._llm)

            agent_input = AgentInput(
                context_card=session.context_card,
                chunks=chunks,
                prior_artifacts=prior_artifacts,
                user_query=user_query,
                doc_filenames=doc_filenames,
            )

            try:
                output = await agent.run(agent_input)
            except BudgetExhaustedError:
                logger.warning("Budget exhausted during %s", agent_name)
                break
            except Exception as e:
                logger.error("Agent %s failed: %s", agent_name, e)
                # Continue with remaining agents if possible
                continue

            # Apply advice filter to artifact
            filtered_artifact = filter_artifact(output.artifact)

            # Cache the artifact in session
            session.cached_artifacts[output.artifact_type] = filtered_artifact
            prior_artifacts[output.artifact_type] = filtered_artifact

            total_llm_calls += output.llm_calls_used
            all_citations.extend(output.citations)
            all_artifacts.append(ArtifactWrapper(
                artifact_type=output.artifact_type,
                artifact=filtered_artifact,
                confidence=output.confidence,
            ))

        # Track user query if it's a QA intent
        if user_query and intent == "qa":
            session.questions_asked.append(user_query)

        # Deduplicate citations
        seen_cids: set[str] = set()
        unique_citations: list[Citation] = []
        for cit in all_citations:
            if cit.chunk_id not in seen_cids:
                seen_cids.add(cit.chunk_id)
                unique_citations.append(cit)

        return ResponseEnvelope(
            session_id=session.session_id,
            request_id=request_id,
            intent=intent,
            context_card=session.context_card,
            artifacts=all_artifacts,
            citations=unique_citations,
            llm_calls_used=total_llm_calls,
            disclaimer=get_disclaimer(),
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    async def run_chain_sse(
        self,
        agent_names: list[str],
        session: Session,
        intent: str,
        user_query: str | None = None,
        request_id: str | None = None,
    ) -> AsyncIterator[dict[str, str]]:
        """
        Execute agents and yield SSE events.

        Event types:
        - status: progress updates
        - artifact: completed artifact
        - done: final summary with disclaimer
        - error: error information
        """
        request_id = request_id or str(uuid.uuid4())
        self._llm.reset_budget()

        # Yield status: starting
        yield {
            "event": "status",
            "data": json.dumps({
                "stage": "starting",
                "agent": agent_names[0] if agent_names else "none",
                "progress": 0,
                "total": len(agent_names),
            }),
        }

        # Retrieve chunks
        doc_ids = session.context_card.doc_ids or list(session.documents.keys())
        retrieval_query = user_query or intent
        retrieval_result = await self._retriever.retrieve(
            session_id=session.session_id,
            query=retrieval_query,
            doc_ids=doc_ids if doc_ids else None,
        )
        chunks = retrieval_result.chunks

        doc_filenames = {
            doc_id: info.filename
            for doc_id, info in session.documents.items()
        }

        yield {
            "event": "status",
            "data": json.dumps({
                "stage": "chunks_retrieved",
                "chunks_found": len(chunks),
                "low_evidence": retrieval_result.low_evidence,
            }),
        }

        prior_artifacts: dict[str, Any] = dict(session.cached_artifacts)
        all_citations: list[Citation] = []
        total_llm_calls = 0

        for i, agent_name in enumerate(agent_names):
            agent_class = AGENT_REGISTRY.get(agent_name)
            if not agent_class:
                continue

            yield {
                "event": "status",
                "data": json.dumps({
                    "stage": "running_agent",
                    "agent": agent_name,
                    "progress": i + 1,
                    "total": len(agent_names),
                }),
            }

            agent = agent_class(self._llm)
            agent_input = AgentInput(
                context_card=session.context_card,
                chunks=chunks,
                prior_artifacts=prior_artifacts,
                user_query=user_query,
                doc_filenames=doc_filenames,
            )

            try:
                output = await agent.run(agent_input)
            except BudgetExhaustedError:
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "error": "budget_exhausted",
                        "detail": f"LLM call budget exhausted during {agent_name}",
                    }),
                }
                break
            except Exception as e:
                yield {
                    "event": "error",
                    "data": json.dumps({
                        "error": "agent_error",
                        "detail": f"Agent {agent_name} failed: {str(e)}",
                    }),
                }
                continue

            filtered_artifact = filter_artifact(output.artifact)
            session.cached_artifacts[output.artifact_type] = filtered_artifact
            prior_artifacts[output.artifact_type] = filtered_artifact
            total_llm_calls += output.llm_calls_used
            all_citations.extend(output.citations)

            # Yield artifact event
            yield {
                "event": "artifact",
                "data": json.dumps({
                    "artifact_type": output.artifact_type,
                    "artifact": filtered_artifact,
                    "confidence": output.confidence,
                    "citations": [c.model_dump() for c in output.citations],
                }),
            }

        if user_query and intent == "qa":
            session.questions_asked.append(user_query)

        # Yield done event
        yield {
            "event": "done",
            "data": json.dumps({
                "llm_calls_used": total_llm_calls,
                "disclaimer": get_disclaimer(),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }),
        }
