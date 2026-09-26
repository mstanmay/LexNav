# LexNav Testing Strategy & Verification Report

## 1. Test Suite Overview
LexNav incorporates comprehensive offline and mock-enabled test suites covering backend agents, Google Cloud services, pipelines, guardrails, API endpoints, and frontend TypeScript contracts.

### Test Metrics Summary
- **Backend (Python / pytest)**: **49 passing tests** across 6 test suites (`0.27s` execution time, 100% pass rate).
- **Frontend / Scripts (Node / node:test)**: **55 passing tests** across 16 test suites (`0.39s` execution time, 100% pass rate).
- **TypeScript Static Verification**: `tsc --noEmit` exits **0** with zero errors.
- **Production Bundle**: `npm run build` succeeds cleanly via Vite + Nitro Vercel preset.

---

## 2. Test Suites Detail

### A. Google Cloud & Gemini Services (`lexnav/tests/test_google_services.py`)
- **Document AI / Vision OCR**: Verifies local parsing fallback when cloud credentials are omitted, structural token extraction, and error handling.
- **Google Translation Service**: Tests language code routing and mock translation.
- **Ephemeral GCS Service**: Tests signed URL generation and TTL auto-purge lifecycle.
- **Gemini Client Budgeting**: Validates token budgeting (`MAX_LLM_CALLS_PER_ACTION = 5`) and structured schema extraction.

### B. Legal Safety & Guardrails (`lexnav/tests/test_guardrails.py`)
- **Advice Filter**: Confirms directive phrases (*"you should"*, *"you must"*, *"do not sign"*) are intercepted and rewritten.
- **Quotation Exemption**: Ensures direct quotes from contracts are never censored or modified.
- **Disclaimer Injection**: Confirms every API response envelope contains the mandatory disclaimer.
- **Input Sanitization**: Tests length clamping, control character stripping, and prompt injection defense.

### C. Pipeline & Document Chunking (`lexnav/tests/test_pipeline.py`)
- **Multi-Format Extraction**: Validates PDF, DOCX, TXT, and Markdown parsing.
- **Clause Boundary Detection**: Ensures section headers (§, Article, Clause) split cleanly into discrete chunks with overlap.
- **File Validation**: Tests file size limits (<10MB) and extension whitelisting.

### D. Multi-Agent Reasoning (`lexnav/tests/test_agents.py`)
- Verifies that all 7 Gemini agents (ContextExtractor, Simplifier, ClauseRiskAnalyzer, Comparator, QuestionAnswerer, ActionPlanner, LawyerBriefGenerator) adhere to strictly typed Pydantic v2 schemas.

### E. Orchestrator & Intent Routing (`lexnav/tests/test_orchestrator.py`)
- Tests automatic intent resolution (`simplify`, `risks`, `compare`, `qa`, `checklist`, `brief`).
- Verifies inter-turn caching of document summaries to prevent redundant LLM invocations.

### F. API Endpoints & SSE Streaming (`lexnav/tests/test_api.py`)
- Tests `/api/v1/sessions` creation and deletion.
- Tests `/api/v1/sessions/{id}/documents` multipart file ingestion.
- Tests `/api/v1/sessions/{id}/analyze` Server-Sent Events (SSE) streaming output.
