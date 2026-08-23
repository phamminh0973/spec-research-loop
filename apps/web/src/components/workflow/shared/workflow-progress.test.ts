import { describe, expect, it } from "vitest";

import { buildWorkflowSteps, type WorkflowFacts } from "./workflow-progress";

function states(facts: WorkflowFacts, activeStep: 1 | 2 | 3 | 4) {
  return buildWorkflowSteps(activeStep, facts).map((step) => step.state);
}

describe("workflow progress", () => {
  it("starts at interpretation and blocks later stages", () => {
    expect(states({}, 1)).toEqual([
      "current",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
      "blocked",
    ]);
  });

  it("moves to the next stage only after the interpretation gate", () => {
    const progress = buildWorkflowSteps(
      1,
      { interpretationStatus: "USER_CONFIRMED" }
    );

    expect(progress[0]).toMatchObject({
      id: 1,
      state: "complete",
    });
    expect(progress[1]).toMatchObject({
      id: 2,
      state: "current",
    });
    expect(progress.filter((step) => step.state === "current")).toHaveLength(1);
  });

  it("does not mark later facts complete when an earlier gate is missing", () => {
    const progress = buildWorkflowSteps(3, {
      interpretationStatus: "USER_CONFIRMED",
      decompositionReady: true,
      selectedSourceCount: 2,
      gapCount: 1,
      claimCount: 1,
      experimentPlanCount: 1,
      feasibilityEstimateCount: 1,
    });

    expect(progress[2]?.state).toBe("complete");
    expect(progress[3]?.state).toBe("current");
    expect(progress[4]?.state).toBe("blocked");
    expect(progress[8]?.state).toBe("blocked");
  });

  it("uses the final route only after the earlier workflow is complete", () => {
    const progress = buildWorkflowSteps(4, {
      interpretationStatus: "USER_CONFIRMED",
      decompositionReady: true,
      selectedSourceCount: 1,
      evidenceCount: 1,
      gapCount: 1,
      claimCount: 1,
      experimentPlanCount: 1,
      feasibilityEstimateCount: 1,
      specificationSectionCount: 14,
      judgeFindingCount: 3,
      hasRevisionDecision: true,
      finalized: false,
    });

    expect(progress.slice(0, 9).every((step) => step.state === "complete")).toBe(
      true
    );
    expect(progress[9]).toMatchObject({ id: 10, state: "current" });
  });
});
