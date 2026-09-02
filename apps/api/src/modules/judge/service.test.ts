import type { Finding, JudgeReport } from "@specloop/schemas";
import { describe, expect, it } from "vitest";
import { computeConsensus } from "./service.js";

let findingCounter = 0;
function finding(overrides: Partial<Finding> = {}): Finding {
  findingCounter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(findingCounter).padStart(12, "0")}`,
    judge: "GAP",
    targetSection: "Research gap",
    severity: "MAJOR",
    issue: "issue",
    reason: "reason",
    recommendation: "recommendation",
    ...overrides,
  };
}

function report(judge: JudgeReport["judge"], findings: Finding[]): JudgeReport {
  return { judge, summary: `${judge} summary`, findings };
}

describe("computeConsensus", () => {
  it("returns a null overall severity and readyToFinalize=true when no Judge raised a finding", () => {
    const reports: JudgeReport[] = [
      report("GAP", []),
      report("CONTRIBUTION", []),
      report("EXPERIMENT", []),
      report("EVIDENCE", []),
      report("CONFERENCE_READINESS", []),
    ];

    const consensus = computeConsensus(reports);

    expect(consensus.overallSeverity).toBeNull();
    expect(consensus.severityCounts).toEqual({
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
    });
    expect(consensus.agreedSections).toEqual([]);
    expect(consensus.readyToFinalize).toBe(true);
  });

  it("takes the worst severity across all Judges as overallSeverity", () => {
    const reports: JudgeReport[] = [
      report("GAP", [finding({ judge: "GAP", severity: "MINOR" })]),
      report("EVIDENCE", [
        finding({ judge: "EVIDENCE", severity: "CRITICAL" }),
      ]),
      report("EXPERIMENT", [
        finding({ judge: "EXPERIMENT", severity: "MAJOR" }),
      ]),
    ];

    const consensus = computeConsensus(reports);

    expect(consensus.overallSeverity).toBe("CRITICAL");
    expect(consensus.severityCounts).toEqual({
      CRITICAL: 1,
      MAJOR: 1,
      MINOR: 1,
    });
    expect(consensus.readyToFinalize).toBe(false);
  });

  it("marks readyToFinalize=true when only MINOR (advisory) findings exist", () => {
    const reports: JudgeReport[] = [
      report("CONFERENCE_READINESS", [
        finding({ judge: "CONFERENCE_READINESS", severity: "MINOR" }),
      ]),
    ];

    const consensus = computeConsensus(reports);

    expect(consensus.overallSeverity).toBe("MINOR");
    expect(consensus.readyToFinalize).toBe(true);
  });

  it("flags a section as agreed only when two or more distinct Judges raise it", () => {
    const reports: JudgeReport[] = [
      report("GAP", [
        finding({ judge: "GAP", targetSection: "Generalization claim" }),
      ]),
      report("EXPERIMENT", [
        finding({ judge: "EXPERIMENT", targetSection: "generalization claim" }), // same section, different case
      ]),
      report("EVIDENCE", [
        finding({ judge: "EVIDENCE", targetSection: "Baseline set" }), // only one Judge flags this
      ]),
    ];

    const consensus = computeConsensus(reports);

    expect(consensus.agreedSections).toEqual(["Generalization claim"]);
  });

  it("does not double count the same Judge flagging the same section twice", () => {
    const reports: JudgeReport[] = [
      report("GAP", [
        finding({ judge: "GAP", targetSection: "Research gap" }),
        finding({ judge: "GAP", targetSection: "Research gap" }),
      ]),
    ];

    const consensus = computeConsensus(reports);

    expect(consensus.agreedSections).toEqual([]);
    expect(consensus.severityCounts.MAJOR).toBe(2);
  });
});
