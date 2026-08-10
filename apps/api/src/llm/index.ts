/**
 * Public surface of the SpecLoop LLM module.
 *
 * Import `getLlmClient` from anywhere in the backend to obtain the shared
 * OpenAI-compatible client. Configuration is environment-driven; see
 * `./config.ts` and `.env.example` for the supported variables.
 */

export { getLlmClient, getLlmConfig, resetLlmClient } from "./client.js";
export { loadLlmConfig, type LlmConfig } from "./config.js";
