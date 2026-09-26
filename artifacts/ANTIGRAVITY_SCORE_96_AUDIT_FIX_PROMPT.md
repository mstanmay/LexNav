# ANTIGRAVITY SCORE 96+ AUDIT & FIX SPECIFICATION

> **Target**: Elevate LexNav from 92.73 (#553 / 1004) to **96.5+ (Top 100)** before submission deadline.
> **Core Strategy**: Raise the two underperforming axes (**Google Services: 75 → 98+**, **Code Quality: 86 → 98+**), while strictly preserving **Efficiency (100)**, **Security (98)**, and **Alignment (97)**.

---

## 1. Score Breakdown & Root Cause Diagnosis

| Evaluation Axis | Current Score | Target Score | Diagnosis & Action Plan |
|---|:---:|:---:|---|
| **Google Services** | **75** | **98+** | **CRITICAL DEFICIT**. The grader penalizes non-Google models or lack of Google Cloud APIs. Replace OpenAI with **Google Gemini (`gemini-2.5-flash`)** as the primary brain. Wire **Google Cloud Document AI / Vision** for OCR, **Google Cloud Translation API** for multilingual legal access, and **Google Cloud Storage (GCS)** for ephemeral storage with strict TTL lifecycle rules. No dead imports. |
| **Code Quality** | **86** | **98+** | **HIGH IMPACT**. Remove legacy OpenAI references and dead code. Enforce strict Pydantic v2 schemas and full typing across all routes and agents. Ensure `README.md` perfectly matches active routes, live imports, and architecture. |
| **Testing** | **94** | **98+** | Provide full offline test coverage with `FakeGeminiClient` and Google Service mocks. Ensure `pytest` executes in under 2 seconds with 100% pass rate. |
| **Accessibility** | **96** | **98** | Plain-language rewriting (8th grade reading level), bilingual / translated outputs, WCAG semantic markup. |
| **Security** | **98** | **98+** | **PROTECT**. Keep untrusted document sandboxing (`<document_data>`), advice filter with quotation exemption, mandatory disclaimer, and PII log scrubbing. |
| **Efficiency** | **100** | **100** | **PROTECT**. Ephemeral memory, in-memory ChromaDB vector store, token budgeting, <0.5 MB repo footprint. |
| **Problem Alignment** | **97** | **99** | **PROTECT**. Full coverage of all 7 PromptWars flows: Simplify, Compare, Clause Risk Analysis, Cited Q&A, Action Checklist, Lawyer Brief, and Context Card. |

---

## 2. PromptWars Use-Case Audit & Live Route Verification

Every PromptWars required flow is mapped to an active running route and Gemini agent:

| Flow / Requirement | Route & Method | Active Agent / Engine | Google Services Utilized |
|---|---|---|---|
| **1. Session Lifecycle** | `POST /api/v1/sessions`<br>`DEL /api/v1/sessions/{id}` | `SessionManager` | Ephemeral TTL cleanup, GCS lifecycle purge |
| **2. Document Ingestion** | `POST /api/v1/sessions/{id}/documents` | `extractor.py`<br>`chunker.py` | **Google Document AI / Vision OCR** + local fallback |
| **3. Context Card Setup** | `POST /api/v1/sessions/{id}/context` | `ContextCard` model | Scopes jurisdiction, language, role, urgency |
| **4. Simplify Document** | `POST /api/v1/sessions/{id}/analyze` (`intent=simplify`) | `SimplifierAgent` | **Gemini 2.5 Flash** (8th-grade reading level) |
| **5. Contract Comparison** | `POST /api/v1/sessions/{id}/analyze` (`intent=compare`) | `ComparatorAgent` | **Gemini 2.5 Flash** (cross-document differences) |
| **6. Highlight Clause Risks** | `POST /api/v1/sessions/{id}/analyze` (`intent=risks`) | `ClauseRiskAnalyzerAgent` | **Gemini 2.5 Flash** (obligation & risk ratings) |
| **7. Cited Document Q&A** | `POST /api/v1/sessions/{id}/analyze` (`intent=qa`) | `QuestionAnswererAgent` | **Gemini 2.5 Flash** (grounded retrieval + citations) |
| **8. Options & Next Steps** | `POST /api/v1/sessions/{id}/analyze` (`intent=checklist`) | `ActionPlannerAgent` | **Gemini 2.5 Flash** (neutral considerations) |
| **9. Lawyer-Prep Brief** | `POST /api/v1/sessions/{id}/analyze` (`intent=brief`) | `LawyerBriefGeneratorAgent` | **Gemini 2.5 Flash** (case & risk compilation) |
| **10. Multilingual Access** | Automatic when `language != "en"` | `GoogleTranslationService` | **Google Cloud Translation API** |
| **11. Guardrails & Safety** | Applied to every response envelope | `AdviceFilter`<br>`Disclaimer` | Quotation exemption, non-directive rewriting |

---

## 3. Architecture Specification for Google Services Integration

### 3.1 Primary Brain: Google Gemini Client
```python
# app/llm/client.py
from google import genai
from google.genai import types

class GeminiClient:
    """Native Google Gemini client using gemini-2.5-flash with structured JSON output."""
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self._client = genai.Client(api_key=api_key)
        self._model = model
        self._call_count = 0
        self._max_calls = 4
```

### 3.2 Document Processing: Google Cloud Document AI / Vision
- Ingests scanned contracts, PDF agreements, and multi-column notices.
- Performs text layout analysis and table boundary extraction.
- Offline graceful fallback to pure Python extraction if GCP credentials are not injected.

### 3.3 Multilingual Access: Google Cloud Translation
- Supports instant plain-language translations for underrepresented communities and tenants.
- Integrates directly into the orchestrator runner before finalizing the response envelope.

### 3.4 Storage & Security: Ephemeral GCS with Auto-Purge TTL
- Real-time temporary document streaming via signed URLs.
- Zero persistent storage of sensitive legal documents; automatic reaping upon session deletion or TTL expiry (default: 30 minutes).

---

## 4. Antigravity Verification & Testing Protocol

To verify readiness for submission:
1. **Dependency Audit**:
   ```bash
   pip install -r requirements.txt
   ```
2. **Execute Full Test Suite**:
   ```bash
   python -m pytest tests/ -v
   ```
   *Expected Result: 44+ tests passing, 0 failures, execution time < 2.0s.*
3. **Smoke Test Server Boot**:
   ```bash
   python -c "from app.main import app; print('App verified:', app.title)"
   ```
4. **Footprint Check**:
   ```bash
   Get-ChildItem -Path . -Recurse | Measure-Object -Property Length -Sum
   ```
   *Must be < 1.0 MB (PromptWars threshold is 10 MB).*
