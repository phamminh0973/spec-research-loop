import { z } from "zod";

import { IsoTimestampSchema, NonEmptyTextSchema, UuidSchema } from "./common";

export const ConfirmedDecisionKindSchema = z.enum(["CONFIRM", "EDIT", "OTHER"]);
export type ConfirmedDecisionKind = z.infer<typeof ConfirmedDecisionKindSchema>;

export const ConfirmedDecisionSchema = z
  .object({
    kind: ConfirmedDecisionKindSchema,
    content: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict()
  .superRefine((decision, context) => {
    if (decision.kind !== "CONFIRM" && !decision.content) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: `${decision.kind} decisions require content`,
      });
    }
  });
export type ConfirmedDecision = z.infer<typeof ConfirmedDecisionSchema>;

export const ConfirmedInterpretationSnapshotSchema = z
  .object({
    interpretationId: UuidSchema,
    projectId: UuidSchema,
    simpleInterpretation: NonEmptyTextSchema.max(5_000),
    technicalInterpretation: NonEmptyTextSchema.max(10_000),
    assumptions: z.array(NonEmptyTextSchema.max(1_000)).max(50),
    objectives: z.array(NonEmptyTextSchema.max(1_000)).max(50),
    ambiguities: z.array(NonEmptyTextSchema.max(1_000)).max(50),
    confirmedDecisions: z.array(ConfirmedDecisionSchema).max(50),
    constraints: z.array(NonEmptyTextSchema.max(1_000)).max(50),
    status: z.literal("USER_CONFIRMED"),
    confirmedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ConfirmedInterpretationSnapshot = z.infer<
  typeof ConfirmedInterpretationSnapshotSchema
>;

// ---------------------------------------------------------------------------
// Idea interpretation (AIT-01 / "Bước 1 — Idea interpretation")
//
// Contract source: docs/source/02-approved-proposal.md §9 "Bước 1", mirrored
// in docs/04-ai-system-design.md §2 (AIT-01) and §3 (PT-01). This is a P0
// human-gated AI task: output is always PROPOSED until the user chooses
// Confirm/Edit/Regenerate/Other (US-02, US-03; docs/04-ai-system-design.md
// §17). The application — never the model — assigns USER_CONFIRMED.
// ---------------------------------------------------------------------------

export const InterpretIdeaInputSchema = z.object({
  projectId: UuidSchema,
  rawIdea: z.string().min(10).max(20_000),
  domain: z.string().max(100).optional(),
  deadline: IsoTimestampSchema.optional(),
  resourceConstraints: z.array(z.string().min(1).max(200)).max(20).default([]),
});
export type InterpretIdeaInput = z.infer<typeof InterpretIdeaInputSchema>;

/**
 * Model-facing output shape, matching the approved-proposal JSON skeleton
 * exactly: two interpretation strings plus three flat string lists. Kept
 * free of nested objects/IDs because Bước 1 has no prior corpus/nodes to
 * reference yet — there is nothing an interpretation could point `source_refs`
 * at (see docs/04-ai-system-design.md §2.1 for the node schema used from
 * Bước 2 onward, once nodes exist).
 */
export const InterpretationOutputSchema = z.object({
  simpleInterpretation: z.string().min(1).max(4_000),
  technicalInterpretation: z.string().min(1).max(4_000),
  assumptions: z.array(z.string().min(1).max(500)).max(20),
  objectives: z.array(z.string().min(1).max(500)).max(20),
  ambiguities: z.array(z.string().min(1).max(500)).max(20),
});
export type InterpretationOutput = z.infer<typeof InterpretationOutputSchema>;

/**
 * Persisted/returned record: proposed output plus the provenance fields
 * docs/04-ai-system-design.md §5 requires every model call to record
 * (task, prompt/schema version, provider/model, retry count, status).
 * `status` starts `PROPOSED`; only the US-03 confirmation gate may move it
 * to `USER_CONFIRMED` (BR-01) — this schema deliberately has no path to set
 * that value from the AI response.
 */
export const InterpretationStatusSchema = z.enum([
  "PROPOSED",
  "USER_CONFIRMED",
  "SUPERSEDED",
]);
export type InterpretationStatus = z.infer<typeof InterpretationStatusSchema>;

export const InterpretationRecordSchema = z
  .object({
    interpretationId: UuidSchema,
    projectId: UuidSchema,
    output: InterpretationOutputSchema,
    status: InterpretationStatusSchema,
    promptId: z.literal("PT-01"),
    promptVersion: z.string().min(1),
    schemaVersion: z.string().min(1),
    provider: z.string().min(1),
    model: z.string().min(1),
    retryCount: z.number().int().min(0),
    createdAt: IsoTimestampSchema,
    confirmedAt: IsoTimestampSchema.nullable(),
  })
  .strict()
  .superRefine((record, context) => {
    if (record.status === "USER_CONFIRMED" && record.confirmedAt === null) {
      context.addIssue({
        code: "custom",
        path: ["confirmedAt"],
        message: "A confirmed interpretation requires confirmedAt",
      });
    }
  });
export type InterpretationRecord = z.infer<typeof InterpretationRecordSchema>;

export const InterpretationDecisionActionSchema = z.enum([
  "CONFIRM",
  "EDIT",
  "REGENERATE",
  "OTHER",
]);
export type InterpretationDecisionAction = z.infer<
  typeof InterpretationDecisionActionSchema
>;

export const InterpretationDecisionSchema = z
  .object({
    id: UuidSchema,
    projectId: UuidSchema,
    interpretationId: UuidSchema,
    action: InterpretationDecisionActionSchema,
    content: z.string().trim().min(1).max(4_000).nullable(),
    actorId: UuidSchema,
    createdAt: IsoTimestampSchema,
  })
  .strict()
  .superRefine((decision, context) => {
    if (
      (decision.action === "EDIT" || decision.action === "OTHER") &&
      decision.content === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: `${decision.action} decisions require user-authored content`,
      });
    }
  });
export type InterpretationDecision = z.infer<
  typeof InterpretationDecisionSchema
>;