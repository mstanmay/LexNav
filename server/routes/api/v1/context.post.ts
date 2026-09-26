import { defineEventHandler, readBody } from "h3";

interface ContextBody {
  role?: string;
  jurisdiction?: string;
  urgency?: string;
  target_language?: string;
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as ContextBody;

  return {
    status: "context_updated",
    context_card: {
      role: body.role || "tenant",
      jurisdiction: body.jurisdiction || "IN-MH",
      urgency: body.urgency || "critical",
      target_language: body.target_language || "en",
    },
    updated_at: new Date().toISOString(),
  };
});
