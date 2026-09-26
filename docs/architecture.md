# LexNav Architecture & System Design

## 1. High-Level Architecture
LexNav is structured as a context-aware legal document intelligence engine that couples an accessible frontend dashboard with specialized AI agents powered by Google Gemini 2.5 Flash and Google Cloud services.

```
+-------------------------------------------------------------------------+
|                              USER CLIENT                                |
|  - TanStack Start / React 19 / Tailwind v4 Dashboard                    |
|  - Role / Jurisdiction / Urgency Context Selection                     |
|  - Multi-Document Ingestion (.pdf, .docx, .txt, .md)                    |
|  - Interactive Tabs: Overview, Risk Radar, Timeline, Compare, Q&A, Brief |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                        API & INGESTION PIPELINE                         |
|  - RateLimitingMiddleware (sliding window)                             |
|  - RequestId & PII Scrubber Middleware                                 |
|  - Google Cloud Document AI / Vision OCR Engine                         |
|  - Google Cloud Translation API (Multilingual Support)                  |
|  - Legal Clause & Boundary Chunker (regex + structural tags)           |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                      ORCHESTRATOR & VECTOR STORE                        |
|  - Ephemeral In-Memory ChromaDB (cosine similarity, MMR retrieval)      |
|  - Dynamic Intent Router (simplify, risks, compare, qa, checklist, etc)|
|  - Agent Budget Manager (MAX_LLM_CALLS_PER_ACTION = 5)                  |
|  - Ephemeral Session Manager (TTL = 30 min, 1-click purge)             |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  GOOGLE GEMINI 2.5 FLASH MULTI-AGENT MESH               |
|  1. ContextExtractorAgent: Extracts parties, dates, governing law       |
|  2. SimplifierAgent: Generates 8th-grade plain-language summaries      |
|  3. ClauseRiskAnalyzerAgent: Flags obligations, unusual clauses, risks  |
|  4. ComparatorAgent: Cross-document inconsistency & difference matrix   |
|  5. QuestionAnswererAgent: Grounded document Q&A with citations         |
|  6. ActionPlannerAgent: Option-framed next steps (strictly non-advice)  |
|  7. LawyerBriefGeneratorAgent: Prepares 1-page consultation brief       |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                       LEGAL SAFETY GUARDRAILS                           |
|  - Sandboxed <document_data> prompt injection shield                    |
|  - AdviceFilter: Scans and neutralizes directive phrasing               |
|  - Quotation Exemption: Protects verbatim contractual text              |
|  - Mandatory Disclaimer Injector: Appends legal safety notice           |
+-------------------------------------------------------------------------+
```

## 2. Key Design Decisions

### A. Information Only, Never Advice
The legal AI safety guardrail operates at two layers:
1. **Prompt System Directives**: System prompts strictly constrain agents to option-oriented language (*"Options to consider include..."*, *"One consideration is..."*). Directive verbs (*"You must"*, *"You should"*, *"File an appeal"*) and outcome predictions (*"You will win"*) are banned.
2. **Post-Processing Advice Filter**: Regular expression and semantic scanner inspects all generated outputs. If directive language is detected, it is neutralized. Direct quotes enclosed in quotation marks are exempted so the user can see exact contractual language.

### B. Ephemeral Session Lifecycle
Legal documents are highly confidential. LexNav maintains **zero long-term persistence**:
- Ingested files and parsed chunks are stored in in-memory ChromaDB instances tied to a unique `session_id`.
- Ephemeral Google Cloud Storage blobs are tagged with auto-purge lifecycle policies.
- Sessions automatically expire after 30 minutes of inactivity.
- Users can trigger immediate memory deletion via the "Purge Session" action.

### C. Grounded Citations & Fail-Closed Retrieval
Hallucination in legal assistance is unacceptable. LexNav enforces:
- Minimum relevance threshold on vector similarity.
- When an inquiry asks about a topic not mentioned in the documents (e.g. asking about pet fees in a lease that has no pet clause), the system explicitly returns **"Insufficient Document Evidence"** rather than speculating.
- Every valid answer links to Document Name, Section/Clause, Page Number, and Verbatim Quote.
