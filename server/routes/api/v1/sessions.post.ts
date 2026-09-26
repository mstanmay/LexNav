import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
  const sessionId = "sess-" + Math.random().toString(36).substring(2, 10);
  return {
    session_id: sessionId,
    created_at: new Date().toISOString(),
    ttl_seconds: 1800,
    endpoints: {
      documents: `/api/v1/sessions/${sessionId}/documents`,
      context: `/api/v1/sessions/${sessionId}/context`,
      analyze: `/api/v1/sessions/${sessionId}/analyze`,
    },
  };
});
