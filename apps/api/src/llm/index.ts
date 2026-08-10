/**
 * Public surface of the SpecLoop LLM module.
 *
 * Import `getLlmClient` from anywhere in the backend to obtain the shared
 * OpenAI-compatible client. Configuration is environment-driven; see
 * `./config.ts` and `.env.example` for the supported variables.
 *
 * LLM tools (OpenAI-format function-calling tools paired with
 * application-side executors) live under `./tools/` and are re-exported
 * here. The model only emits structured arguments; the executor is the
 * single place that performs the underlying action (see
 * `docs/04-ai-system-design.md` §16).
 */

export { getLlmClient, getLlmConfig, resetLlmClient } from "./client.js";
export { loadLlmConfig, type LlmConfig } from "./config.js";
export {
  llmTools,
  findLlmTool,
  executeLlmTool,
  arxivSearchTool,
  arxivSearchLlmTool,
  executeArxivSearch,
  getArxivClient,
  resetArxivClient,
  ARXIV_SORT_CRITERIA,
  ArxivSearchInputSchema,
  ArxivSearchOutputSchema,
  ArxivPaperSchema,
  type ArxivSearchInput,
  type ArxivSearchOutput,
  type ArxivPaper,
  type ArxivSortCriterion,
  type LlmTool,
} from "./tools/index.js";
