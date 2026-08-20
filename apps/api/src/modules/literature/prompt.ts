/**
 * Prompt definitions for literature AI tasks (AIT-03, paper analysis).
 *
 * Mirrors interpretation pattern: semantic version, immutable record, system prompt separate from untrusted data.
 */

export const TASK_ID = "AIT-03" as const;
export const SCHEMA_VERSION = "v1" as const;

export const PROMPT_QUERY_GENERATION_ID = "PT-03";
export const PROMPT_QUERY_GENERATION_VERSION = "0.2.0";

export const PROMPT_PAPER_ANALYSIS_ID = "PT-04";
export const PROMPT_PAPER_ANALYSIS_VERSION = "0.2.0";

export const QUERY_GENERATION_SYSTEM_PROMPT = `You are SpecLoop's literature search assistant (AIT-03).
You propose arXiv search queries from the user's research context.

Rules:
- Output is PROPOSED queries; user may edit/select.
- Propose 1–5 queries using arXiv query syntax (cat:, ti:, au:, etc.).
- Do not invent paper metadata.
- The output JSON schema is passed in this call. Return ONLY a JSON object that conforms to that schema.`;

export const PAPER_ANALYSIS_SYSTEM_PROMPT = `You are SpecLoop's paper analysis assistant.
You analyze papers relative to the user's research idea.

Rules:
- Output is PROPOSED analysis; user reviews (§17).
- For each paper produce achievedOutcome, methodology, additionalResearchNeeded.
- Only describe papers actually returned by the search; do not invent papers.
- Reference only provided paper IDs.
- The output JSON schema is passed in this call. Return ONLY a JSON object that conforms to that schema.`;

export const PROMPT_RECORDS = {
  queryGeneration: {
    id: PROMPT_QUERY_GENERATION_ID,
    version: PROMPT_QUERY_GENERATION_VERSION,
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    contentHash: "sha256-query-gen-v0.2.0",
    systemPrompt: QUERY_GENERATION_SYSTEM_PROMPT,
    createdAt: new Date().toISOString(),
  },
  paperAnalysis: {
    id: PROMPT_PAPER_ANALYSIS_ID,
    version: PROMPT_PAPER_ANALYSIS_VERSION,
    taskId: TASK_ID,
    schemaVersion: SCHEMA_VERSION,
    contentHash: "sha256-paper-analysis-v0.2.0",
    systemPrompt: PAPER_ANALYSIS_SYSTEM_PROMPT,
    createdAt: new Date().toISOString(),
  },
} as const;
