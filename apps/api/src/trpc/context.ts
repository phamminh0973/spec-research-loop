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
import { getLlmClient, getLlmConfig, type LlmConfig } from "../llm/index.js";
import { LlmDecompositionGenerator } from "../modules/decomposition/generator.js";
import { Step1ConfirmedInterpretationReader } from "../modules/decomposition/interpretation-reader-adapter.js";
import {
  createSpecStructureModule,
  type SpecStructureModule,
} from "../modules/decomposition/module.js";
import { InMemorySpecGraphStore } from "../modules/decomposition/repository.js";
import {
  createInterpretationModule,
  generateInterpretation,
  type InterpretationModule,
  interpretationRepository,
} from "../modules/interpretation/index.js";
import { getProjectById } from "../routers/projects.js";

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
  /** Step 2 capability composition; explicit undefined remains fail-closed in tests. */
  specStructure?: SpecStructureModule;
  /** Step 1 interpretation/decision lifecycle for this API process. */
  interpretation?: InterpretationModule;
}

const runtimeInterpretationModule = createInterpretationModule({
  repository: interpretationRepository,
  generator: generateInterpretation,
});

// P0 runtime persistence is process-scoped and replaceable. Keeping the store
// shared makes a graph created by one request visible to the next request;
// PostgreSQL remains a later persistence adapter.
const runtimeSpecGraphStore = new InMemorySpecGraphStore();

function createRuntimeSpecStructure(
  llm: OpenAI,
  llmConfig: LlmConfig
): SpecStructureModule {
  return createSpecStructureModule({
    reader: new Step1ConfirmedInterpretationReader(
      interpretationRepository,
      getProjectById
    ),
    generator: new LlmDecompositionGenerator({
      client: llm,
      model: llmConfig.defaultModel,
    }),
    store: runtimeSpecGraphStore,
  });
}

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
  const llm = options.llm ?? getLlmClient();
  const llmConfig = options.llmConfig ?? getLlmConfig();

  return {
    requestId: crypto.randomUUID(),
    user: options.user ?? {
      id: "00000000-0000-4000-8000-000000000001",
      displayName: "Demo User",
    },
    llm,
    llmConfig,
    interpretation: options.interpretation ?? runtimeInterpretationModule,
    specStructure:
      options.specStructure ?? createRuntimeSpecStructure(llm, llmConfig),
  };
}

export function createContext(): ApiContext {
  return createContextInner();
}
