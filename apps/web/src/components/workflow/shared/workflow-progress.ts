export type ActiveStep = 1 | 2 | 3 | 4;

export type WorkflowStepState =
  | "complete"
  | "current"
  | "blocked"
  | "pending";

export type WorkflowFacts = {
  interpretationStatus?: string | null;
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
  id: number;
  label: string;
  route: ActiveStep;
  state: WorkflowStepState;
};

const WORKFLOW_STEP_DEFINITIONS = [
  { id: 1, label: "Ý tưởng & xác nhận", route: 1 as const },
  { id: 2, label: "Phân rã có cấu trúc", route: 2 as const },
  { id: 3, label: "Tìm literature", route: 3 as const },
  { id: 4, label: "Thu thập evidence", route: 3 as const },
  { id: 5, label: "Đề xuất research gap", route: 3 as const },
  { id: 6, label: "Contribution & claims", route: 3 as const },
  { id: 7, label: "Kế hoạch thí nghiệm", route: 3 as const },
  { id: 8, label: "Ước lượng khả thi", route: 3 as const },
  { id: 9, label: "Research specification", route: 4 as const },
  { id: 10, label: "Judge & finalize", route: 4 as const },
] as const;

function hasItems(value: number | undefined) {
  return value !== undefined && value > 0;
}

function getDirectCompletion(facts: WorkflowFacts): boolean[] {
  return [
    facts.interpretationStatus === "USER_CONFIRMED",
    facts.decompositionReady === true,
    hasItems(facts.selectedSourceCount),
    hasItems(facts.evidenceCount),
    hasItems(facts.gapCount),
    hasItems(facts.claimCount),
    hasItems(facts.experimentPlanCount),
    hasItems(facts.feasibilityEstimateCount),
    (facts.specificationSectionCount ?? 0) >= 14,
    hasItems(facts.judgeFindingCount) &&
      facts.hasRevisionDecision === true &&
      facts.finalized === true,
  ];
}

function getRouteRange(activeStep: ActiveStep) {
  if (activeStep === 1) return [0, 0] as const;
  if (activeStep === 2) return [1, 1] as const;
  if (activeStep === 3) return [2, 7] as const;
  return [8, 9] as const;
}

export function buildWorkflowSteps(
  activeStep: ActiveStep,
  facts: WorkflowFacts
): WorkflowStep[] {
  const directCompletion = getDirectCompletion(facts);
  const completed: boolean[] = [];
  directCompletion.forEach((isComplete, index) => {
    completed[index] = isComplete && (index === 0 || completed[index - 1] === true);
  });
  const firstIncompleteOverall = completed.findIndex((isComplete) => !isComplete);
  const [routeStart, routeEnd] = getRouteRange(activeStep);
  const firstIncompleteInRoute = completed.findIndex(
    (isComplete, index) =>
      index >= routeStart && index <= routeEnd && !isComplete
  );
  const currentIndex =
    firstIncompleteOverall === -1
      ? WORKFLOW_STEP_DEFINITIONS.length - 1
      : firstIncompleteOverall < routeStart
        ? firstIncompleteOverall
        : firstIncompleteInRoute >= 0
          ? firstIncompleteInRoute
          : firstIncompleteOverall;

  return WORKFLOW_STEP_DEFINITIONS.map((definition, index) => ({
    ...definition,
    state: completed[index]
      ? "complete"
      : index === currentIndex
        ? "current"
        : index > 0 && completed[index - 1]
          ? "pending"
          : "blocked",
  }));
}
