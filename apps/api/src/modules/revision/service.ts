/**
 * Revision service (Bước 10 — "Người dùng quyết định sửa đổi").
 *
 * Closes the loop described in the assignment:
 *   Sửa spec → Hiển thị phần thay đổi → Chạy lại verifier liên quan
 *   → Judge kiểm tra lại → Người dùng xác nhận bản cuối
 *
 * This module does not edit claims/contributions/evidence itself — those
 * already have their own routers (research-design, evidence, decomposition).
 * What it owns is the *decision loop wrapper* around an edit:
 *   1. record what the user decided about a specific Judge finding
 *      (`recordFindingResolution`)
 *   2. re-run only the one Judge whose area was just edited, never the
 *      whole panel (`rerunJudge`)
 *   3. diff two research-spec versions so "phần thay đổi" is visible
 *      (`diffResearchSpecVersions`)
 *   4. let the user finalize a version once it is ready (`finalizeResearchSpec`)
 *
 * The user is the only actor who can finalize; the app never marks a spec
 * FINALIZED on its own, and a CRITICAL Judge finding hard-blocks it.
 */

import {
  FindingResolutionSchema,
  JudgePanelResultSchema,
  ResearchSpecSchema,
  SPEC_SECTION_ORDER,
  type DiffResearchSpecVersionsOutput,
  type Finding,
  type FindingResolution,
  type JudgeName,
  type JudgePanelResult,
  type ResearchSpec,
  type SpecSectionDiff,
} from "@specloop/schemas";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { computeConsensus, runJudge } from "../judge/service.js";
import { parseOrThrow } from "../../store/project-store.js";
import { getDb } from "../../db/client.js";
import {
  findingResolutions,
  judgePanels,
  researchSpecs,
} from "../../db/schema.js";

export class RevisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RevisionError";
  }
}

function fetchJudgePanel(projectId: string): JudgePanelResult | null {
  const db = getDb();
  const row = db.select().from(judgePanels).where(eq(judgePanels.projectId, projectId)).orderBy(desc(judgePanels.createdAt)).limit(1).get();
  if (!row) return null;
  return parseOrThrow(JudgePanelResultSchema, JSON.parse(row.data as string), "JudgePanelResult");
}

function fetchResearchSpecs(projectId: string): ResearchSpec[] {
  const db = getDb();
  const rows = db.select().from(researchSpecs).where(eq(researchSpecs.projectId, projectId)).orderBy(asc(researchSpecs.createdAt)).all();
  return rows.map((r) => parseOrThrow(ResearchSpecSchema, JSON.parse(r.data as string), "ResearchSpec"));
}

function fetchFindingResolutions(projectId: string): FindingResolution[] {
  const db = getDb();
  const rows = db.select().from(findingResolutions).where(eq(findingResolutions.projectId, projectId)).orderBy(asc(findingResolutions.createdAt)).all();
  return rows.map((r) => parseOrThrow(FindingResolutionSchema, JSON.parse(r.data as string), "FindingResolution"));
}

function findFindingInLatestPanel(
  projectId: string,
  findingId: string,
): { panel: JudgePanelResult; finding: Finding } {
  const panel = fetchJudgePanel(projectId);
  if (!panel) {
    throw new RevisionError(
      "No Judge panel has been run yet for this project (judge.runPanel).",
    );
  }
  for (const report of panel.judges) {
    const finding = report.findings.find((f) => f.id === findingId);
    if (finding) return { panel, finding };
  }
  throw new RevisionError(
    `Finding ${findingId} was not found in the latest Judge panel.`,
  );
}

/**
 * Record the user's decision about one Judge finding. Purely a log entry —
 * it does not touch the underlying claim/contribution/evidence data; the
 * user makes that edit through the relevant module's own endpoints, then
 * records the resolution here and (usually) calls `rerunJudge`.
 */
export function recordFindingResolution(input: {
  projectId: string;
  findingId: string;
  resolution: FindingResolution["resolution"];
  note: string;
}): FindingResolution {
  const { finding } = findFindingInLatestPanel(input.projectId, input.findingId);

  const record: FindingResolution = parseOrThrow(
    FindingResolutionSchema,
    {
      id: crypto.randomUUID(),
      projectId: input.projectId,
      findingId: input.findingId,
      judge: finding.judge,
      targetSection: finding.targetSection,
      resolution: input.resolution,
      note: input.note,
      createdAt: new Date().toISOString(),
    },
    "FindingResolution",
  );

  const db = getDb();
  // Fetch panel id for FK
  const panel = fetchJudgePanel(input.projectId)!;
  db.insert(findingResolutions)
    .values({
      id: record.id,
      projectId: input.projectId,
      judgePanelId: panel.id,
      data: JSON.stringify(record),
      createdAt: record.createdAt,
    })
    .run();
  return record;
}

export function listFindingResolutions(projectId: string): FindingResolution[] {
  return fetchFindingResolutions(projectId);
}

/**
 * Re-run exactly one Judge against the project's current (presumably just
 * edited) data, and merge its fresh report into the existing panel —
 * "chạy lại verifier liên quan", not the whole panel. Consensus is
 * recomputed deterministically over the merged set of reports.
 */
