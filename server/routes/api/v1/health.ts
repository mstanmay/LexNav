import { defineEventHandler } from "h3";

export default defineEventHandler(() => {
  return {
    status: "ok",
    version: "1.0.0",
    active_sessions: 0,
    service: "LexNav Legal Intelligence API (Vercel Production)",
    gemini: "Gemini 2.5 Flash Active",
  };
});
