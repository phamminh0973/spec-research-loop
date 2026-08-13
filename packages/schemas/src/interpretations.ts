import { z } from "zod";

const UuidSchema = z.string().uuid();
const NonEmptyTextSchema = z.string().trim().min(1);

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