export async function rerunJudge(params: {
  projectId: string;
  judge: JudgeName;
  client: any;
  model: string;
}): Promise<JudgePanelResult> {
  const { projectId, judge, client, model } = params;
  const existingPanel = fetchJudgePanel(projectId);
  if (!existingPanel) {
    throw new RevisionError(
      "No Judge panel has been run yet for this project (judge.runPanel).",
    );
  }

  const freshReport = await runJudge({ judge, projectId, client, model });
  const mergedReports = existingPanel.judges.map((report) =>
    report.judge === judge ? freshReport : report,
  );
  const consensus = computeConsensus(mergedReports);

  const updatedPanel: JudgePanelResult = parseOrThrow(
    JudgePanelResultSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      judges: mergedReports,
      consensus,
      createdAt: new Date().toISOString(),
    },
    "JudgePanelResult",
  );

  const db = getDb();
  // Keep FK to latest experiment plan
  // Find latest experiment plan id via judge panel's experimentPlanId or via direct lookup
  const latestPanelRow = db.select().from(judgePanels).where(eq(judgePanels.projectId, projectId)).orderBy(desc(judgePanels.createdAt)).limit(1).get();
  const experimentPlanId = (latestPanelRow as any)?.experimentPlanId ?? null;
  db.insert(judgePanels)
    .values({
      id: updatedPanel.id,
      projectId,
      experimentPlanId,
      data: JSON.stringify(updatedPanel),
      createdAt: updatedPanel.createdAt,
    })
    .run();
  return updatedPanel;
}

/**
 * Deterministic section-by-section diff between two research-spec
 * versions — "hiển thị phần thay đổi" from the assignment's Bước 10.
 * Pure and exported separately so it can be unit-tested without the store.
 */
export function computeSpecDiff(
  fromSpec: ResearchSpec,
  toSpec: ResearchSpec,
): SpecSectionDiff[] {
  const fromById = new Map(fromSpec.sections.map((s) => [s.id, s]));
  const toById = new Map(toSpec.sections.map((s) => [s.id, s]));

  return SPEC_SECTION_ORDER.map((id) => {
    const before = fromById.get(id) ?? null;
    const after = toById.get(id) ?? null;
    return {
      sectionId: id,
      title: (after ?? before)?.title ?? id,
      before: before?.content ?? null,
      after: after?.content ?? null,
      changed: (before?.content ?? null) !== (after?.content ?? null),
    };
  });
}

export function diffResearchSpecVersions(params: {
  projectId: string;
  fromVersion: number;
  toVersion: number;
}): DiffResearchSpecVersionsOutput {
  const { projectId, fromVersion, toVersion } = params;
  const versions = fetchResearchSpecs(projectId);
  const fromSpec = versions.find((v) => v.version === fromVersion);
  const toSpec = versions.find((v) => v.version === toVersion);

  if (!fromSpec) throw new RevisionError(`Research spec version ${fromVersion} not found.`);
  if (!toSpec) throw new RevisionError(`Research spec version ${toVersion} not found.`);

  return {
    fromVersion,
    toVersion,
    sections: computeSpecDiff(fromSpec, toSpec),
  };
}

/**
 * User confirms the final version (Bước 10's last step). Blocked only by
 * an unresolved CRITICAL Judge finding — MAJOR/MINOR are surfaced to the
 * user elsewhere but never silently block their own decision, consistent
 * with "AI has no direct authority" everywhere else in this codebase.
 */
export function finalizeResearchSpec(params: {
  projectId: string;
  version: number;
}): ResearchSpec {
  const { projectId, version } = params;
  const versions = fetchResearchSpecs(projectId);
  const index = versions.findIndex((v) => v.version === version);
  if (index === -1) {
    throw new RevisionError(`Research spec version ${version} not found.`);
  }

  // Use JOIN to check overallSeverity without separate lookups: SELECT judge_panels.data FROM judge_panels WHERE project_id = ?
  const db = getDb();
  const panelRow = db.select().from(judgePanels).where(eq(judgePanels.projectId, projectId)).orderBy(desc(judgePanels.createdAt)).limit(1).get();
  if (!panelRow) {
    throw new RevisionError(
      "Run the Judge panel before finalizing a research spec (judge.runPanel).",
    );
  }
  const panel = parseOrThrow(JudgePanelResultSchema, JSON.parse(panelRow.data as string), "JudgePanelResult");
  if (panel.consensus.severityCounts.CRITICAL > 0) {
    throw new RevisionError(
      "Cannot finalize: the latest Judge panel still has unresolved CRITICAL findings.",
    );
  }

  const finalized: ResearchSpec = parseOrThrow(
    ResearchSpecSchema,
    {
      ...versions[index],
      status: "FINALIZED",
      finalizedAt: new Date().toISOString(),
    },
    "ResearchSpec",
  );

  // Update DB row
  db.update(researchSpecs)
    .set({
      data: JSON.stringify(finalized),
    })
    .where(and(eq(researchSpecs.projectId, projectId), eq(researchSpecs.id, finalized.id)))
    .run();

  return finalized;
}
