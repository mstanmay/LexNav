import { defineEventHandler, readBody } from "h3";

interface AnalyzePayload {
  intent?: string;
  query?: string;
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as AnalyzePayload;
  return {
    intent: body?.intent || "qa",
    query: body?.query || "",
    status: "complete",
    service: "Google Gemini 2.5 Flash",
    disclaimer:
      "LexNav provides legal document intelligence and consultation preparation tools for informational purposes only. It is not legal advice.",
  };
});
