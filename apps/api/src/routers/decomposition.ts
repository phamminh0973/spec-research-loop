import {
  ClientRefSchema,
  SpecGraphViewSchema,
  SpecRelationTypeSchema,
  UuidSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  ConfirmationRequiredError,
  SpecGraphConflictError,
  DecompositionValidationError,
  SpecGraphEditValidationError,
  SpecGraphNotFoundError,
  SpecNodeNotFoundError,
  SpecRelationNotFoundError,
} from "../modules/decomposition/errors.js";
import type { SpecStructureModule } from "../modules/decomposition/module.js";
import { protectedProcedure, router } from "../trpc/trpc.js";

const ProjectInputSchema = z.object({ projectId: UuidSchema });

const UpdateNodeInputSchema = ProjectInputSchema.extend({
  clientRef: ClientRefSchema,
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(20_000),
  reason: z.string().trim().min(1).max(4_000).nullable().optional(),
});

const CreateRelationInputSchema = ProjectInputSchema.extend({
  sourceClientRef: ClientRefSchema,
  targetClientRef: ClientRefSchema,
  type: SpecRelationTypeSchema,
});

const DeleteRelationInputSchema = ProjectInputSchema.extend({
  relationId: UuidSchema,
});

const ChangeStatusInputSchema = ProjectInputSchema.extend({
  clientRef: ClientRefSchema,
  toStatus: z.enum(["USER_CONFIRMED", "USER_REJECTED"]),
  reason: z.string().trim().min(1).max(4_000),
});

function requireModule(
  module: SpecStructureModule | undefined
): SpecStructureModule {
  if (!module) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Step 2 dependencies are not configured for this API process.",
    });
  }
  return module;
}

function mapDomainError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof ConfirmationRequiredError) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof SpecGraphConflictError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: error.message,
      cause: error,
    });
  }

  if (
    error instanceof DecompositionValidationError ||
    error instanceof SpecGraphEditValidationError
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    });
  }

  if (
    error instanceof SpecGraphNotFoundError ||
    error instanceof SpecNodeNotFoundError ||
    error instanceof SpecRelationNotFoundError
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: error.message,
      cause: error,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Step 2 operation failed.",
    cause: error,
  });
}

async function runDomain<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    return mapDomainError(error);
  }
}

export const decompositionRouter = router({
  generate: protectedProcedure
    .input(ProjectInputSchema)
    .output(SpecGraphViewSchema)
    .mutation(({ ctx, input }) =>
      runDomain(() =>
        requireModule(ctx.specStructure).generate(input.projectId)
      )
    ),

  byProject: protectedProcedure
    .input(ProjectInputSchema)
    .output(SpecGraphViewSchema.nullable())
    .query(({ ctx, input }) =>
      runDomain(() =>
        requireModule(ctx.specStructure).byProject(input.projectId)
      )
    ),

  updateNode: protectedProcedure
    .input(UpdateNodeInputSchema)
    .output(SpecGraphViewSchema)
    .mutation(({ ctx, input }) =>
      runDomain(() => requireModule(ctx.specStructure).updateNode(input))
    ),

  createRelation: protectedProcedure
    .input(CreateRelationInputSchema)
    .output(SpecGraphViewSchema)
    .mutation(({ ctx, input }) =>
      runDomain(() => requireModule(ctx.specStructure).createRelation(input))
    ),

  deleteRelation: protectedProcedure
    .input(DeleteRelationInputSchema)
    .output(SpecGraphViewSchema)
    .mutation(({ ctx, input }) =>
      runDomain(() => requireModule(ctx.specStructure).deleteRelation(input))
    ),

  changeStatus: protectedProcedure
    .input(ChangeStatusInputSchema)
    .output(SpecGraphViewSchema)
    .mutation(({ ctx, input }) =>
      runDomain(() => requireModule(ctx.specStructure).changeStatus(input))
    ),
});
