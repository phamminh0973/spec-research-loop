"use client";

import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, FileCheck2, FlaskConical, Search, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { AppShell } from "../shared/app-shell";
import { SectionCard, SectionHeader, StatusPill } from "../shared/section-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CardContent } from "@/components/ui/card";

type Props = { projectId: string; fixtureMode: boolean };

const fixtureSources = [
  { id: "fixture-source-1", title: "Prompt optimization with iterative feedback", abstract: "A representative paper used only for local UI demonstration.", selected: true },
  { id: "fixture-source-2", title: "Evidence-grounded language model generation", abstract: "A representative paper used only for local UI demonstration.", selected: false },
];

export function ResearchWorkspace({ projectId, fixtureMode }: Props) {
  const [query, setQuery] = useState("prompt optimization evidence hallucination");
  const [claimText, setClaimText] = useState("The proposed method reduces unsupported claims.");
  const [selectedGap, setSelectedGap] = useState(0);
  const [fixtureSelected, setFixtureSelected] = useState(fixtureSources);

  const sources = trpc.literature.list.useQuery(
    { projectId, selectedOnly: false, limit: 50 },
    { enabled: !fixtureMode, retry: false },
  );
  const search = trpc.literature.search.useMutation({
    onSuccess: () => sources.refetch(),
  });
  const select = trpc.literature.select.useMutation({
    onSuccess: () => sources.refetch(),
  });
  const gap = trpc.researchDesign.generateGapProposal.useMutation();
  const claims = trpc.researchDesign.generateClaimDesign.useMutation();
  const plans = trpc.researchDesign.generateExperimentPlan.useMutation();
  const claimList = trpc.researchDesign.listClaims.useQuery({ projectId }, { enabled: !fixtureMode, retry: false });
  const planList = trpc.researchDesign.listPlans.useQuery({ projectId }, { enabled: !fixtureMode, retry: false });

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
  }] : (gap.data?.candidates ?? []);

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

  function runSearch() {
    if (fixtureMode) return;
    search.mutate({ projectId, query, maxResults: 10 });
  }

  function toggleFixture(id: string) {
    setFixtureSelected((items) => items.map((item) => item.id === id ? { ...item, selected: !item.selected } : item));
  }

  function generateGap() {
    if (fixtureMode) return;
    gap.mutate({ projectId, researchQuestionNodeIds: [] });
  }

  function generateClaims() {
    if (fixtureMode) return;
    claims.mutate({ projectId, selectedGapIndex: selectedGap });
  }

  function generatePlan() {
    if (fixtureMode) return;
    plans.mutate({ projectId, claimIds: (claimList.data?.items ?? []).map((c) => c.id), tier: "PROPOSED" });
  }

  const error = search.error || gap.error || claims.error || plans.error;
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
              <h1 className="text-2xl font-bold">3–6. Evidence → Gap → Experiment</h1>
              <p className="text-muted-foreground mt-1">Tích hợp literature, evidence, research gap, claim và experiment plan trước khi tạo research specification.</p>
            </div>
          </div>
        </div>

        {fixtureMode && <Alert className="bg-amber-50 border-amber-200 text-amber-900"><AlertDescription><strong>Local fixture:</strong> dữ liệu bên dưới là dữ liệu minh hoạ, không phải paper/evidence thực tế.</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert>}

        <div className="grid gap-4 md:grid-cols-4">
          {[["Corpus", counts.corpus], ["Gap candidates", counts.gaps], ["Claims", counts.claims], ["Experiment plans", counts.plans]].map(([label, value]) => (
            <SectionCard key={label as string}><CardContent><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></CardContent></SectionCard>
          ))}
        </div>

        <SectionCard>
          <SectionHeader icon={Search} title="Step 3 — Literature corpus" tone="blue" />
          <CardContent className="space-y-4">
            <div className="flex gap-2"><Input value={query} onChange={(e) => setQuery(e.target.value)} /><Button onClick={runSearch} disabled={search.isPending || fixtureMode}><Search className="mr-2 size-4" />Search arXiv</Button></div>
            <p className="text-xs text-muted-foreground">Metadata phải đến từ academic API/manual import; LLM chỉ đề xuất query/analysis, không tự bịa DOI hay metadata.</p>
            <div className="grid gap-3">
              {sourceItems.map((source) => (
                <div key={source.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold">{source.title}</h3><p className="mt-1 text-sm text-muted-foreground">{source.abstract}</p></div>
                    <Button size="sm" variant={source.selected ? "default" : "outline"} onClick={() => fixtureMode ? toggleFixture(source.id) : select.mutate({ projectId, sourceId: source.id, selected: !source.selected })}>
                      {source.selected ? <><CheckCircle2 className="mr-1 size-4" />Selected</> : "Select"}
                    </Button>
                  </div>
                </div>
              ))}
              {sourceItems.length === 0 && <p className="text-sm text-muted-foreground">Chưa có source. Search hoặc dùng manual import API.</p>}
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={ShieldCheck} title="Step 4–5 — Evidence & research gap" tone="green" />
          <CardContent className="space-y-5">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Claim–Evidence boundary</h3><Badge variant="secondary">Needs provenance</Badge></div>
              <p className="mt-2 text-sm text-muted-foreground">Evidence card chỉ mô tả bằng chứng cần có. Nó không tự chứng minh claim. Evidence span phải có provenance và qua integrity check.</p>
              <Textarea className="mt-3" value={claimText} onChange={(e) => setClaimText(e.target.value)} rows={3} />
              <div className="mt-3 flex flex-wrap gap-2"><Link href={`/projects/${projectId}/decomposition${fixtureMode ? "?fixture=1" : ""}`} className={buttonVariants({ variant: "outline" })}><FileCheck2 className="mr-2 size-4" />Review claims in Step 2</Link><StatusPill status={selectedItems.length ? "AVAILABLE" : "MISSING"} /></div>
            </div>
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">Gap candidates</h3><p className="text-sm text-muted-foreground">{fixtureMode ? "Fixture candidate" : "Corpus-bounded proposal from selected sources."}</p></div><Button onClick={generateGap} disabled={gap.isPending || fixtureMode || selectedItems.length === 0}><Sparkles className="mr-2 size-4" />Generate gap</Button></div>
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
          <SectionHeader icon={FlaskConical} title="Step 6 — Experiment plan & feasibility" tone="purple" />
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
