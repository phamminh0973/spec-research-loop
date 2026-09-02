/**
 * Centralized, typesafe environment validation for the SpecLoop API.
 *
 * Uses `@t3-oss/env-core` so that every environment variable is declared in one
 * place, validated with Zod at process start, and surfaced as a typed
 * `env.*` accessor. This replaces ad-hoc `process.env.X` reads scattered
 * across the codebase and gives us a single failure point with a clear
 * "Invalid environment variables" message when configuration is wrong.
 *
 * Only server-side variables live here (the API never runs in a browser).
 * Secrets such as `OPENAI_API_KEY` are validated for presence but never logged.
 *
 * See `docs/04-ai-system-design.md` §1 (single configurable LLM provider)
 * and `docs/08-risk-security-and-cost.md` RSK-12 (secret leakage) for the
 * policies this module enforces.
 */

import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // ------------------------------------------------------------------
    // HTTP server
    // ------------------------------------------------------------------
    API_PORT: z.coerce.number().int().positive().default(4000),
    API_HOST: z.string().default("0.0.0.0"),
    WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

    // ------------------------------------------------------------------
    // LLM provider (OpenAI-compatible) — see apps/api/src/llm
    // ------------------------------------------------------------------
    /** Required. Never logged. */
    OPENAI_API_KEY: z.string().min(1),
    /** Default model id, e.g. `gpt-4o-mini`. Overridable per call. */
    LLM_MODEL: z.string().min(1),
    /** Optional OpenAI-compatible gateway. Empty/absent → public OpenAI API. */
    OPENAI_BASE_URL: z.string().url().optional(),
    /** Optional organization/project header. */
    OPENAI_ORGANIZATION: z.string().optional(),
    /** Bounded request timeout in ms (AI design §13). */
    LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    /** Bounded retry count for transient failures (AI design §13). */
    LLM_MAX_RETRIES: z.coerce.number().int().positive().default(2),

    // ------------------------------------------------------------------
    // Persistence (apps/api/src/db) — Drizzle ORM + SQLite.
    // When `DATABASE_PATH` is set, SQLite is file-backed at that path.
    // When unset, an in-memory SQLite database (`:memory:`) is used —
    // every store still persists via Drizzle, just without durability
    // across restarts (which is exactly the mode all vitest suites run
    // in). `DATABASE_URL` is kept as a deprecated alias for backwards
    // compatibility but `DATABASE_PATH` takes precedence.
    // ------------------------------------------------------------------
    DATABASE_PATH: z.string().min(1).optional(),
    DATABASE_URL: z.string().optional(),
    DB_FILE_NAME: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  // Treat `VAR=` (empty string) as unset so Zod defaults/optionals apply
  // correctly — e.g. `OPENAI_BASE_URL=` resolves to `undefined`.
  emptyStringAsUndefined: true,
});

export type Env = typeof env;
