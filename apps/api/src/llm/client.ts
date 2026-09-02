/**
 * Central OpenAI client for the SpecLoop API.
 *
 * This module is the single entry point through which every backend component
 * (tRPC procedures, background jobs, Judges) talks to the LLM provider. Keeping
 * the client in one place lets us enforce the cross-cutting policies from
 * `docs/04-ai-system-design.md` and `docs/08-risk-security-and-cost.md`:
 *
 *   - secrets are environment-managed and never logged;
 *   - requests have a bounded timeout and bounded retry count;
 *   - the provider/model is configurable without code changes;
 *   - a single SDK instance is reused across the process.
 *
 * The client is created lazily so that importing this module never fails on
 * its own — misconfiguration surfaces only when something actually tries to
 * use the LLM. This keeps health checks and non-LLM routes working in
 * environments without provider credentials (e.g. CI).
 */

import OpenAI from "openai";
import { type LlmConfig, loadLlmConfig } from "./config.js";

let cachedClient: OpenAI | undefined;
let cachedConfig: LlmConfig | undefined;

/**
 * Build (and memoize) the shared OpenAI client from the current environment.
 *
 * The configuration is read once per process; subsequent calls return the
 * same instance. Call {@link resetLlmClient} only in tests.
 */
export function getLlmClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const config = loadLlmConfig();
  cachedConfig = config;
  cachedClient = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    organization: config.organization,
    timeout: config.timeoutMs,
    maxRetries: config.maxRetries,
    // The SDK sends a default User-Agent; we keep it for traceability without
    // leaking any secret material.
    defaultHeaders: {
      "X-SpecLoop-Service": "specloop-api",
    },
  });
  return cachedClient;
}

/**
 * Return the configuration used to build the current client. Reads the
 * environment on first access and is then memoized alongside the client.
 */
export function getLlmConfig(): LlmConfig {
  if (cachedConfig) return cachedConfig;
  // Build the client to populate the cached config as a side effect.
  getLlmClient();
  return cachedConfig!;
}

/** Test-only escape hatch to drop the memoized client and config. */
export function resetLlmClient(): void {
  cachedClient = undefined;
  cachedConfig = undefined;
}
