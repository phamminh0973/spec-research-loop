import { describe, expect, it } from "vitest";
import {
  DecomposeIdeaInputSchema,
  DecompositionOutputSchema,
} from "../decomposition";
import { ConfirmedInterpretationSnapshotSchema } from "../interpretation";
import { STEP2_REQUIRED_NODE_TYPES } from "../spec-graph";

const projectId = "00000000-0000-4000-8000-000000000001";

const confirmedInterpretation = {
  interpretationId: "00000000-0000-4000-8000-000000000002",
  projectId,
  simpleInterpretation:
    "The system clarifies a research idea before implementation.",
  technicalInterpretation:
    "A confirmation-gated workflow turns a research idea into reviewable structure.",
  assumptions: ["The user can review the proposed interpretation."],
  objectives: ["Produce a testable research structure."],
  ambiguities: [],
  confirmedDecisions: [{ kind: "CONFIRM" as const }],
  constraints: ["Use a bounded local development workflow."],
  status: "USER_CONFIRMED" as const,
  confirmedAt: "2026-08-11T00:00:00Z",
};

const validOutput = {
  projectId,
  nodes: [
    {
      projectId,
      clientRef: "problem-1",
      type: "PROBLEM" as const,
      title: "Research logic is unclear",
      content: "The initial idea does not yet expose a precise problem.",
      status: "PROPOSED" as const,
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "claim-1",
      type: "CLAIM" as const,
      title: "The workflow reduces unsupported claims",
      content: "This claim still needs evidence or a planned experiment.",
      status: "UNSUPPORTED" as const,
      sourceRefs: [],
      reason: "No evidence or planned experiment is linked yet.",
    },
  ],
  relations: [
    {
      projectId,
      sourceClientRef: "problem-1",
      targetClientRef: "claim-1",
      type: "ADDRESSES" as const,
    },
  ],
  warnings: [
    {
      code: "UNSUPPORTED" as const,
      targetClientRef: "claim-1",
      targetType: "CLAIM" as const,
      reason: "No evidence or planned experiment is linked yet.",
      suggestedAction: "Add a planned experiment or mark the claim for review.",
    },
  ],
};

describe("Step 2 shared contracts", () => {
  it("publishes the assignment Step 2 required node types", () => {
    expect(STEP2_REQUIRED_NODE_TYPES).toEqual([
      "PROBLEM",
      "RESEARCH_QUESTION",
      "GAP",
      "CONTRIBUTION",
      "CLAIM",
      "EVIDENCE",
      "CONSTRAINT",
      "OPEN_QUESTION",
    ]);
    expect(STEP2_REQUIRED_NODE_TYPES).not.toContain("RISK");
  });

  it("accepts a trusted user-confirmed interpretation", () => {
    expect(
      ConfirmedInterpretationSnapshotSchema.parse(confirmedInterpretation)
    ).toEqual(confirmedInterpretation);
    expect(
      DecomposeIdeaInputSchema.parse({
        projectId,
        confirmedInterpretation,
        confirmedDecisions: confirmedInterpretation.confirmedDecisions,
        constraints: confirmedInterpretation.constraints,
      })
    ).toMatchObject({ projectId });
  });

  it("rejects a snapshot that is not user-confirmed", () => {
    expect(() =>
      ConfirmedInterpretationSnapshotSchema.parse({
        ...confirmedInterpretation,
        status: "PROPOSED",
      })
    ).toThrow();
  });

  it("rejects authority statuses from AI decomposition output", () => {
    expect(() =>
      DecompositionOutputSchema.parse({
        ...validOutput,
        nodes: [
          { ...validOutput.nodes[0], status: "USER_CONFIRMED" },
          validOutput.nodes[1],
        ],
      })
    ).toThrow();
  });

  it("rejects duplicate node client references", () => {
    expect(() =>
      DecompositionOutputSchema.parse({
        ...validOutput,
        nodes: [
          validOutput.nodes[0],
          { ...validOutput.nodes[1], clientRef: "problem-1" },
        ],
      })
    ).toThrow();
  });

  it("rejects a relation whose endpoint is missing", () => {
    expect(() =>
      DecompositionOutputSchema.parse({
        ...validOutput,
        relations: [
          {
            ...validOutput.relations[0],
            targetClientRef: "missing-node",
          },
        ],
      })
    ).toThrow();
  });
});
