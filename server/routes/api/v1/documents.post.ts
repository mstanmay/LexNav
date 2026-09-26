import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
  const docId = `doc-${Math.random().toString(36).substring(2, 8)}`;
  return {
    doc_id: docId,
    filename: "Uploaded_Document.pdf",
    pages: 3,
    word_count: 1420,
    ocr_engine: "Google Cloud Document AI v1",
    status: "indexed",
    boundary_detected: true,
    clauses_extracted: 6,
    created_at: new Date().toISOString(),
  };
});
