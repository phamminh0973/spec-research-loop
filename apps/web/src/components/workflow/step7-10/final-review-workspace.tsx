"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Download,
  FileText,
  GitCompare,
  RefreshCw,
  Scale,
  ShieldCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AppShell } from "../shared/app-shell";
import { ApiErrorMessage } from "../shared/api-error-message";
import { SectionCard, SectionHeader } from "../shared/section-card";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  buildResearchSpecMarkdown,
  buildResearchSpecMarkdownFromSpec,
  downloadMarkdown,
  getResearchSpecFilename,
  judgePanelToMarkdownJudges,
  researchSpecToMarkdownSections,
  type MarkdownJudge,
  type MarkdownSection,
} from "./markdown-export";
import { trpc } from "@/lib/trpc";
import type { FindingResolutionKind } from "@specloop/schemas";

type Props = { projectId: string; fixtureMode: boolean };

const fixtureSections: MarkdownSection[] = [
  ["1. Problem statement", "Research ideas are often underspecified, making gap, claim and experiment quality difficult to verify."],
  ["2. Research questions", "Does claim-level evidence feedback reduce unsupported claims under a fixed inference budget?"],
  ["3. Related-work matrix", "Compare prompt optimization, self-refinement and evidence-grounded approaches using source-linked observations."],
  ["4. Research gap", "It remains unclear whether independent claim-level evidence feedback improves support quality under the same inference budget."],
  ["5. Proposed approach", "Iteratively generate candidates, decompose outputs into claims, verify evidence support and feed claim-level errors back into optimization."],
  ["6. Expected contributions", "A claim-level evidence feedback framework, a verifier protocol and a controlled baseline comparison."],
  ["7. Claim–evidence matrix", "Each factual claim must point to provenance-backed evidence; unsupported claims remain explicitly flagged."],
  ["8. Experimental protocol", "Use identical model, dataset, token budget and number of calls across baselines and the proposed method."],
  ["9. Baselines and metrics", "Human prompt, self-refine and scalar-feedback optimizer; unsupported claim rate, support rate, contradiction rate and cost."],
  ["10. Ablation plan", "Remove claim decomposition, evidence verifier, textual feedback and candidate diversity one at a time."],
  ["11. Compute budget", "7B–8B model, 4-bit where applicable; candidates, rounds and evaluation samples are declared assumptions until measured."],
  ["12. Risks and limitations", "Corpus-bounded gap, judge bias, evidence availability, model/provider limits and small evaluation scope."],
  ["13. Open issues", "Full-text provenance, larger-domain generalization, measured cost/latency and independent-provider validation."],
  ["14. Decision history", "User confirmation is required before finalization; revisions create a new version rather than silently overwriting the previous draft."],
];

const fixtureJudges: MarkdownJudge[] = [
  { name: "Evidence Judge", focus: "citation/evidence support, orphan claims, provenance integrity", score: "MAJOR", finding: "Require provenance-backed evidence before presenting a claim as supported." },
  { name: "Research Judge", focus: "gap quality, contribution scope and overclaiming", score: "MINOR", finding: "Keep novelty language corpus-bounded; do not claim global novelty." },
  { name: "Experiment Judge", focus: "baseline fairness, metrics, ablations and feasibility", score: "MAJOR", finding: "Freeze model, data, token budget and call count; include a held-out set." },
];

const RESOLUTION_KINDS: FindingResolutionKind[] = ["RESOLVED", "DISMISSED", "DEFERRED"];

