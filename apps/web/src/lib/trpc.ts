/**
 * tRPC client for the SpecLoop web app.
 *
 * The `AppRouter` type is imported from `@specloop/api`. Because that package
 * re-exports the type from the backend's `appRouter`, every procedure and
 * its input/output types are inferred here at compile time — no code
 * generation step is required.
 *
 * The HTTP base URL is read from `NEXT_PUBLIC_API_BASE_URL`. The tRPC client
 * automatically appends `/trpc` to the path.
 */

import type { AppRouter } from "@specloop/api";
import { createTRPCReact } from "@trpc/react-query";
export const trpc = createTRPCReact<AppRouter>();

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
