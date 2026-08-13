/**
 * tRPC context factory.
 *
 * The context is constructed once per HTTP request and is available to every
 * procedure. P0 uses an in-memory demo user; real authentication will be
 * added in a follow-up ADR.
 *
 * The shared OpenAI client is attached lazily: it is created on first use and
 * reused across requests, so importing the context never fails when provider
 * credentials are absent (e.g. in CI or for non-LLM routes).
 */

import type OpenAI from "openai";
import {
  createInterpretationModule,
  generateInterpretation,
  interpretationRepository,
  type InterpretationModule,
} from "../interpretation/index.js";
import type { SpecStructureModule } from "../modules/spec-structure/spec-structure-module.js";
import { getLlmClient, getLlmConfig, type LlmConfig } from "../llm/index.js";

export interface ApiContext {
  requestId: string;
  user: {
    id: string;
    displayName: string;
  };
  /** Shared OpenAI-compatible client. Built lazily; see `apps/api/src/llm`. */
  llm: OpenAI;
  /** Resolved LLM configuration (model, timeout, retry, …). */
  llmConfig: LlmConfig;
  /** Optional Step 2 capability composition; absent processes fail closed. */
  specStructure?: SpecStructureModule;
  /** Step 1 interpretation/decision lifecycle for this API process. */
  interpretation?: InterpretationModule;
}

const runtimeInterpretationModule = createInterpretationModule({
  repository: interpretationRepository,
  generator: generateInterpretation,
});

export interface CreateContextInnerOptions {
  user?: ApiContext["user"];
  llm?: OpenAI;
  llmConfig?: LlmConfig;
  specStructure?: SpecStructureModule;
  interpretation?: InterpretationModule;
}

export function createContextInner(
  options: CreateContextInnerOptions = {}
): ApiContext {
  return {
    requestId: crypto.randomUUID(),
    user: options.user ?? {
      id: "00000000-0000-0000-0000-000000000001",
      displayName: "Demo User",
    },
    llm: options.llm ?? getLlmClient(),
    llmConfig: options.llmConfig ?? getLlmConfig(),
    interpretation: options.interpretation ?? runtimeInterpretationModule,
    ...(options.specStructure === undefined
      ? {}
      : { specStructure: options.specStructure }),
  };
}

export function createContext(): ApiContext {
  return createContextInner();
}
