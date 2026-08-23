export type ActiveStep = 1 | 2 | 3 | 4;

export type WorkflowStepState =
  | "complete"
  | "current"
  | "blocked"
  | "pending";

export type WorkflowFacts = {
  interpretationStatus?: string | null;
  decompositionGenerated?: boolean;
  decompositionReady?: boolean;
  selectedSourceCount?: number;
  evidenceCount?: number;
  gapCount?: number;
  claimCount?: number;
  experimentPlanCount?: number;
  feasibilityEstimateCount?: number;
  specificationSectionCount?: number;
  judgeFindingCount?: number;
  hasRevisionDecision?: boolean;
  finalized?: boolean;
};

export type WorkflowStep = {
  id: string;
  label: string;
  state: WorkflowStepState;
};

export type WorkflowProgress = {
  title: string;
  steps: WorkflowStep[];
};

type StepDefinition = Omit<WorkflowStep, "state">;

function hasItems(value: number | undefined) {
  return value !== undefined && value > 0;
}

function buildSequentialProgress(
  title: string,
  definitions: StepDefinition[],
  gates: boolean[],
): WorkflowProgress {
  const firstIncomplete = gates.findIndex((gate) => !gate);

  return {
    title,
    steps: definitions.map((definition, index) => ({
      ...definition,
      state:
        firstIncomplete === -1 || index < firstIncomplete
          ? "complete"
          : index === firstIncomplete
            ? "current"
            : "pending",
    })),
  };
}

const NEW_PROJECT_STEPS: StepDefinition[] = [
  { id: "project-input", label: "Nhập ý tưởng" },
  { id: "project-create", label: "Tạo project" },
  { id: "project-understanding", label: "Mở Step 1" },
];

const UNDERSTANDING_STEPS: StepDefinition[] = [
  { id: "interpretation-generate", label: "Generate proposal" },
  { id: "interpretation-review", label: "Review & edit" },
  { id: "interpretation-confirm", label: "Confirm" },
];

const DECOMPOSITION_STEPS: StepDefinition[] = [
  { id: "decomposition-generate", label: "Generate typed cards" },
  { id: "decomposition-review", label: "Review cards" },
  { id: "decomposition-handoff", label: "Sẵn sàng chuyển bước" },
];

const RESEARCH_STEPS: StepDefinition[] = [
  { id: "research-literature", label: "Literature" },
  { id: "research-evidence-gap", label: "Evidence & gap" },
  { id: "research-claims", label: "Claims" },
  { id: "research-feasibility", label: "Experiment & feasibility" },
];

const FINAL_REVIEW_STEPS: StepDefinition[] = [
  { id: "final-specification", label: "Specification" },
  { id: "final-judges", label: "Independent judges" },
  { id: "final-revision", label: "Revision decision" },
  { id: "finalize-export", label: "Finalize & export" },
];

export function buildWorkflowProgress(
  activeStep: ActiveStep,
  facts: WorkflowFacts,
  options: { newProject?: boolean } = {},
): WorkflowProgress {
  if (activeStep === 1 && options.newProject) {
    return buildSequentialProgress(
      "Tiến độ màn hình tạo project",
      NEW_PROJECT_STEPS,
      [false, false, false],
    );
  }

  if (activeStep === 1) {
    const hasProposal = Boolean(facts.interpretationStatus);
    const confirmed = facts.interpretationStatus === "USER_CONFIRMED";

    return buildSequentialProgress(
      "Tiến độ màn hình Step 1",
      UNDERSTANDING_STEPS,
      [hasProposal, confirmed, confirmed],
    );
  }

  if (activeStep === 2) {
    const generated =
      facts.decompositionGenerated ?? facts.decompositionReady === true;
    const ready = facts.decompositionReady === true;

    return buildSequentialProgress(
      "Tiến độ màn hình Step 2",
      DECOMPOSITION_STEPS,
      [generated, ready, ready],
    );
  }

  if (activeStep === 3) {
    return buildSequentialProgress(
      "Tiến độ màn hình Steps 3–8",
      RESEARCH_STEPS,
      [
        hasItems(facts.selectedSourceCount),
        hasItems(facts.evidenceCount) && hasItems(facts.gapCount),
        hasItems(facts.claimCount),
        hasItems(facts.experimentPlanCount) &&
          hasItems(facts.feasibilityEstimateCount),
      ],
    );
  }

  return buildSequentialProgress(
    "Tiến độ màn hình Steps 9–10",
    FINAL_REVIEW_STEPS,
    [
      (facts.specificationSectionCount ?? 0) >= 14,
      hasItems(facts.judgeFindingCount),
      facts.hasRevisionDecision === true,
      facts.finalized === true,
    ],
  );
}
