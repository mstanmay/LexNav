import test from "node:test";
import assert from "node:assert/strict";
import { generateLegalIntelligence } from "../server/utils/legalIntelligenceEngine.ts";

test("Legal Intelligence Engine: all Problem Statement flows", async (t) => {
  await t.test("simplifier produces plain-language summary with 8th-grade reading level", () => {
    const res = generateLegalIntelligence({ intent: "simplify" });
    assert.equal(res.intent, "simplify");
    assert.ok(res.disclaimer.includes("informational purposes only"));
    assert.equal(res.service, "Google Gemini 2.5 Flash");
    const summary = res.artifacts.find((a) => a.artifact_type === "summary");
    assert.ok(summary, "summary artifact must exist");
    assert.equal(summary.artifact.reading_level, "8th grade");
    assert.ok(summary.artifact.sections.length >= 3);
    assert.ok(summary.artifact.key_dates.length >= 2);
    assert.ok(summary.artifact.key_amounts.length >= 2);
  });

  await t.test("risk analyzer extracts critical clauses with verbatim quotes and obligations", () => {
    const res = generateLegalIntelligence({ intent: "risks" });
    const clauses = res.artifacts.find((a) => a.artifact_type === "clauses");
    assert.ok(clauses, "clauses artifact must exist");
    assert.ok(clauses.artifact.clauses.length >= 4);
    assert.ok(clauses.artifact.risk_summary.top_concerns.length >= 3);
    assert.ok(res.citations.length >= 2, "evidence citations must be returned");
  });

  await t.test("comparator analyzes cross-document contradictions and liability shifts", () => {
    const res = generateLegalIntelligence({ intent: "compare" });
    const comparison = res.artifacts.find((a) => a.artifact_type === "comparison");
    assert.ok(comparison, "comparison artifact must exist");
    assert.ok(comparison.artifact.differences.length >= 3);
    assert.ok(comparison.artifact.inconsistencies.length >= 2);
    assert.ok(comparison.artifact.overall_assessment.includes("Conflict"));
  });

  await t.test("grounded Q&A grounds answers in verbatim quotes with exact citations", () => {
    const res = generateLegalIntelligence({
      intent: "qa",
      query: "Can the landlord enter without 24 hours prior notice?",
    });
    const qa = res.artifacts.find((a) => a.artifact_type === "qa");
    assert.ok(qa, "qa artifact must exist");
    assert.equal(qa.confidence, "high");
    assert.ok(qa.artifact.answer_text.includes("Section 12.4"));
    assert.ok(res.citations.length >= 1);
  });

  await t.test("grounded Q&A fails closed on missing evidence (pet fee query)", () => {
    const res = generateLegalIntelligence({
      intent: "qa",
      query: "What is the pet deposit fee in the lease?",
    });
    const qa = res.artifacts.find((a) => a.artifact_type === "qa");
    assert.ok(qa, "qa artifact must exist");
    assert.equal(qa.confidence, "insufficient");
    assert.ok(qa.artifact.answer_text.includes("Insufficient Document Evidence"));
  });

  await t.test("checklist formats next steps non-directively as options ('Consider...')", () => {
    const res = generateLegalIntelligence({ intent: "checklist" });
    const checklist = res.artifacts.find((a) => a.artifact_type === "checklist");
    assert.ok(checklist, "checklist artifact must exist");
    for (const item of checklist.artifact.items) {
      assert.ok(
        item.description.startsWith("Consider"),
        `Action "${item.description}" must start with 'Consider'`,
      );
    }
  });

  await t.test("brief generates lawyer-ready brief with 5 attorney questions", () => {
    const res = generateLegalIntelligence({ intent: "brief" });
    const brief = res.artifacts.find((a) => a.artifact_type === "brief");
    assert.ok(brief, "brief artifact must exist");
    assert.ok(brief.artifact.suggested_discussion_points.length === 5);
    assert.ok(brief.artifact.timeline.length >= 3);
  });

  await t.test("mandatory legal disclaimer is present in every response envelope", () => {
    for (const intent of ["simplify", "risks", "compare", "qa", "checklist", "brief", "auto"]) {
      const res = generateLegalIntelligence({ intent });
      assert.ok(res.disclaimer && res.disclaimer.length > 50);
      assert.ok(res.disclaimer.includes("informational purposes only"));
    }
  });
});
