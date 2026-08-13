import {
  InterpretationDecisionSchema,
  InterpretationOutputSchema,
  InterpretationRecordSchema,
  UuidSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  InterpretationGenerationError,
  InterpretationLifecycleError,
  type InterpretationModule,
} from "../interpretation/index.js";
import { protectedProcedure, router } from "../trpc/trpc.js";
import { getProjectById } from "./projects.js";

const ProjectInputSchema = z.object({ projectId: UuidSchema });
const VersionInputSchema = ProjectInputSchema.extend({
  interpretationId: UuidSchema,
});

function requireModule(module: InterpretationModule | undefined) {
  if (!module) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Interpretation dependencies are not configured for this API process.",
    });
  }
  return module;
}

function projectInput(projectId: string) {
  const project = getProjectById(projectId);
  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Project ${projectId} not found.`,
    });
  }
  return {
    projectId: project.id,
    rawIdea: project.rawIdea,
    domain: project.domain ?? undefined,
    resourceConstraints: project.resourceConstraints,
  };
}

async function runInterpretation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    if (error instanceof InterpretationLifecycleError) {
      throw new TRPCError({
        code: "CONFLICT",
        message: error.message,
        cause: error,
      });
    }
    if (error instanceof InterpretationGenerationError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Idea interpretation failed. You can try Regenerate.",
        cause: error,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Interpretation operation failed.",
      cause: error,
    });
  }
}

export const interpretationRouter = router({
  generate: protectedProcedure
    .input(ProjectInputSchema)
    .output(InterpretationRecordSchema)
    .mutation(({ ctx, input }) =>
      runInterpretation(() =>
        requireModule(ctx.interpretation).generate(
          projectInput(input.projectId)
        )
      )
    ),

  regenerate: protectedProcedure
    .input(ProjectInputSchema)
    .output(InterpretationRecordSchema)
    .mutation(({ ctx, input }) =>
      runInterpretation(() =>
        requireModule(ctx.interpretation).regenerate(
          projectInput(input.projectId),
          ctx.user.id
        )
      )
    ),

  latest: protectedProcedure
    .input(ProjectInputSchema)
    .output(InterpretationRecordSchema.nullable())
    .query(({ ctx, input }) =>
      runInterpretation(async () => {
        projectInput(input.projectId);
        return requireModule(ctx.interpretation).latest(input.projectId);
      })
    ),

  decisions: protectedProcedure
    .input(ProjectInputSchema)
    .output(z.array(InterpretationDecisionSchema))
    .query(({ ctx, input }) =>
      runInterpretation(async () => {
        projectInput(input.projectId);
        return requireModule(ctx.interpretation).decisions(input.projectId);
      })
    ),

  revise: protectedProcedure
    .input(
      VersionInputSchema.extend({
        action: z.enum(["EDIT", "OTHER"]),
        output: InterpretationOutputSchema,
      })
    )
    .output(InterpretationRecordSchema)
    .mutation(({ ctx, input }) =>
      runInterpretation(async () => {
        projectInput(input.projectId);
        return requireModule(ctx.interpretation).revise({
          projectId: input.projectId,
          sourceInterpretationId: input.interpretationId,
          action: input.action,
          output: input.output,
          actorId: ctx.user.id,
        });
      })
    ),

  confirm: protectedProcedure
    .input(VersionInputSchema)
    .output(InterpretationRecordSchema)
    .mutation(({ ctx, input }) =>
      runInterpretation(async () => {
        projectInput(input.projectId);
        return requireModule(ctx.interpretation).confirm(
          input.projectId,
          input.interpretationId,
          ctx.user.id
        );
      })
    ),
});
