/**
 * Public surface of `@specloop/api`.
 *
 * The web app imports `AppRouter` from here to obtain end-to-end type safety.
 * The HTTP server itself lives in `./server.ts` and is started via
 * `pnpm --filter @specloop/api dev`.
 */

export {
  getLlmClient,
  getLlmConfig,
  type LlmConfig,
  resetLlmClient,
} from "./llm/index.js";
export type { AppRouter } from "./routers/index.js";
export { appRouter } from "./routers/index.js";
export { type ApiContext, createContext } from "./trpc/context.js";
