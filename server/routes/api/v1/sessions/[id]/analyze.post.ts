import { defineEventHandler, getRouterParam, readBody } from "h3";
import { generateLegalIntelligence, AnalysisInput } from "../../../../../utils/legalIntelligenceEngine";

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, "id") || "sess-default";
  const body = (await readBody(event).catch(() => ({}))) as AnalysisInput;
  return generateLegalIntelligence({
    ...body,
    session_id: sessionId,
  });
});
