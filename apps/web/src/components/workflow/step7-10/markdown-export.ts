import { MarkdownDocument } from "build-md";
import type {
  JudgePanelResult,
  ResearchSpec,
  SpecSection,
} from "@specloop/schemas";

export type MarkdownSection = readonly [title: string, content: string];

export type MarkdownJudge = {
  name: string;
  focus: string;
  score: string;
  finding: string;
};

/** Convert a persisted ResearchSpec's sections to the MarkdownSection tuple used by the exporter. */
export function researchSpecToMarkdownSections(
  sections: readonly SpecSection[],
): MarkdownSection[] {
  return sections.map((s) => [s.title, s.content] as const);
}

/** Map the five Judge reports in a panel to the MarkdownJudge rows used by the exporter. */
export function judgePanelToMarkdownJudges(
  panel: JudgePanelResult | null | undefined,
): MarkdownJudge[] {
  if (!panel) return [];
  return panel.judges.map((report) => {
    const focus = report.findings.map((f) => f.targetSection).join(", ") || "general review";
    const score = report.findings[0]?.severity ?? "NONE";
    const finding =
      report.findings.length > 0
        ? report.findings
            .map((f) => `${f.severity}: ${f.issue} — ${f.recommendation}`)
            .join(" | ")
        : report.summary;
    return { name: report.judge, focus, score, finding };
  });
}

/**
 * Build markdown sections directly from a ResearchSpec without going through
 * the MarkdownJudge aggregation — useful when the caller already has the typed
 * spec and panel.
 */
export function buildResearchSpecMarkdownFromSpec(params: {
  spec: ResearchSpec;
  panel?: JudgePanelResult | null;
  decision?: string;
  custom?: string;
}): string {
  const sections = researchSpecToMarkdownSections(params.spec.sections);
  const judges = judgePanelToMarkdownJudges(params.panel ?? null);
  return buildResearchSpecMarkdown({
    sections,
    judges,
    decision: params.decision ?? "Narrow claim",
    custom: params.custom ?? "",
    version: params.spec.version,
    finalized: params.spec.status === "FINALIZED",
  });
}

export function getResearchSpecFilename(version: number) {
  return `specloop-research-spec-v${Math.max(1, Math.floor(version))}.md`;
}

export function buildResearchSpecMarkdown({
  sections,
  judges,
  decision,
  custom,
  version,
  finalized,
}: {
  sections: readonly MarkdownSection[];
  judges: readonly MarkdownJudge[];
  decision: string;
  custom: string;
  version: number;
  finalized: boolean;
}) {
  const doc = new MarkdownDocument()
    .heading(1, "SpecLoop Research Specification")
    .$foreach([...sections], (d, [title, content]) =>
      d.heading(2, title).paragraph(content),
    )
    .heading(2, "Judge review")
    .$foreach([...judges], (d, judge) =>
      d
        .heading(3, judge.name)
        .list([
          `Focus: ${judge.focus}`,
          `Severity: ${judge.score}`,
          `Finding: ${judge.finding}`,
        ]),
    )
    .heading(2, "User revision decision")
    .paragraph(`Decision: ${decision}`)
    .$if(Boolean(custom.trim()), (d) => d.paragraph(`Other: ${custom.trim()}`))
    .paragraph(`Version: ${version}`)
    .paragraph(finalized ? "Status: FINALIZED" : "Status: DRAFT");

  return doc.toString().trim();
}

export function downloadMarkdown(body: string, filename: string) {
  const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