export function FinalReviewWorkspace({ projectId, fixtureMode }: Props) {
  // ---- fixture-only local state (preserved for local demo mode) ----
  const [fixtureDecision, setFixtureDecision] = useState("Narrow claim");
  const [fixtureCustom, setFixtureCustom] = useState("");
  const [fixtureVersion, setFixtureVersion] = useState(1);
  const [fixtureFinalized, setFixtureFinalized] = useState(false);

  // ---- API-backed state ----
  const [decision, setDecision] = useState("Narrow claim");
  const [custom, setCustom] = useState("");
  const [diffFrom, setDiffFrom] = useState<number | "">("");
  const [diffTo, setDiffTo] = useState<number | "">("");
  const [resolutionDrafts, setResolutionDrafts] = useState<
    Record<string, { resolution: FindingResolutionKind; note: string }>
  >({});

  const utils = trpc.useUtils();
  const enabled = !fixtureMode;

  const latestSpecQuery = trpc.specGeneration.getLatest.useQuery(
    { projectId },
    { enabled, retry: false },
  );
  const versionsQuery = trpc.specGeneration.listVersions.useQuery(
    { projectId },
    { enabled, retry: false },
  );
  const panelQuery = trpc.judge.getLatestPanel.useQuery(
    { projectId },
    { enabled, retry: false },
  );
  const resolutionsQuery = trpc.revision.listFindingResolutions.useQuery(
    { projectId },
    { enabled, retry: false },
  );

  const generateSpec = trpc.specGeneration.generate.useMutation({
    onSuccess: (next) => {
      utils.specGeneration.getLatest.setData({ projectId }, next);
      const prev = versionsQuery.data;
      if (prev) {
        utils.specGeneration.listVersions.setData({ projectId }, { items: [...prev.items, next] });
      } else {
        utils.specGeneration.listVersions.invalidate({ projectId });
      }
      setDiffFrom(next.version);
      setDiffTo(next.version);
    },
  });

  const runPanel = trpc.judge.runPanel.useMutation({
    onSuccess: (next) => {
      utils.judge.getLatestPanel.setData({ projectId }, next);
    },
  });

  const recordResolution = trpc.revision.recordFindingResolution.useMutation({
    onSuccess: () => {
      utils.revision.listFindingResolutions.invalidate({ projectId });
      utils.specGeneration.getLatest.invalidate({ projectId });
      utils.specGeneration.listVersions.invalidate({ projectId });
    },
  });

  const rerunJudge = trpc.revision.rerunJudge.useMutation({
    onSuccess: (next) => {
      utils.judge.getLatestPanel.setData({ projectId }, next);
    },
  });

  const finalize = trpc.revision.finalize.useMutation({
    onSuccess: (next) => {
      utils.specGeneration.getLatest.setData({ projectId }, next);
      const items = versionsQuery.data?.items ?? [];
      utils.specGeneration.listVersions.setData(
        { projectId },
        { items: items.map((v) => (v.version === next.version ? next : v)) },
      );
    },
  });

  // auto-select diff range when versions load
  useEffect(() => {
    const items = versionsQuery.data?.items;
    if (!items || items.length === 0) return;
    if (diffFrom === "" && diffTo === "") {
      if (items.length === 1) {
        const v = items[0];
        if (v) {
          setDiffFrom(v.version);
          setDiffTo(v.version);
        }
      } else {
        const a = items[items.length - 2];
        const b = items[items.length - 1];
        if (a && b) {
          setDiffFrom(a.version);
          setDiffTo(b.version);
        }
      }
    }
  }, [versionsQuery.data, diffFrom, diffTo]);

  const diffEnabled =
    enabled &&
    typeof diffFrom === "number" &&
    typeof diffTo === "number" &&
    diffFrom > 0 &&
    diffTo > 0;
  const diffQuery = trpc.revision.diffVersions.useQuery(
    { projectId, fromVersion: diffFrom as number, toVersion: diffTo as number },
    { enabled: diffEnabled, retry: false },
  );

  // derived
  const latestSpec = fixtureMode ? null : (latestSpecQuery.data ?? null);
  const versions = fixtureMode ? [] : (versionsQuery.data?.items ?? []);
  const panel = fixtureMode ? null : (panelQuery.data ?? null);
  const resolutions = fixtureMode ? [] : (resolutionsQuery.data?.items ?? []);

  const fixtureConsensus = useMemo(() => {
    const major = fixtureJudges.filter((j) => j.score === "MAJOR").length;
    return major >= 2 ? "MAJOR" : "MINOR";
  }, []);

  const consensus = panel?.consensus ?? null;
  const hasCritical = (consensus?.severityCounts.CRITICAL ?? 0) > 0;
  const allFindings = panel ? panel.judges.flatMap((r) => r.findings) : [];

  const pending =
    generateSpec.isPending ||
    runPanel.isPending ||
    recordResolution.isPending ||
    rerunJudge.isPending ||
    finalize.isPending;

  const apiError =
    latestSpecQuery.error ??
    versionsQuery.error ??
    panelQuery.error ??
    resolutionsQuery.error ??
    generateSpec.error ??
    runPanel.error ??
    recordResolution.error ??
    rerunJudge.error ??
    finalize.error ??
    diffQuery.error ??
    null;

  function exportMarkdown() {
    if (fixtureMode) {
      const body = buildResearchSpecMarkdown({
        sections: fixtureSections,
        judges: fixtureJudges,
        decision: fixtureDecision,
        custom: fixtureCustom,
        version: fixtureVersion,
        finalized: fixtureFinalized,
      });
      downloadMarkdown(body, getResearchSpecFilename(fixtureVersion));
      return;
    }
    if (!latestSpec) return;
    // Use the typed spec+panel path so export always reflects persisted data.
    // The user's decision/custom strings are included as provenance note in the markdown tail.
    const body = buildResearchSpecMarkdownFromSpec({
      spec: latestSpec,
      panel,
      decision,
      custom,
    });
    downloadMarkdown(body, getResearchSpecFilename(latestSpec.version));
  }

  function handleRecordFinding(findingId: string) {
    const draft = resolutionDrafts[findingId];
    if (!draft || !draft.note.trim()) return;
    recordResolution.mutate({
      projectId,
      findingId,
      resolution: draft.resolution,
      note: draft.note.trim(),
    });
  }

  // helpers to render API spec sections
  const specSections = latestSpec?.sections ?? [];
  const versionsForSelect = versions;

  return (
    <AppShell activeStep={4} projectId={projectId} fixtureMode={fixtureMode}>
      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-bold">9–10. Specification, Judges & Finalization</h1>
            <p className="mt-1 text-muted-foreground">Tạo bản spec 14 phần, đánh giá độc lập, cho user quyết định revision rồi export bản cuối.</p>
          </div>
        </div>

        {fixtureMode && (
          <Alert className="bg-amber-50 border-amber-200 text-amber-900">
            <AlertDescription>
              <strong>Local demonstration:</strong> spec và Judge findings ở màn hình này là fixture minh hoạ. Không được dùng chúng làm kết quả nghiên cứu thật.
            </AlertDescription>
          </Alert>
        )}

        <ApiErrorMessage error={apiError} title="Final review API error" showIcon />

        {/* ---- Specification ---- */}
        <SectionCard>
          <SectionHeader icon={FileText} title="Research specification — 14 sections" tone="blue" />
          <CardContent className="space-y-4">
            {fixtureMode ? (
              <div className="divide-y">
                {fixtureSections.map(([title, content]) => (
                  <div key={title} className="py-5">
                    <h3 className="font-semibold">{title}</h3>
                    <div className="mt-2 text-sm text-muted-foreground overflow-x-auto leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:px-2 [&_td]:py-1.5 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-2 [&_p]:leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => generateSpec.mutate({ projectId })} disabled={generateSpec.isPending}>
                    {generateSpec.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <FileText className="mr-2 size-4" />}
                    {latestSpec ? `Generate version ${(versions.length || 0) + 1}` : "Generate spec (14 sections)"}
                  </Button>
                  {latestSpec && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={latestSpec.status === "FINALIZED" ? "default" : "secondary"}>{latestSpec.status}</Badge>
                      <span className="text-muted-foreground">v{latestSpec.version}</span>
                      {latestSpec.finalizedAt && <span className="text-xs text-muted-foreground">finalized {latestSpec.finalizedAt.slice(0, 10)}</span>}
                    </div>
                  )}
                  {latestSpecQuery.isPending && <span className="text-sm text-muted-foreground">Loading spec…</span>}
                </div>

                {!latestSpec && !latestSpecQuery.isPending && (
                  <Alert className="bg-muted border-border">
                    <AlertDescription className="text-sm text-muted-foreground">
                      Chưa có ResearchSpec nào. Tạo decomposition graph trước (Step 2), sau đó nhấn <strong>Generate spec</strong>. Spec mới sẽ là DRAFT và chứa 14 sections — section thiếu dữ liệu sẽ ghi “(chưa có dữ liệu)” thay vì bịa.
                    </AlertDescription>
                  </Alert>
                )}

                {latestSpec && (
                  <div className="divide-y border-t">
                    {specSections.map((s) => (
                      <div key={s.id} className="py-5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{s.title}</h3>
                          {s.isPlaceholder && (
                            <Badge variant="secondary" className="text-xs">
                              placeholder
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground overflow-x-auto leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_td]:border [&_td]:px-2 [&_td]:py-1.5 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:my-2 [&_p]:leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{s.content}</ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {versionsForSelect.length > 0 && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <GitCompare size={16} /> Version history & diff
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">From</Label>
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={diffFrom}
                          onChange={(e) => setDiffFrom(e.target.value ? Number(e.target.value) : "")}
                        >
                          {versionsForSelect.map((v) => (
                            <option key={v.version} value={v.version}>
                              v{v.version} {v.status === "FINALIZED" ? "(FINALIZED)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">To</Label>
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={diffTo}
                          onChange={(e) => setDiffTo(e.target.value ? Number(e.target.value) : "")}
                        >
                          {versionsForSelect.map((v) => (
                            <option key={v.version} value={v.version}>
                              v{v.version} {v.status === "FINALIZED" ? "(FINALIZED)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      {diffQuery.isPending && <span className="text-xs text-muted-foreground">Comparing…</span>}
                    </div>
                    {diffQuery.data && (
                      <div className="space-y-2">
                        {diffQuery.data.sections.map((d) => (
                          <div key={d.sectionId} className="rounded-md border px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{d.title}</span>
                              <Badge variant={d.changed ? "destructive" : "secondary"} className="text-xs">
                                {d.changed ? "changed" : "unchanged"}
                              </Badge>
                            </div>
                            {d.changed && (
                              <div className="mt-2 grid gap-2 text-xs">
                                <div className="rounded bg-muted p-2">
                                  <span className="font-semibold">Before:</span> {d.before ? d.before.slice(0, 600) + (d.before.length > 600 ? "…" : "") : "—"}
                                </div>
                                <div className="rounded bg-muted p-2">
                                  <span className="font-semibold">After:</span> {d.after ? d.after.slice(0, 600) + (d.after.length > 600 ? "…" : "") : "—"}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </SectionCard>

        {/* ---- Judges ---- */}
        <SectionCard>
          <SectionHeader icon={Scale} title="Independent Judges" tone="purple" />
          <CardContent className="space-y-4">
            {fixtureMode ? (
              <>
                <div className="grid gap-4 lg:grid-cols-3">
                  {fixtureJudges.map((judge) => (
                    <div key={judge.name} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{judge.name}</h3>
                        <Badge variant={judge.score === "MAJOR" ? "destructive" : "secondary"}>{judge.score}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{judge.focus}</p>
                      <p className="mt-3 text-sm">{judge.finding}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <strong>Aggregation:</strong> consensus severity = <Badge className="ml-1">{fixtureConsensus}</Badge>. Judges are displayed independently; aggregation happens only after individual findings exist.
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => runPanel.mutate({ projectId })} disabled={runPanel.isPending}>
                    {runPanel.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <Scale className="mr-2 size-4" />}
                    {panel ? "Re-run all 5 Judges" : "Run Judge panel (5 independent)"}
                  </Button>
                  {panelQuery.isPending && <span className="text-sm text-muted-foreground">Loading panel…</span>}
                  {panel && (
                    <span className="text-xs text-muted-foreground">
                      Panel {panel.id.slice(0, 8)} · {panel.createdAt.slice(0, 19).replace("T", " ")}
                    </span>
                  )}
                </div>

                {!panel && !panelQuery.isPending && (
                  <Alert className="bg-muted border-border">
                    <AlertDescription className="text-sm text-muted-foreground">
                      Chưa chạy Judge panel. Cần decomposition graph (Step 2) rồi nhấn <strong>Run Judge panel</strong>. Năm Judge chạy song song và độc lập; không Judge nào đọc output của Judge khác.
                    </AlertDescription>
                  </Alert>
                )}

                {panel && (
                  <>
                    <div className="grid gap-4 lg:grid-cols-5">
                      {panel.judges.map((report) => (
                        <div key={report.judge} className="rounded-lg border p-4 flex flex-col">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-sm">{report.judge}</h3>
                            <Badge variant="outline" className="text-xs">
                              {report.findings.length} finding{report.findings.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{report.summary}</p>
                          <div className="mt-3 space-y-2">
                            {report.findings.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No issues raised in this area.</p>
                            ) : (
                              report.findings.map((f) => (
                                <div key={f.id} className="rounded border p-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Badge variant={f.severity === "CRITICAL" ? "destructive" : f.severity === "MAJOR" ? "secondary" : "outline"} className="text-[10px]">
                                      {f.severity}
                                    </Badge>
                                    <span className="font-medium truncate">{f.targetSection}</span>
                                  </div>
                                  <p className="mt-1 text-muted-foreground">
                                    <strong>Issue:</strong> {f.issue}
                                  </p>
                                  <p className="text-muted-foreground">
                                    <strong>Recommendation:</strong> {f.recommendation}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-auto pt-2"
                            onClick={() => rerunJudge.mutate({ projectId, judge: report.judge })}
                            disabled={rerunJudge.isPending}
                          >
                            {rerunJudge.isPending ? <RefreshCw className="mr-1 size-3 animate-spin" /> : <RefreshCw className="mr-1 size-3" />}
                            Re-run {report.judge}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>Consensus:</strong>
                        <Badge variant={consensus?.overallSeverity === "CRITICAL" ? "destructive" : consensus?.overallSeverity === "MAJOR" ? "secondary" : "outline"}>
                          {consensus?.overallSeverity ?? "NONE"}
                        </Badge>
                        <span className="text-muted-foreground">
                          CRITICAL {consensus?.severityCounts.CRITICAL ?? 0} · MAJOR {consensus?.severityCounts.MAJOR ?? 0} · MINOR {consensus?.severityCounts.MINOR ?? 0}
                        </span>
                        {consensus?.readyToFinalize ? <Badge variant="default">ready to finalize</Badge> : <Badge variant="secondary">not ready</Badge>}
                      </div>
                      {consensus?.agreedSections && consensus.agreedSections.length > 0 && (
                        <p className="text-xs text-muted-foreground">Sections flagged by ≥2 Judges: {consensus.agreedSections.join(", ")}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Aggregation is deterministic arithmetic over already-produced reports — never an LLM call.</p>
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </SectionCard>

        {/* ---- Revision decision ---- */}
        <SectionCard>
          <SectionHeader icon={ShieldCheck} title="User revision decision" tone="green" />
          <CardContent>
            {fixtureMode ? (
              <div className="space-y-4">
                <p className="text-sm">Claim hiện tại không nên khẳng định generalization ngoài domain đã test. Chọn cách xử lý:</p>
                <div className="flex flex-wrap gap-2">
                  {["Narrow claim", "Expand experiment", "Convert to research question"].map((item) => (
                    <Button key={item} variant={fixtureDecision === item ? "default" : "outline"} onClick={() => setFixtureDecision(item)}>
                      {fixtureDecision === item && <Check className="mr-1 size-4" />}
                      {item}
                    </Button>
                  ))}
                </div>
                <Textarea value={fixtureCustom} onChange={(e) => setFixtureCustom(e.target.value)} placeholder="Other — nhập quyết định riêng..." rows={3} />
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setFixtureVersion((v) => v + 1)}>
                    <GitCompare className="mr-2 size-4" />Create version {fixtureVersion + 1}
                  </Button>
                  <Button onClick={() => setFixtureFinalized(true)} disabled={!fixtureDecision}>
                    Confirm final version
                  </Button>
                </div>
                {fixtureFinalized && <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Version {fixtureVersion} đã được đánh dấu FINALIZED trong phiên UI này. Production persistence/version API vẫn cần được nối nếu dùng ngoài fixture.</div>}
              </div>
            ) : (
              <div className="space-y-6">
                {allFindings.length === 0 && (
                  <Alert className="bg-muted border-border">
                    <AlertDescription className="text-sm text-muted-foreground">
                      Chưa có finding nào để quyết định. Chạy Judge panel trước. Mỗi finding là một dòng riêng — bạn chỉ ghi nhận quyết định của mình (RESOLVED/DISMISSED/DEFERRED) và note; việc sửa dữ liệu gốc (claim, evidence…) thực hiện qua module riêng của nó.
                    </AlertDescription>
                  </Alert>
                )}

                {allFindings.map((finding) => {
                  const draft = resolutionDrafts[finding.id] ?? { resolution: "RESOLVED" as FindingResolutionKind, note: "" };
                  const existing = resolutions.find((r) => r.findingId === finding.id);
                  return (
                    <div key={finding.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{finding.judge}</Badge>
                            <Badge variant={finding.severity === "CRITICAL" ? "destructive" : finding.severity === "MAJOR" ? "secondary" : "outline"}>{finding.severity}</Badge>
                            <span className="text-sm font-semibold">{finding.targetSection}</span>
                          </div>
                          <p className="mt-2 text-sm">
                            <strong>Issue:</strong> {finding.issue}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Why:</strong> {finding.reason}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Recommendation:</strong> {finding.recommendation}
                          </p>
                        </div>
                      </div>
                      {existing && (
                        <div className="rounded bg-emerald-50 p-2 text-xs text-emerald-800">
                          Already recorded: <strong>{existing.resolution}</strong> — {existing.note} ({existing.createdAt.slice(0, 19).replace("T", " ")})
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-xs">Resolution</Label>
                        <select
                          className="rounded-md border bg-background px-2 py-1 text-sm"
                          value={draft.resolution}
                          onChange={(e) =>
                            setResolutionDrafts((prev) => ({
                              ...prev,
                              [finding.id]: { ...draft, resolution: e.target.value as FindingResolutionKind },
                            }))
                          }
                        >
                          {RESOLUTION_KINDS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Textarea
                        placeholder="Note — required even for RESOLVED (what changed and why)..."
                        value={draft.note}
                        onChange={(e) =>
                          setResolutionDrafts((prev) => ({
                            ...prev,
                            [finding.id]: { ...draft, note: e.target.value },
                          }))
                        }
                        rows={2}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleRecordFinding(finding.id)}
                        disabled={recordResolution.isPending || !draft.note.trim()}
                      >
                        <Check className="mr-1 size-4" /> Save {draft.resolution}
                      </Button>
                    </div>
                  );
                })}

                {/* Resolution history */}
                {resolutions.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h4 className="text-sm font-semibold">Decision history ({resolutions.length})</h4>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {resolutions.map((r) => (
                        <li key={r.id}>
                          [{r.createdAt.slice(0, 19).replace("T", " ")}] {r.judge} / “{r.targetSection}” → {r.resolution}: {r.note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Finalize */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <h4 className="text-sm font-semibold">Finalize</h4>
                    {latestSpec && <Badge variant={latestSpec.status === "FINALIZED" ? "default" : "secondary"}>{latestSpec.status} v{latestSpec.version}</Badge>}
                    {hasCritical && (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle size={14} /> blocked by CRITICAL
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    CRITICAL findings block finalization; MAJOR/MINOR are advisory — quyết định cuối luôn thuộc về bạn. Finalize hoạt động trên version hiện tại ({latestSpec ? `v${latestSpec.version}` : "chưa có spec"}).
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => latestSpec && finalize.mutate({ projectId, version: latestSpec.version })}
                      disabled={!latestSpec || finalize.isPending || hasCritical}
                    >
                      {finalize.isPending ? <RefreshCw className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
                      Confirm final version
                    </Button>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Export decision note</Label>
                      <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Other — note for export..." className="h-9 w-64" />
                    </div>
                  </div>
                  {latestSpec?.status === "FINALIZED" && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Version {latestSpec.version} đã FINALIZED lúc {latestSpec.finalizedAt?.slice(0, 19).replace("T", " ") ?? ""}.</div>}
                  {/* keep decision picker for export semantics */}
                  <div className="flex flex-wrap gap-2">
                    {["Narrow claim", "Expand experiment", "Convert to research question"].map((item) => (
                      <Button key={item} size="sm" variant={decision === item ? "default" : "outline"} onClick={() => setDecision(item)}>
                        {decision === item && <Check className="mr-1 size-4" />}
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={Download} title="Export" tone="amber" />
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {fixtureMode
                ? "Xuất Markdown từ nội dung spec và decision hiện tại. Đây là artifact demo; không thay thế version/export persistence ở backend."
                : latestSpec
                  ? `Xuất Markdown từ ResearchSpec v${latestSpec.version} và panel hiện tại. Sections và judges được lấy trực tiếp từ API đã persist — không bịa.`
                  : "Chưa có spec để export. Hãy generate spec trước."}
            </p>
            <Button
              className="mt-4"
              onClick={exportMarkdown}
              disabled={(!fixtureMode && !latestSpec) || pending}
            >
              <Download className="mr-2 size-4" />Export Markdown
            </Button>
            {!fixtureMode && latestSpec && (
              <p className="mt-2 text-xs text-muted-foreground">File: {getResearchSpecFilename(latestSpec.version)} · {pending ? "busy…" : "ready"}</p>
            )}
          </CardContent>
        </SectionCard>
      </div>
    </AppShell>
  );
}
