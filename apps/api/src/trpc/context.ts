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
}

export function createContext(): ApiContext {
  return {
    requestId: crypto.randomUUID(),
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      displayName: "Demo User",
    },
    llm: getLlmClient(),
    llmConfig: getLlmConfig(),
  };
}
