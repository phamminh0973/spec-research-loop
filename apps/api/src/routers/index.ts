/**
 * Root tRPC router.
 *
 * The `AppRouter` type is the contract that `apps/web` imports to obtain
 * end-to-end type safety. Adding a new procedure here is the only step
 * required to make it visible to the frontend.
 */

import { router } from "../trpc/trpc.js";
import { decompositionRouter } from "./decomposition.js";
import { evidenceRouter } from "./evidence.js";
import { healthRouter } from "./health.js";
import { judgeRouter } from "./judge.js";
import { literatureRouter } from "./literature.js";
import { interpretationRouter } from "./interpretation.js";
import { projectsRouter } from "./projects.js";
import { researchDesignRouter } from "./research-design.js";
import { specGenerationRouter } from "./spec-generation.js";

export const appRouter = router({
  health: healthRouter,
  projects: projectsRouter,
  decomposition: decompositionRouter,
  literature: literatureRouter,
  evidence: evidenceRouter,
  researchDesign: researchDesignRouter,
  interpretation: interpretationRouter,
  judge: judgeRouter,
  specGeneration: specGenerationRouter,
});

export type AppRouter = typeof appRouter;
