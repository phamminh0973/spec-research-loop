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
import { getLlmClient, getLlmConfig } from "../llm/index.js";
import {
  PROMPT_ID,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  buildInterpretationMessages,
  type InterpretationChatMessage,
} from "./prompt.js";

/** Provider label recorded on every interpretation call (single configurable OpenAI-compatible provider; docs/04-ai-system-design.md §1). */
const PROVIDER = "openai-compatible" as const;

/** Bounded repair attempts on invalid JSON/schema output (docs/04-ai-system-design.md §13: "One repair attempt within proposal's 1-2 limit"). */
const MAX_REPAIR_ATTEMPTS = 1;

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
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "InterpretationGenerationError";
  }
}

function extractContent(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): string {
  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("Provider returned an empty completion.");
  }
  return content;
}

function parseOutput(raw: string): InterpretationOutput {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Provider output was not valid JSON: ${(error as Error).message}`,
    );
  }
  return InterpretationOutputSchema.parse(json);
}

/**
 * Run AIT-01 for one confirmed input and return a `PROPOSED` interpretation
 * record. Never assigns `USER_CONFIRMED`.
 *
 * @throws {InterpretationGenerationError} if the provider never returns
 *   schema-valid JSON within the bounded repair budget.
 */
export async function generateInterpretation(
  rawInput: InterpretIdeaInput,
  deps: GenerateInterpretationDeps = {},
): Promise<InterpretationRecord> {
  const input = InterpretIdeaInputSchema.parse(rawInput);
  const client = deps.client ?? getLlmClient();
  const model = deps.model ?? getLlmConfig().defaultModel;

  const messages: InterpretationChatMessage[] =
    buildInterpretationMessages(input);
  let retryCount = 0;
  let lastError: unknown;

  while (retryCount <= MAX_REPAIR_ATTEMPTS) {
    if (retryCount > 0) {
      messages.push({
        role: "user",
        content:
          "Your previous response did not match the required JSON schema " +
          `(${String(lastError)}). Reply again with corrected JSON only, ` +
          "matching the same schema.",
      });
    }

    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
      });
      const output = parseOutput(extractContent(completion));

      return {
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
      };
    } catch (error) {
      lastError = error;
      retryCount += 1;
    }
  }

  throw new InterpretationGenerationError(
    "Idea interpretation failed to produce schema-valid output within the bounded repair budget.",
    retryCount - 1,
    lastError,
  );
}
