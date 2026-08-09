/**
 * LLM provider configuration.
 *
 * SpecLoop ships with a single configurable LLM provider (per the approved
 * proposal and `docs/04-ai-system-design.md` §1). The provider is OpenAI-compatible:
 * the official `openai` SDK is used with an optional `baseURL` override so a
 * local or OpenAI-compatible endpoint can be pointed at without code changes.
 *
 * All secrets come from the environment via `apps/api/src/env.ts` (validated
 * with `@t3-oss/env-core`) and are never committed or logged. Missing or
 * invalid configuration is reported at process start by t3-env rather than
 * silently defaulted to a paid endpoint, so the demo cannot accidentally
 * spend budget.
 */

import { env } from "../env.js";

export interface LlmConfig {
  /** API key used by the OpenAI SDK. Never logged. */
  apiKey: string;
  /**
   * Optional OpenAI-compatible base URL. When unset the SDK targets the
   * public OpenAI API. Set this for local gateways or compatible providers.
   */
  baseURL: string | undefined;
  /** Default model id, e.g. `gpt-4o-mini`. Overridable per call. */
  defaultModel: string;
  /** Organization/project headers when the provider requires them. */
  organization: string | undefined;
  /** Request timeout in milliseconds. Bounded per AI design §13. */
  timeoutMs: number;
  /** Maximum retry attempts for transient failures. Bounded per AI design §13. */
  maxRetries: number;
}

/**
 * Build the LLM configuration from the validated environment.
 *
 * t3-env has already validated and coerced every variable by the time this
 * runs, so this function is a pure projection from `env` to `LlmConfig` —
 * no manual parsing, defaults, or error throwing here.
 */
export function loadLlmConfig(): LlmConfig {
  return {
    apiKey: env.OPENAI_API_KEY,
    baseURL: env.OPENAI_BASE_URL,
    defaultModel: env.LLM_MODEL,
    organization: env.OPENAI_ORGANIZATION,
    timeoutMs: env.LLM_TIMEOUT_MS,
    maxRetries: env.LLM_MAX_RETRIES,
  };
}
