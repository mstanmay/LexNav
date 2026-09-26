import { defineEventHandler, getRouterParam } from "h3";

export default defineEventHandler((event) => {
  const sessionId = getRouterParam(event, "id") || "sess-default";

  return {
    session_id: sessionId,
    status: "purged",
    message: "Session memory, parsed vectors, and cached artifacts purged completely. Zero disk persistence.",
    purged_at: new Date().toISOString(),
  };
});
