import { describe, expect, it } from "vitest";

import {
  buildWorkflowProgress,
  type WorkflowFacts,
} from "./workflow-progress";

function states(
  activeStep: 1 | 2 | 3 | 4,
  facts: WorkflowFacts = {},
  options?: { newProject?: boolean },
) {
  return buildWorkflowProgress(activeStep, facts, options).steps.map(
    (step) => step.state,
  );
}

describe("workflow progress", () => {
  it("shows only the current grouped screen instead of ten global stages", () => {
    expect(buildWorkflowProgress(3, {}).steps).toHaveLength(4);
    expect(buildWorkflowProgress(4, {}).steps).toHaveLength(4);
    expect(buildWorkflowProgress(2, {}).steps).toHaveLength(3);
    expect(buildWorkflowProgress(1, {}).title).toBe("Step 1 · Interpretation");
    expect(buildWorkflowProgress(3, {}).title).toBe(
      "Steps 3–8 · Evidence → feasibility",
    );
  });

  it("tracks Step 1 proposal review and confirmation", () => {
    expect(states(1, {})).toEqual(["current", "pending", "pending"]);
    expect(
      states(1, { interpretationStatus: "PROPOSED" }),
    ).toEqual(["complete", "current", "pending"]);
    expect(
      states(1, { interpretationStatus: "USER_CONFIRMED" }),
    ).toEqual(["complete", "complete", "complete"]);
  });

  it("tracks Step 2 generation, review and handoff", () => {
    expect(states(2, {})).toEqual(["current", "pending", "pending"]);
    expect(
      states(2, {
        decompositionGenerated: true,
        decompositionReady: false,
      }),
    ).toEqual(["complete", "current", "pending"]);
    expect(
      states(2, {
        decompositionGenerated: true,
        decompositionReady: true,
      }),
    ).toEqual(["complete", "complete", "complete"]);
  });

  it("maps the four research substeps to their actual data gates", () => {
    expect(
      states(3, {
        selectedSourceCount: 2,
        gapCount: 1,
      }),
    ).toEqual(["complete", "complete", "current", "pending"]);
    expect(
      states(3, {
        selectedSourceCount: 2,
        gapCount: 1,
        claimCount: 1,
        experimentPlanCount: 1,
        feasibilityEstimateCount: 1,
      }),
    ).toEqual(["complete", "complete", "complete", "complete"]);
  });

  it("keeps final review progress tied to specification, judges, decision and export", () => {
    expect(
      states(4, {
        specificationSectionCount: 14,
        judgeFindingCount: 3,
        hasRevisionDecision: true,
        finalized: false,
      }),
    ).toEqual(["complete", "complete", "complete", "current"]);
    expect(
      states(4, {
        specificationSectionCount: 14,
        judgeFindingCount: 3,
        hasRevisionDecision: true,
        finalized: true,
      }),
    ).toEqual(["complete", "complete", "complete", "complete"]);
  });

  it("uses a separate creation progress on the new-project screen", () => {
    expect(states(1, {}, { newProject: true })).toEqual([
      "current",
      "pending",
      "pending",
    ]);
  });
});
