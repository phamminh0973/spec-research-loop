export type MarkdownSection = readonly [title: string, content: string];

export type MarkdownJudge = {
  name: string;
  focus: string;
  score: string;
  finding: string;
};

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
  return [
    "# SpecLoop Research Specification",
    "",
    ...sections.flatMap(([title, content]) => [
      `## ${title}`,
      "",
      content,
      "",
    ]),
    "## Judge review",
    "",
    ...judges.flatMap((judge) => [
      `### ${judge.name}`,
      `- Focus: ${judge.focus}`,
      `- Severity: ${judge.score}`,
      `- Finding: ${judge.finding}`,
      "",
    ]),
    "## User revision decision",
    "",
    `Decision: ${decision}`,
    ...(custom.trim() ? [`Other: ${custom.trim()}`] : []),
    `Version: ${version}`,
    "",
    finalized ? "Status: FINALIZED" : "Status: DRAFT",
  ].join("\n");
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
