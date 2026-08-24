"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, FlaskConical, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AppShell } from "../shared/app-shell";
import { ApiErrorMessage } from "../shared/api-error-message";
import { SectionCard, SectionHeader } from "../shared/section-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardContent } from "@/components/ui/card";

type Props = { projectId: string; fixtureMode: boolean };

const fixtureSources = [
  { id: "fixture-source-1", title: "Prompt optimization with iterative feedback", abstract: "A representative paper used only for local UI demonstration.", selected: true },
  { id: "fixture-source-2", title: "Evidence-grounded language model generation", abstract: "A representative paper used only for local UI demonstration.", selected: false },
];

export function ResearchWorkspace({ projectId, fixtureMode }: Props) {
  const [selectedGap, setSelectedGap] = useState(0);
  const [fixtureSelected, setFixtureSelected] = useState(fixtureSources);
  const [autoFindQuery, setAutoFindQuery] = useState<string | null>(null);
  const [autoFindPapers, setAutoFindPapers] = useState<any[]>([]);

  const project = trpc.projects.byId.useQuery({ id: projectId }, { enabled: !fixtureMode, retry: false });
  const graph = trpc.decomposition.byProject.useQuery({ projectId }, { enabled: !fixtureMode, retry: false });
  const sources = trpc.literature.list.useQuery(
    { projectId, selectedOnly: false, limit: 50 },
    { enabled: !fixtureMode, retry: false },
  );
  const select = trpc.literature.select.useMutation({
    onSuccess: () => sources.refetch(),
  });
  const autoFind = trpc.literature.searchWithAnalysis.useMutation({
    onSuccess: (data) => {
      setAutoFindQuery(data.query);
      setAutoFindPapers(data.papers);
      sources.refetch();
    },
  });
  const gap = trpc.researchDesign.generateGapProposal.useMutation();
  const claims = trpc.researchDesign.generateClaimDesign.useMutation();
  const plans = trpc.researchDesign.generateExperimentPlan.useMutation();
  const claimList = trpc.researchDesign.listClaims.useQuery({ projectId }, { enabled: !fixtureMode, retry: false });
  const planList = trpc.researchDesign.listPlans.useQuery({ projectId }, { enabled: !fixtureMode, retry: false });
  const gapProposal = trpc.researchDesign.gapProposal.useQuery(
    { projectId },
    { enabled: !fixtureMode, retry: false },
  );

  const sourceItems = fixtureMode ? fixtureSelected : (sources.data?.items ?? []);
  const selectedItems = sourceItems.filter((s) => s.selected);
  const gapCandidates = fixtureMode ? [{
    knownCapability: "Existing methods optimize prompts using scalar or textual feedback.",
    limitation: "They do not explicitly use claim-level evidence feedback.",
    importance: "Unsupported claims are costly because they weaken trust in a research specification.",
    testableHypothesis: "Claim-level evidence feedback lowers unsupported-claim rate under the same inference budget.",
    evidenceRefs: [],
    nearestWorkIds: [],
    noveltyRisk: "Corpus-bounded only; absence from this demo corpus is not proof of global novelty.",
    scope: "Scientific paper information extraction.",
  }] : (gap.data?.candidates ?? gapProposal.data?.candidates ?? []);

  const selectedClaims = fixtureMode ? [{
    id: "fixture-claim-1",
    text: "Claim-level evidence feedback reduces unsupported claim rate versus scalar feedback under a fixed inference budget.",
    baseline: "Human-written prompt; self-refine; scalar feedback optimizer",
    metric: "Unsupported claim rate",
    falsificationCondition: "No stable improvement on held-out data.",
  }] : (claimList.data?.items ?? []);

  const plansView = fixtureMode ? [{
    tier: "PROPOSED",
    baselines: ["Human-written prompt", "Self-refine", "Scalar feedback optimizer"],
    metrics: ["Unsupported claim rate", "Evidence support rate", "Token cost"],
    protocol: ["Freeze model, dataset and token budget", "Evaluate on development then held-out validation"],
    controls: ["Same model", "Same dataset", "Same number of LLM calls"],
    ablations: ["Remove claim decomposition", "Remove evidence verifier", "Remove textual feedback"],
    generalizationProposals: ["Different paper domain", "Different model if budget allows"],
    estimates: [{ label: "Inference budget", formula: "candidates × rounds × samples", result: "Estimated from declared inputs", inputs: [{ name: "Candidates", value: "10", basis: "assumed" }] }],
  }] : (planList.data?.items ?? []);

  // Merge the persisted corpus reference list with the per-paper LLM
  // analysis, joined on externalId. Analyzed papers that are not yet in
  // the corpus list (e.g. before refetch completes) are appended so they
  // remain visible.
  const mergedRows = useMemo(() => {
    const analysisById = new Map(autoFindPapers.map((p) => [p.externalId as string, p]));
    const rows = sourceItems.map((s: any) => {
      // Prefer the analysis persisted on the source; fall back to the
      // in-memory result of the latest auto-find run.
      const a = s.analysis ?? (s.externalId ? analysisById.get(s.externalId) : undefined);
      return {
        key: s.id as string,
        sourceId: s.id as string,
        title: s.title as string,
        authors: (s.authors ?? []) as string[],
        selected: Boolean(s.selected),
        methodology: a?.methodology as string | undefined,
        additionalResearchNeeded: a?.additionalResearchNeeded as string | undefined,
      };
    });
    const knownExternalIds = new Set(sourceItems.map((s: any) => s.externalId).filter(Boolean));
    for (const p of autoFindPapers) {
      if (!knownExternalIds.has(p.externalId)) {
        rows.push({
          key: p.externalId,
          sourceId: "",
          title: p.title,
          authors: p.authors ?? [],
          selected: false,
          methodology: p.methodology,
          additionalResearchNeeded: p.additionalResearchNeeded,
        });
      }
    }
    return rows;
  }, [sourceItems, autoFindPapers]);

  // Research-question nodes from the project's decomposition (Step 2).
  const researchQuestionNodes = useMemo(
    () => (graph.data?.nodes ?? []).filter((n) => n.type === "RESEARCH_QUESTION"),
    [graph.data?.nodes],
  );

  function runAutoFind() {
    if (fixtureMode) return;
    const questionTexts = researchQuestionNodes.map((n) => `${n.title}. ${n.content}`).join(" ");
    const researchIdea = `${project.data?.title ?? ""} ${questionTexts}`.trim();
    if (!researchIdea) return;
    autoFind.mutate({ projectId, researchIdea, maxResults: 5 });
  }

  function toggleFixture(id: string) {
    setFixtureSelected((items) => items.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  }

  function generateGap() {
    if (fixtureMode) return;
    gap.mutate({ projectId, researchQuestionNodeIds: researchQuestionNodes.map((n) => n.id) });
  }

  function generateClaims() {
    if (fixtureMode) return;
    claims.mutate({ projectId, selectedGapIndex: selectedGap });
  }

  function generatePlan() {
    if (fixtureMode) return;
    plans.mutate({ projectId, claimIds: (claimList.data?.items ?? []).map((c) => c.id), tier: "PROPOSED" });
  }

  const error = autoFind.error || gap.error || claims.error || plans.error;
  const counts = useMemo(() => ({
    corpus: selectedItems.length,
    claims: selectedClaims.length,
    gaps: gapCandidates.length,
    plans: plansView.length,
  }), [selectedItems.length, selectedClaims.length, gapCandidates.length, plansView.length]);

  return (
    <AppShell activeStep={3} projectId={projectId} fixtureMode={fixtureMode}>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen size={26} /></span>
            <div>
              <h1 className="text-2xl font-bold">3–8. Evidence → Feasibility</h1>
              <p className="text-muted-foreground mt-1">Tích hợp literature, evidence, research gap, claim và experiment plan trước khi tạo research specification.</p>
            </div>
          </div>
        </div>

        {fixtureMode && <Alert className="bg-amber-50 border-amber-200 text-amber-900"><AlertDescription><strong>Local fixture:</strong> dữ liệu bên dưới là dữ liệu minh hoạ, không phải paper/evidence thực tế.</AlertDescription></Alert>}
        <ApiErrorMessage error={error} />

        <div className="grid gap-4 md:grid-cols-4">
          {[["Corpus", counts.corpus], ["Gap candidates", counts.gaps], ["Claims", counts.claims], ["Experiment plans", counts.plans]].map(([label, value]) => (
            <SectionCard key={label as string}><CardContent><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></SectionCard>
          ))}
        </div>

        <SectionCard>
          <SectionHeader icon={Search} title="Step 3 — Literature corpus" tone="blue" />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Automated literature finding</Label>
              <p className="text-xs text-muted-foreground">LLM tự chọn query arXiv từ project title và research questions, lọc bỏ paper không liên quan và thử query mới tới khi đủ số paper yêu cầu.</p>
              <Button onClick={runAutoFind} disabled={autoFind.isPending || fixtureMode} className="mt-2"><Sparkles className="mr-2 size-4" />Auto find literature</Button>
              {autoFindQuery && <p className="text-xs text-muted-foreground mt-2">Query used: <code>{autoFindQuery}</code></p>}
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Danh sách nguồn trong corpus; paper từ Auto find literature kèm phân tích của LLM (methodology, shortcomings). Chọn nguồn để đưa vào corpus hoạt động.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Paper</th>
                      <th className="py-2 pr-4">Methodology</th>
                      <th className="py-2 pr-4">Shortcomings / Additional research needed</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedRows.map((row) => (
                      <tr key={row.key} className="border-b last:border-0 align-top">
                        <td className="py-2 pr-4 align-top">
                          <div className="font-semibold">{row.title}</div>
                          <div className="text-xs text-muted-foreground">{(row.authors ?? []).join(", ")}</div>
                        </td>
                        <td className="py-2 pr-4 align-top">{row.methodology ? row.methodology.slice(0, 300) + (row.methodology.length > 300 ? "…" : "") : "—"}</td>
                        <td className="py-2 pr-4 align-top">{row.additionalResearchNeeded ? row.additionalResearchNeeded.slice(0, 300) + (row.additionalResearchNeeded.length > 300 ? "…" : "") : "—"}</td>
                        <td className="py-2 align-top">
                          {row.sourceId ? (
                            <Button size="sm" variant={row.selected ? "default" : "outline"} onClick={() => fixtureMode ? toggleFixture(row.key) : select.mutate({ projectId, sourceId: row.sourceId, selected: !row.selected })}>
                              {row.selected ? <><CheckCircle2 className="mr-1 size-4" />Selected</> : "Select"}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mergedRows.length === 0 && <p className="text-sm text-muted-foreground">Chưa có source. Dùng Auto find literature hoặc manual import API.</p>}
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={ShieldCheck} title="Step 4–5 — Evidence & research gap" tone="green" />
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Gap candidates</h3><p className="text-sm text-muted-foreground">{fixtureMode ? "Fixture candidate" : "Proposal grounded in selected sources and the project's decomposition research questions."}</p></div><Button onClick={generateGap} disabled={gap.isPending || fixtureMode || selectedItems.length === 0}><Sparkles className="mr-2 size-4" />Generate gap</Button></div>
            {gapCandidates.map((candidate, index) => (
              <button type="button" key={index} onClick={() => setSelectedGap(index)} className={`w-full rounded-lg border p-4 text-left ${selectedGap === index ? "border-primary bg-primary/5" : ""}`}>
                <div className="flex items-center justify-between"><span className="font-semibold">Candidate {index + 1}</span><Badge variant="secondary">Corpus-bounded</Badge></div>
                <p className="mt-2 text-sm"><strong>Known:</strong> {candidate.knownCapability}</p>
                <p className="mt-1 text-sm"><strong>Limitation:</strong> {candidate.limitation}</p>
                <p className="mt-1 text-sm"><strong>Test:</strong> {candidate.testableHypothesis}</p>
                <p className="mt-2 text-xs text-amber-700">{candidate.noveltyRisk}</p>
              </button>
            ))}
            <div className="flex justify-end"><Button onClick={generateClaims} disabled={claims.isPending || fixtureMode || !gapCandidates.length}><Sparkles className="mr-2 size-4" />Generate contribution & claims</Button></div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={FlaskConical} title="Steps 6–8 — Claims → experiment → feasibility" tone="purple" />
          <CardContent className="space-y-5">
            {selectedClaims.map((claim, index) => (
              <div key={claim.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2"><Badge>Claim {index + 1}</Badge><span className="text-sm font-semibold">{claim.metric}</span></div>
                <p className="mt-2 text-sm">{claim.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">Baseline: {claim.baseline} · Falsification: {claim.falsificationCondition}</p>
              </div>
            ))}
            <Button onClick={generatePlan} disabled={plans.isPending || fixtureMode || !selectedClaims.length}><FlaskConical className="mr-2 size-4" />Generate experiment plan</Button>
            {plansView.map((plan, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between"><h3 className="font-semibold">Plan {index + 1}</h3><Badge>{plan.tier}</Badge></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Baselines</p><p className="text-sm">{plan.baselines.join(" · ")}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Metrics</p><p className="text-sm">{plan.metrics.join(" · ")}</p></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Protocol</p><ul className="list-disc pl-5 text-sm">{plan.protocol.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Ablations</p><ul className="list-disc pl-5 text-sm">{plan.ablations.map((x) => <li key={x}>{x}</li>)}</ul></div>
                <div className="rounded-lg bg-muted p-3 text-xs"><strong>Feasibility:</strong> estimates are labeled as assumed/measured; do not present estimates as measured results.</div>
              </div>
            ))}
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={Sparkles} title="Next: Specification → Judges → Revision → Export" tone="amber" />
          <CardContent>
            <p className="text-sm text-muted-foreground">Sau khi corpus, evidence, gap, claims và experiment plan đủ, workflow tiếp tục sang bản research specification 14 phần, 3 Judge độc lập, revision/version diff và Markdown export.</p>
            <Link href={`/projects/${projectId}/final-review${fixtureMode ? "?fixture=1" : ""}`} className={buttonVariants({ className: "mt-4" })}>Mở Final Review</Link>
          </CardContent>
        </SectionCard>
      </div>
    </AppShell>
  );
}
