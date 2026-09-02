import { z } from "zod";
import { NonEmptyTextSchema, UuidSchema } from "./common";
import {
  ConfirmedDecisionSchema,
  ConfirmedInterpretationSnapshotSchema,
} from "./interpretation";
import {
  AiGeneratedNodeStatusSchema,
  ClientRefSchema,
  NodeStatusHistorySchema,
  SpecNodeSchema,
  SpecNodeTypeSchema,
  SpecRelationSchema,
  SpecRelationTypeSchema,
} from "./spec-graph";

export const DecomposeIdeaInputSchema = z
  .object({
    projectId: UuidSchema,
    confirmedInterpretation: ConfirmedInterpretationSnapshotSchema,
    confirmedDecisions: z.array(ConfirmedDecisionSchema).max(50).default([]),
    constraints: z.array(NonEmptyTextSchema.max(1_000)).max(50).default([]),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.confirmedInterpretation.projectId !== input.projectId) {
      context.addIssue({
        code: "custom",
        path: ["confirmedInterpretation", "projectId"],
        message:
          "The confirmed interpretation must belong to the requested project",
      });
    }
  });
export type DecomposeIdeaInput = z.infer<typeof DecomposeIdeaInputSchema>;

export const DecompositionNodeSchema = z
  .object({
    projectId: UuidSchema,
    clientRef: ClientRefSchema,
    type: SpecNodeTypeSchema,
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(20_000),
    status: AiGeneratedNodeStatusSchema,
    sourceRefs: z.array(UuidSchema).max(100).default([]),
    reason: z.string().trim().min(1).max(4_000).optional(),
  })
  .strict();
export type DecompositionNode = z.infer<typeof DecompositionNodeSchema>;

export const DecompositionRelationSchema = z
  .object({
    projectId: UuidSchema,
    sourceClientRef: ClientRefSchema,
    targetClientRef: ClientRefSchema,
    type: SpecRelationTypeSchema,
  })
  .strict();
export type DecompositionRelation = z.infer<typeof DecompositionRelationSchema>;

export const DecompositionWarningCodeSchema = z.enum([
  "MISSING",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "CONFLICT",
]);
export type DecompositionWarningCode = z.infer<
  typeof DecompositionWarningCodeSchema
>;

export const DecompositionWarningSchema = z
  .object({
    code: DecompositionWarningCodeSchema,
    targetClientRef: ClientRefSchema.nullable().optional(),
    targetType: SpecNodeTypeSchema,
    reason: NonEmptyTextSchema.max(4_000),
    suggestedAction: NonEmptyTextSchema.max(4_000),
  })
  .strict();
export type DecompositionWarning = z.infer<typeof DecompositionWarningSchema>;

export const DecompositionOutputSchema = z
  .object({
    projectId: UuidSchema,
    nodes: z.array(DecompositionNodeSchema).max(200),
    relations: z.array(DecompositionRelationSchema).max(500),
    warnings: z.array(DecompositionWarningSchema).max(500),
  })
  .strict()
  .superRefine((output, context) => {
    const refs = new Map<string, number>();

    output.nodes.forEach((node, index) => {
      const previousIndex = refs.get(node.clientRef);
      if (previousIndex !== undefined) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "clientRef"],
          message: `Duplicate clientRef; first seen at nodes.${previousIndex}`,
        });
      } else {
        refs.set(node.clientRef, index);
      }

      if (node.projectId !== output.projectId) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "projectId"],
          message: "Every generated node must belong to the output project",
        });
      }
    });

    output.relations.forEach((relation, index) => {
      if (!refs.has(relation.sourceClientRef)) {
        context.addIssue({
          code: "custom",
          path: ["relations", index, "sourceClientRef"],
          message:
            "Relation source endpoint does not reference a generated node",
        });
      }

      if (!refs.has(relation.targetClientRef)) {
        context.addIssue({
          code: "custom",
          path: ["relations", index, "targetClientRef"],
          message:
            "Relation target endpoint does not reference a generated node",
        });
      }

      if (relation.sourceClientRef === relation.targetClientRef) {
        context.addIssue({
          code: "custom",
          path: ["relations", index],
          message: "Self-relations are not allowed",
        });
      }

      if (relation.projectId !== output.projectId) {
        context.addIssue({
          code: "custom",
          path: ["relations", index, "projectId"],
          message: "Every generated relation must belong to the output project",
        });
      }
    });
  });
export type DecompositionOutput = z.infer<typeof DecompositionOutputSchema>;

export const SpecGraphViewSchema = z
  .object({
    projectId: UuidSchema,
    nodes: z.array(SpecNodeSchema).max(200),
    relations: z.array(SpecRelationSchema).max(500),
    warnings: z.array(DecompositionWarningSchema).max(500),
    statusHistory: z.array(NodeStatusHistorySchema).max(1_000),
  })
  .strict()
  .superRefine((view, context) => {
    const nodeIds = new Set(view.nodes.map((node) => node.id));

    view.nodes.forEach((node, index) => {
      if (node.projectId !== view.projectId) {
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "projectId"],
          message: "Every persisted node must belong to the view project",
        });
      }
    });

    view.relations.forEach((relation, index) => {
      if (relation.projectId !== view.projectId) {
        context.addIssue({
          code: "custom",
          path: ["relations", index, "projectId"],
          message: "Every persisted relation must belong to the view project",
        });
      }

      if (!nodeIds.has(relation.sourceNodeId)) {
        context.addIssue({
          code: "custom",
          path: ["relations", index, "sourceNodeId"],
          message: "Relation source must reference a node in the view",
        });
      }

      if (!nodeIds.has(relation.targetNodeId)) {
        context.addIssue({
          code: "custom",
          path: ["relations", index, "targetNodeId"],
          message: "Relation target must reference a node in the view",
        });
      }

      if (relation.sourceNodeId === relation.targetNodeId) {
        context.addIssue({
          code: "custom",
          path: ["relations", index],
          message: "Self-relations are not allowed",
        });
      }
    });

    view.statusHistory.forEach((change, index) => {
      if (change.projectId !== view.projectId) {
        context.addIssue({
          code: "custom",
          path: ["statusHistory", index, "projectId"],
          message: "Every status change must belong to the view project",
        });
      }

      if (!nodeIds.has(change.nodeId)) {
        context.addIssue({
          code: "custom",
          path: ["statusHistory", index, "nodeId"],
          message: "Status change must reference a node in the view",
        });
      }
    });
  });
export type SpecGraphView = z.infer<typeof SpecGraphViewSchema>;
