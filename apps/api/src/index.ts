/**
 * Public surface of `@specloop/api`.
 *
 * The web app imports `AppRouter` from here to obtain end-to-end type safety.
 * The HTTP server itself lives in `./server.ts` and is started via
 * `pnpm --filter @specloop/api dev`.
 */

export { appRouter } from "./routers/index.js";
export type { AppRouter } from "./routers/index.js";
export { createContext, type ApiContext } from "./trpc/context.js";
export {
  getLlmClient,
  getLlmConfig,
  resetLlmClient,
  type LlmConfig,
} from "./llm/index.js";
