import { defineEventHandler, readBody } from "h3";
import { generateLegalIntelligence, AnalysisInput } from "../../../utils/legalIntelligenceEngine";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as AnalysisInput;
  return generateLegalIntelligence(body);
});
