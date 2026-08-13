export const confirmedInterpretationFixture = {
  interpretationId: "00000000-0000-4000-8000-000000000002",
  projectId: "00000000-0000-4000-8000-000000000001",
  simpleInterpretation:
    "The system clarifies a research idea before implementation.",
  technicalInterpretation:
    "A confirmation-gated workflow turns a research idea into reviewable structure.",
  assumptions: ["The user can review the proposed interpretation."],
  objectives: ["Produce a testable research structure."],
  ambiguities: [],
  confirmedDecisions: [{ kind: "CONFIRM" }],
  constraints: ["Use a bounded local development workflow."],
  status: "USER_CONFIRMED",
  confirmedAt: "2026-08-11T00:00:00Z",
} as const;
