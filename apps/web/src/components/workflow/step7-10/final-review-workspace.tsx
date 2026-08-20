"use client";

import { useMemo, useState } from "react";
import { Check, Download, FileText, GitCompare, Scale, ShieldCheck } from "lucide-react";
import { AppShell } from "../shared/app-shell";
import { SectionCard, SectionHeader } from "../shared/section-card";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Props = { projectId: string; fixtureMode: boolean };

const sections = [
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

const judges = [
  { name: "Evidence Judge", focus: "citation/evidence support, orphan claims, provenance integrity", score: "MAJOR", finding: "Require provenance-backed evidence before presenting a claim as supported." },
  { name: "Research Judge", focus: "gap quality, contribution scope and overclaiming", score: "MINOR", finding: "Keep novelty language corpus-bounded; do not claim global novelty." },
  { name: "Experiment Judge", focus: "baseline fairness, metrics, ablations and feasibility", score: "MAJOR", finding: "Freeze model, data, token budget and call count; include a held-out set." },
];

export function FinalReviewWorkspace({ projectId, fixtureMode }: Props) {
  const [decision, setDecision] = useState("Narrow claim");
  const [custom, setCustom] = useState("");
  const [version, setVersion] = useState(1);
  const [finalized, setFinalized] = useState(false);

  const consensus = useMemo(() => {
    const major = judges.filter((j) => j.score === "MAJOR").length;
    return major >= 2 ? "MAJOR" : "MINOR";
  }, []);

  function exportMarkdown() {
    const body = [
      "# SpecLoop Research Specification",
      "",
      ...sections.flatMap(([title, content]) => [`## ${title}`, "", content, ""]),
      "## Judge review",
      "",
      ...judges.flatMap((j) => [`### ${j.name}`, `- Focus: ${j.focus}`, `- Severity: ${j.score}`, `- Finding: ${j.finding}`, ""]),
      "## User revision decision",
      "",
      `Decision: ${decision}`,
      custom ? `Other: ${custom}` : "",
      `Version: ${version}`,
      "",
      finalized ? "Status: FINALIZED" : "Status: DRAFT",
    ].join("\n");
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `specloop-research-spec-v${version}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell activeStep={4} projectId={projectId} fixtureMode={fixtureMode}>
      <div className="space-y-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText size={26} /></span>
          <div>
            <h1 className="text-2xl font-bold">7–10. Specification, Judges & Finalization</h1>
            <p className="mt-1 text-muted-foreground">Tạo bản spec 14 phần, đánh giá độc lập, cho user quyết định revision rồi export bản cuối.</p>
          </div>
        </div>

        {fixtureMode && <Alert className="bg-amber-50 border-amber-200 text-amber-900"><AlertDescription><strong>Local demonstration:</strong> spec và Judge findings ở màn hình này là fixture minh hoạ. Không được dùng chúng làm kết quả nghiên cứu thật.</AlertDescription></Alert>}

        <SectionCard>
          <SectionHeader icon={FileText} title="Research specification — 14 sections" tone="blue" />
          <CardContent>
            <div className="divide-y">
              {sections.map(([title, content]) => (
                <div key={title} className="py-5">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={Scale} title="Independent Judges" tone="purple" />
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {judges.map((judge) => (
                <div key={judge.name} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{judge.name}</h3><Badge variant={judge.score === "MAJOR" ? "destructive" : "secondary"}>{judge.score}</Badge></div>
                  <p className="mt-2 text-xs text-muted-foreground">{judge.focus}</p>
                  <p className="mt-3 text-sm">{judge.finding}</p>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm">
              <strong>Aggregation:</strong> consensus severity = <Badge className="ml-1">{consensus}</Badge>. Judges are displayed independently; aggregation happens only after individual findings exist.
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={ShieldCheck} title="User revision decision" tone="green" />
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">Claim hiện tại không nên khẳng định generalization ngoài domain đã test. Chọn cách xử lý:</p>
              <div className="flex flex-wrap gap-2">
                {["Narrow claim", "Expand experiment", "Convert to research question"].map((item) => (
                  <Button key={item} variant={decision === item ? "default" : "outline"} onClick={() => setDecision(item)}>{decision === item && <Check className="mr-1 size-4" />}{item}</Button>
                ))}
              </div>
              <Textarea value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Other — nhập quyết định riêng..." rows={3} />
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => setVersion((v) => v + 1)}><GitCompare className="mr-2 size-4" />Create version {version + 1}</Button>
                <Button onClick={() => setFinalized(true)} disabled={!decision}>Confirm final version</Button>
              </div>
              {finalized && <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">Version {version} đã được đánh dấu FINALIZED trong phiên UI này. Production persistence/version API vẫn cần được nối nếu dùng ngoài fixture.</div>}
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <SectionHeader icon={Download} title="Export" tone="amber" />
          <CardContent>
            <p className="text-sm text-muted-foreground">Xuất Markdown từ nội dung spec và decision hiện tại. Đây là artifact demo; không thay thế version/export persistence ở backend.</p>
            <Button className="mt-4" onClick={exportMarkdown}><Download className="mr-2 size-4" />Export Markdown</Button>
          </CardContent>
        </SectionCard>
      </div>
    </AppShell>
  );
}
