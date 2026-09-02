import type {
  JudgePanelResult,
  JudgeReport,
  ResearchSpec,
} from "@specloop/schemas";
import type OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "../../db/client.js";
import { judgePanels, projects, researchSpecs } from "../../db/schema.js";
import { resetProjectStore } from "../../store/project-store.js";
import { computeConsensus } from "../judge/service.js";
import {
  computeSpecDiff,
  diffResearchSpecVersions,
  finalizeResearchSpec,
  listFindingResolutions,
  RevisionError,
  recordFindingResolution,
  rerunJudge,
} from "./service.js";

const PROJECT_ID = "00000000-0000-4000-8000-0000000000aa";
const FINDING_ID = "00000000-0000-4000-8000-0000000000f1";

function ensureProject(): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(projects)
    .values({
      id: PROJECT_ID,
      title: "Test Project",
      domain: null,
      rawIdea: "placeholder",
      resourceConstraints: "[]",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function report(
  judge: JudgeReport["judge"],
  findings: JudgeReport["findings"]
): JudgeReport {
  return { judge, summary: `${judge} summary`, findings };
}

function seedPanel(overrides?: Partial<JudgeReport>): JudgePanelResult {
  const evidenceReport = report("EVIDENCE", [
    {
      id: FINDING_ID,
      judge: "EVIDENCE",
      targetSection: "Claim 1",
      severity: "MAJOR",
      issue: "Evidence link is INVALID_OFFSET.",
      reason: "Cannot verify the claim without a valid evidence span.",
      recommendation: "Re-link the claim to a valid evidence span.",
    },
  ]);
  const reports = [
    report("GAP", []),
    report("CONTRIBUTION", []),
    report("EXPERIMENT", []),
    { ...evidenceReport, ...overrides },
    report("CONFERENCE_READINESS", []),
  ];
  const panel: JudgePanelResult = {
    id: "11111111-1111-4111-8111-111111111111",
    projectId: PROJECT_ID,
    judges: reports,
    consensus: computeConsensus(reports),
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  ensureProject();
  const db = getDb();
  db.insert(judgePanels)
    .values({
      id: panel.id,
      projectId: PROJECT_ID,
      experimentPlanId: null,
      data: JSON.stringify(panel),
      createdAt: panel.createdAt,
    })
    .run();
  return panel;
}

function seedSpecVersion(
  version: number,
  claimEvidenceContent: string
): ResearchSpec {
  const sectionIds = [
    "PROBLEM_STATEMENT",
    "RESEARCH_QUESTIONS",
    "RELATED_WORK_MATRIX",
    "RESEARCH_GAP",
    "PROPOSED_APPROACH",
    "EXPECTED_CONTRIBUTIONS",
    "CLAIM_EVIDENCE_MATRIX",
    "EXPERIMENTAL_PROTOCOL",
    "BASELINES_AND_METRICS",
    "ABLATION_PLAN",
    "COMPUTE_BUDGET",
    "RISKS_AND_LIMITATIONS",
    "OPEN_ISSUES",
    "DECISION_HISTORY",
  ] as const;
  const spec: ResearchSpec = {
    id: `00000000-0000-4000-8000-00000000000${version}`,
    projectId: PROJECT_ID,
    version,
    status: "DRAFT",
    finalizedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    sections: sectionIds.map((id) => ({
      id,
      title: id,
      isPlaceholder: false,
      content:
        id === "CLAIM_EVIDENCE_MATRIX"
          ? claimEvidenceContent
          : `content for ${id}`,
    })),
  };
  ensureProject();
  const db = getDb();
  db.insert(researchSpecs)
    .values({
      id: spec.id,
      projectId: PROJECT_ID,
      judgePanelId: null,
      version: String(spec.version),
      data: JSON.stringify(spec),
      createdAt: spec.createdAt,
    })
    .run();
  return spec;
}

function fakeJudgeClient(content: string): OpenAI {
  const create = vi.fn().mockResolvedValueOnce({
    choices: [{ message: { content } }],
  });
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

beforeEach(() => {
  resetProjectStore();
});

describe("computeSpecDiff", () => {
  it("marks a section changed only when its content differs between versions", () => {
    const before = seedSpecVersion(
      1,
      "| Claim | Evidence |\n| c1 | (không có evidence) |"
    );
    const after = seedSpecVersion(
      2,
      "| Claim | Evidence |\n| c1 | valid quote |"
    );

    const diff = computeSpecDiff(before, after);
    const claimRow = diff.find((d) => d.sectionId === "CLAIM_EVIDENCE_MATRIX");
    const problemRow = diff.find((d) => d.sectionId === "PROBLEM_STATEMENT");

    expect(claimRow?.changed).toBe(true);
    expect(claimRow?.before).toContain("không có evidence");
    expect(claimRow?.after).toContain("valid quote");
    expect(problemRow?.changed).toBe(false);
  });
});

describe("recordFindingResolution", () => {
  it("throws when no Judge panel has run yet", () => {
    expect(() =>
      recordFindingResolution({
        projectId: PROJECT_ID,
        findingId: FINDING_ID,
        resolution: "RESOLVED",
        note: "fixed the link",
      })
    ).toThrow(RevisionError);
  });

  it("records a decision and copies judge/targetSection from the finding", () => {
    seedPanel();

    const record = recordFindingResolution({
      projectId: PROJECT_ID,
      findingId: FINDING_ID,
      resolution: "RESOLVED",
      note: "Re-linked the claim to a valid evidence span.",
    });

    expect(record.judge).toBe("EVIDENCE");
    expect(record.targetSection).toBe("Claim 1");
    expect(listFindingResolutions(PROJECT_ID)).toHaveLength(1);
  });

  it("throws when the finding id is not in the latest panel", () => {
    seedPanel();
    expect(() =>
      recordFindingResolution({
        projectId: PROJECT_ID,
        findingId: "non-existent",
        resolution: "DISMISSED",
        note: "not applicable",
      })
    ).toThrow(RevisionError);
  });
});

describe("rerunJudge", () => {
  it("replaces only the target Judge's report and recomputes consensus", async () => {
    seedPanel();
    const client = fakeJudgeClient(
      JSON.stringify({ summary: "Evidence now checks out.", findings: [] })
    );

    const updated = await rerunJudge({
      projectId: PROJECT_ID,
      judge: "EVIDENCE",
      client,
      model: "gpt-4o-mini",
    });

    const evidenceReport = updated.judges.find((r) => r.judge === "EVIDENCE");
    expect(evidenceReport?.findings).toHaveLength(0);
    expect(evidenceReport?.summary).toBe("Evidence now checks out.");
    // Other Judges' reports must be untouched.
    expect(
      updated.judges.find((r) => r.judge === "GAP")?.findings
    ).toHaveLength(0);
    // Consensus must reflect the resolved MAJOR finding disappearing.
    expect(updated.consensus.severityCounts.MAJOR).toBe(0);
    expect(updated.consensus.readyToFinalize).toBe(true);
  });

  it("throws when no panel exists yet", async () => {
    const client = fakeJudgeClient(
      JSON.stringify({ summary: "ok", findings: [] })
    );
    await expect(
      rerunJudge({
        projectId: PROJECT_ID,
        judge: "EVIDENCE",
        client,
        model: "gpt-4o-mini",
      })
    ).rejects.toThrow(RevisionError);
  });
});

describe("diffResearchSpecVersions", () => {
  it("throws a RevisionError when a requested version does not exist", () => {
    seedSpecVersion(1, "content v1");
    expect(() =>
      diffResearchSpecVersions({
        projectId: PROJECT_ID,
        fromVersion: 1,
        toVersion: 2,
      })
    ).toThrow(RevisionError);
  });

  it("returns the section diff between two existing versions", () => {
    seedSpecVersion(1, "before");
    seedSpecVersion(2, "after");
    const result = diffResearchSpecVersions({
      projectId: PROJECT_ID,
      fromVersion: 1,
      toVersion: 2,
    });
    expect(
      result.sections.find((s) => s.sectionId === "CLAIM_EVIDENCE_MATRIX")
        ?.changed
    ).toBe(true);
  });
});

describe("finalizeResearchSpec", () => {
  it("blocks finalization when the latest panel still has a CRITICAL finding", () => {
    seedSpecVersion(1, "content");
    seedPanel({
      findings: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          judge: "EVIDENCE",
          targetSection: "Claim 1",
          severity: "CRITICAL",
          issue: "No evidence at all.",
          reason: "Claim has zero evidence links.",
          recommendation: "Attach evidence before finalizing.",
        },
      ],
    });

    expect(() =>
      finalizeResearchSpec({ projectId: PROJECT_ID, version: 1 })
    ).toThrow(RevisionError);
  });

  it("finalizes successfully once no CRITICAL finding remains", () => {
    seedSpecVersion(1, "content");
    seedPanel({ findings: [] }); // EVIDENCE report now clean

    const result = finalizeResearchSpec({ projectId: PROJECT_ID, version: 1 });

    expect(result.status).toBe("FINALIZED");
    expect(result.finalizedAt).not.toBeNull();
  });

  it("throws when no Judge panel has ever run", () => {
    seedSpecVersion(1, "content");
    expect(() =>
      finalizeResearchSpec({ projectId: PROJECT_ID, version: 1 })
    ).toThrow(RevisionError);
  });
});
