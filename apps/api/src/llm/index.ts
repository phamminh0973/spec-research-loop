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
export { type LlmConfig, loadLlmConfig } from "./config.js";
export {
  ARXIV_SORT_CRITERIA,
  type ArxivPaper,
  ArxivPaperSchema,
  type ArxivSearchInput,
  ArxivSearchInputSchema,
  type ArxivSearchOutput,
  ArxivSearchOutputSchema,
  type ArxivSortCriterion,
  arxivSearchLlmTool,
  arxivSearchTool,
  executeArxivSearch,
  executeLlmTool,
  findLlmTool,
  getArxivClient,
  type LlmTool,
  llmTools,
  resetArxivClient,
} from "./tools/index.js";
