import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";

export const ClientRefSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/,
    "clientRef must be a bounded stable reference"
  );
export type ClientRef = z.infer<typeof ClientRefSchema>;

export const SpecNodeTypeSchema = z.enum([
  "PROBLEM",
  "RESEARCH_QUESTION",
  "PRIOR_WORK_FINDING",
  "LIMITATION",
  "GAP",
  "CONTRIBUTION",
  "CLAIM",
  "EVIDENCE",
  "BASELINE",
  "METRIC",
  "EXPERIMENT",
  "CONSTRAINT",
  "RISK",
  "OPEN_QUESTION",
]);
export type SpecNodeType = z.infer<typeof SpecNodeTypeSchema>;

export const STEP2_REQUIRED_NODE_TYPES = [
  "PROBLEM",
  "RESEARCH_QUESTION",
  "GAP",
  "CONTRIBUTION",
  "CLAIM",
  "EVIDENCE",
  "CONSTRAINT",
  "OPEN_QUESTION",
] as const satisfies readonly SpecNodeType[];

export const Step2RequiredNodeTypeSchema = z.enum(STEP2_REQUIRED_NODE_TYPES);
export type Step2RequiredNodeType = z.infer<typeof Step2RequiredNodeTypeSchema>;

export const SpecRelationTypeSchema = z.enum([
  "ADDRESSES",
  "SUPPORTED_BY",
  "CONTRADICTED_BY",
  "TESTED_BY",
  "MEASURED_BY",
  "COMPARED_WITH",
  "REQUIRES",
  "LIMITED_BY",
  "DERIVED_FROM",
  "PART_OF",
]);
export type SpecRelationType = z.infer<typeof SpecRelationTypeSchema>;

export const PersistedNodeStatusSchema = z.enum([
  "PROPOSED",
  "USER_CONFIRMED",
  "SYSTEM_VERIFIED",
  "NEEDS_REVIEW",
  "MISSING",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "CONFLICT",
  "USER_REJECTED",
  "SUPERSEDED",
]);
export type PersistedNodeStatus = z.infer<typeof PersistedNodeStatusSchema>;

export const AiGeneratedNodeStatusSchema = z.enum([
  "PROPOSED",
  "NEEDS_REVIEW",
  "MISSING",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "CONFLICT",
]);
export type AiGeneratedNodeStatus = z.infer<typeof AiGeneratedNodeStatusSchema>;

export const StatusActorSchema = z.enum(["AI", "USER", "SYSTEM"]);
export type StatusActor = z.infer<typeof StatusActorSchema>;

export const StatusAuthoritySchema = z.enum(["AI", "USER", "SYSTEM"]);
export type StatusAuthority = z.infer<typeof StatusAuthoritySchema>;

export const SpecNodeSchema = z
  .object({
    id: UuidSchema,
    projectId: UuidSchema,
    clientRef: ClientRefSchema,
    type: SpecNodeTypeSchema,
    title: z.string().trim().min(1).max(200),
    content: z.string().trim().min(1).max(20_000),
    status: PersistedNodeStatusSchema,
    sourceRefs: z.array(UuidSchema).max(100).default([]),
    reason: z.string().trim().min(1).max(4_000).optional(),
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
  })
  .strict();
export type SpecNode = z.infer<typeof SpecNodeSchema>;

export const SpecRelationSchema = z
  .object({
    id: UuidSchema,
    projectId: UuidSchema,
    sourceNodeId: UuidSchema,
    targetNodeId: UuidSchema,
    type: SpecRelationTypeSchema,
    createdAt: IsoTimestampSchema,
  })
  .strict();
export type SpecRelation = z.infer<typeof SpecRelationSchema>;

export const NodeStatusHistorySchema = z
  .object({
    id: UuidSchema,
    projectId: UuidSchema,
    nodeId: UuidSchema,
    fromStatus: PersistedNodeStatusSchema.nullable(),
    toStatus: PersistedNodeStatusSchema,
    actor: StatusActorSchema,
    authority: StatusAuthoritySchema,
    reason: z.string().trim().min(1).max(4_000),
    occurredAt: IsoTimestampSchema,
  })
  .strict()
  .superRefine((change, context) => {
    if (change.authority === "AI" && change.actor !== "AI") {
      context.addIssue({
        code: "custom",
        path: ["actor"],
        message: "AI authority requires an AI actor",
      });
    }

    if (
      change.actor === "AI" &&
      !AiGeneratedNodeStatusSchema.safeParse(change.toStatus).success
    ) {
      context.addIssue({
        code: "custom",
        path: ["toStatus"],
        message: "AI cannot assign a user or system authority status",
      });
    }

    if (
      change.toStatus === "USER_CONFIRMED" &&
      (change.actor !== "USER" || change.authority !== "USER")
    ) {
      context.addIssue({
        code: "custom",
        path: ["authority"],
        message: "USER_CONFIRMED requires user authority",
      });
    }

    if (
      change.toStatus === "SYSTEM_VERIFIED" &&
      (change.actor !== "SYSTEM" || change.authority !== "SYSTEM")
    ) {
      context.addIssue({
        code: "custom",
        path: ["authority"],
        message: "SYSTEM_VERIFIED requires system authority",
      });
    }
  });
export type NodeStatusHistory = z.infer<typeof NodeStatusHistorySchema>;
