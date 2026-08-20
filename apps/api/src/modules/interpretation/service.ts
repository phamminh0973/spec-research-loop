/**
 * Idea-interpretation service (AIT-01 / Bước 1 — Idea interpretation).
 *
 * Implements the structured-JSON-validation pipeline from
 * `docs/04-ai-system-design.md` §4:
 *
 *   build typed input → call provider requesting JSON output → parse JSON
 *   → validate Zod schema → if repairable schema error: one bounded repair
 *   attempt → persist accepted proposed output or terminal error
 *
 * Output is always `status: "PROPOSED"` (docs/04-ai-system-design.md §17,
 * BR-01 in docs/02-product-requirements.md): only the US-03 confirmation
 * gate — a later, separate application action — may move it to
 * `USER_CONFIRMED`. This module has no code path that sets that value.
 *
 * The LLM client/model are injectable so tests can supply a fake client
 * instead of calling a real provider (mirrors the pattern in
 * `../llm/tools/arxiv-search.ts`, where `executeArxivSearch` accepts an
 * optional `client`).
 */

import {
  InterpretationOutputSchema,
  InterpretIdeaInputSchema,
  type InterpretationOutput,
  type InterpretationRecord,
  type InterpretIdeaInput,
} from "@specloop/schemas";
import type OpenAI from "openai";
import { getLlmClient, getLlmConfig } from "../../llm/index.js";
import { structuredCall } from "../../llm/structured-call.js";
import {
  PROMPT_ID,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  buildInterpretationMessages,
} from "./prompt.js";

/** Provider label recorded on every interpretation call (single configurable OpenAI-compatible provider; docs/04-ai-system-design.md §1). */
const PROVIDER = "openai-compatible" as const;

export interface GenerateInterpretationDeps {
  /** Injectable client, defaults to the shared process client. */
  client?: OpenAI;
  /** Injectable model id, defaults to the configured `LLM_MODEL`. */
  model?: string;
}

/**
 * Terminal error for an interpretation call that never produced schema-valid
 * output within the bounded repair budget. Per §13, this is a terminal
 * status the user can retry/regenerate — not a silent fallback.
 */
export class InterpretationGenerationError extends Error {
  constructor(
    message: string,
    readonly retryCount: number,
    override readonly cause?: unknown
  ) {
    super(message);
    this.name = "InterpretationGenerationError";
  }
}

/**
 * Run AIT-01 for one confirmed input and return a `PROPOSED` interpretation
 * record. Never assigns `USER_CONFIRMED`.
 *
 * The provider call, JSON parsing, Zod validation, and the single bounded
 * repair attempt are delegated to the shared structured-output gateway
 * (`structuredCall`), which requests `json_schema` constrained output and
 * validates it against {@link InterpretationOutputSchema} application-side.
 *
 * @throws {InterpretationGenerationError} if the provider never returns
 *   schema-valid JSON within the bounded repair budget.
 */
export async function generateInterpretation(
  rawInput: InterpretIdeaInput,
  deps: GenerateInterpretationDeps = {}
): Promise<InterpretationRecord> {
  const input = InterpretIdeaInputSchema.parse(rawInput);
  const client = deps.client ?? getLlmClient();
  const model = deps.model ?? getLlmConfig().defaultModel;

  const messages = buildInterpretationMessages(input);
  let retryCount = 0;

  let output: InterpretationOutput;
  try {
    output = await structuredCall({
      client,
      model,
      systemPrompt: messages.system,
      userPrompt: messages.user,
      untrusted: messages.untrusted,
      outputSchema: InterpretationOutputSchema,
      schemaName: "interpretation_output",
      onRepair: () => {
        retryCount += 1;
      },
    });
  } catch (error) {
    throw new InterpretationGenerationError(
      "Idea interpretation failed to produce schema-valid output within the bounded repair budget.",
      retryCount,
      error
    );
  }

  return {
    interpretationId: crypto.randomUUID(),
    projectId: input.projectId,
    output,
    status: "PROPOSED",
    promptId: PROMPT_ID,
    promptVersion: PROMPT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    provider: PROVIDER,
    model,
    retryCount,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };
}
