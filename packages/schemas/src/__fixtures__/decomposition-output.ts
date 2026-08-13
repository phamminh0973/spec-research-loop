import { confirmedInterpretationFixture } from "./confirmed-interpretation";

const { projectId } = confirmedInterpretationFixture;

export const decompositionOutputFixture = {
  projectId,
  nodes: [
    {
      projectId,
      clientRef: "problem-1",
      type: "PROBLEM",
      title: "Research logic is unclear",
      content: "The initial idea does not yet expose a precise problem.",
      status: "PROPOSED",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "question-1",
      type: "RESEARCH_QUESTION",
      title: "What should be tested?",
      content: "The research question needs a measurable target.",
      status: "PROPOSED",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "gap-1",
      type: "GAP",
      title: "Gap candidate",
      content: "The candidate gap requires later corpus-based validation.",
      status: "NEEDS_REVIEW",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "contribution-1",
      type: "CONTRIBUTION",
      title: "Proposed contribution",
      content: "A proposed contribution that remains subject to user review.",
      status: "PROPOSED",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "claim-1",
      type: "CLAIM",
      title: "The workflow reduces unsupported claims",
      content: "This claim still needs evidence or a planned experiment.",
      status: "UNSUPPORTED",
      sourceRefs: [],
      reason: "No evidence or planned experiment is linked yet.",
    },
    {
      projectId,
      clientRef: "evidence-1",
      type: "EVIDENCE",
      title: "Evidence requirement",
      content:
        "Evidence needed: a future source span or planned experiment result.",
      status: "PROPOSED",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "constraint-1",
      type: "CONSTRAINT",
      title: "Local development constraint",
      content:
        "The independent test slice must remain bounded and reproducible.",
      status: "PROPOSED",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "risk-1",
      type: "RISK",
      title: "Evidence may remain unavailable",
      content:
        "The claim cannot be treated as factual without a later disposition.",
      status: "NEEDS_REVIEW",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "open-question-1",
      type: "OPEN_QUESTION",
      title: "Which evidence path will be selected?",
      content:
        "The user must decide whether a planned experiment or source evidence is appropriate.",
      status: "PROPOSED",
      sourceRefs: [],
    },
  ],
  relations: [
    {
      projectId,
      sourceClientRef: "problem-1",
      targetClientRef: "question-1",
      type: "ADDRESSES",
    },
    {
      projectId,
      sourceClientRef: "question-1",
      targetClientRef: "gap-1",
      type: "DERIVED_FROM",
    },
    {
      projectId,
      sourceClientRef: "gap-1",
      targetClientRef: "contribution-1",
      type: "ADDRESSES",
    },
    {
      projectId,
      sourceClientRef: "contribution-1",
      targetClientRef: "claim-1",
      type: "PART_OF",
    },
    {
      projectId,
      sourceClientRef: "claim-1",
      targetClientRef: "evidence-1",
      type: "REQUIRES",
    },
  ],
  warnings: [
    {
      code: "UNSUPPORTED",
      targetClientRef: "claim-1",
      targetType: "CLAIM",
      reason: "No evidence or planned experiment is linked yet.",
      suggestedAction: "Add a planned experiment or mark the claim for review.",
    },
  ],
} as const;
