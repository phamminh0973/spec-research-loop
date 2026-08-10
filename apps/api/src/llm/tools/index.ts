/**
 * Public surface of the SpecLoop LLM tools module.
 *
 * Each tool here is an OpenAI-format function-calling tool paired with an
 * application-side executor. The model only emits structured arguments;
 * the executor is the single place that performs the underlying action
 * (see `docs/04-ai-system-design.md` §16 — the model has no direct tool
 * execution authority).
 *
 * Import {@link llmTools} to obtain the array of OpenAI tool definitions
 * for a chat-completions request, and {@link executeLlmTool} to dispatch a
 * model-returned tool call to its executor.
 */

export {
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
} from "./arxiv-search.js";

import { arxivSearchLlmTool, type LlmTool } from "./arxiv-search.js";

/**
 * All LLM tools currently exposed to the model. Pass this array directly
 * to `openai.chat.completions.create({ tools: llmTools.map(t => t.definition) })`.
 */
export const llmTools: LlmTool[] = [arxivSearchLlmTool];

/**
 * Look up a tool by its OpenAI function name.
 */
export function findLlmTool(name: string): LlmTool | undefined {
  return llmTools.find((t) => t.definition.function.name === name);
}

/**
 * Execute a tool call returned by the model.
 *
 * @param name  The `tool_calls[i].function.name` value from the model.
 * @param args  The raw `tool_calls[i].function.arguments` JSON string or
 *              already-parsed object. Validated by the tool's input schema.
 * @returns    The tool result object, to be JSON-stringified into the
 *              `tool` role message sent back to the model.
 * @throws {Error} if `name` is not a registered tool.
 * @throws {z.ZodError} if `args` fail schema validation.
 */
export async function executeLlmTool(
  name: string,
  args: unknown,
): Promise<unknown> {
  const tool = findLlmTool(name);
  if (!tool) {
    throw new Error(`Unknown LLM tool: ${name}`);
  }
  return tool.execute(args);
}
