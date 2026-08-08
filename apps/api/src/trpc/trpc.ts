/**
 * Initialised tRPC instance for the SpecLoop API.
 *
 * Procedures are built from this `router` and `procedure` exports. The
 * `AppRouter` type is re-exported from `src/routers/index.ts` and consumed by
 * the web app to get full end-to-end type safety.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { ApiContext } from "./context.js";

const t = initTRPC.context<ApiContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Demo-only authenticated procedure. P0 ships with a single demo user; real
 * auth is tracked separately and will be wired through this helper.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
