"use client";

import {
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  FileText,
  Lightbulb,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  InterpretationOutput,
  InterpretationRecord,
  ProjectSummary,
} from "@specloop/schemas";

import { trpc } from "@/lib/trpc";
import { AppShell } from "./app-shell";
import {
  LocalDevelopmentBadge,
  SectionCard,
  SectionHeader,
  StatusPill,
} from "./section-card";
import {
  cloneLocalInterpretation,
  LOCAL_PROJECT,
  LOCAL_PROJECT_ID,
} from "./local-fixtures";
import { StepBreadcrumb, type WorkflowStep } from "./step-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const initialIdea =
  "Tôi muốn chuyển một ý tưởng nghiên cứu mơ hồ thành một đặc tả có thể review, với các giả định, câu hỏi và cảnh báo rõ ràng.";

const initialTags = ["Research idea", "Reviewable spec", "Assumptions"];

function errorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Thao tác chưa hoàn tất.";
}

function PageHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Lightbulb;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-8">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
        <Icon size={27} />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

function SummaryBar({
  currentStep,
  confirmed,
  fixtureMode,
}: {
  currentStep: 1 | 2;
  confirmed: boolean;
  fixtureMode: boolean;
}) {
  const steps: WorkflowStep[] = [
    { label: "Ý tưởng", state: "complete" },
    {
      label: "Interpretation",
      state: confirmed ? "complete" : currentStep === 1 ? "current" : "blocked",
    },
    {
      label: "Typed cards",
      state: currentStep === 2 ? "current" : confirmed ? "pending" : "blocked",
    },
    { label: "Evidence", state: "blocked" },
  ];

  return (
    <SectionCard>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4.5" />
            </div>
            <span>Workflow status</span>
          </div>
          <div className="flex-1 min-w-75">
            <StepBreadcrumb steps={steps} />
          </div>
          <div className="hidden md:block flex-1">
            <div className="rounded-lg border border-border bg-[color-mix(in_oklch,var(--background),var(--primary)_3%)] p-3 text-sm text-primary min-h-15 flex items-center">
              <span><strong>{fixtureMode ? "Local check:" : "BR-01:"}</strong> {fixtureMode ? "fixture chỉ mô phỏng lifecycle; không phải production result." : "decomposition chỉ mở sau khi người dùng xác nhận interpretation."}</span>
            </div>
          </div>
        </div>
        <div className="md:hidden mt-4">
          <Alert>
            <AlertDescription>
              <strong className="font-semibold">{fixtureMode ? "Local check:" : "BR-01:"}</strong>{" "}
              {fixtureMode
                ? "fixture chỉ mô phỏng lifecycle; không phải production result."
                : "decomposition chỉ mở sau khi người dùng xác nhận interpretation."}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </SectionCard>
  );
}

export function NewProjectWorkspace({ fixtureMode }: { fixtureMode: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState(initialIdea);
  const [domain, setDomain] = useState("");
  const [constraint, setConstraint] = useState("");
  const createProject = trpc.projects.create.useMutation({
    onSuccess: (project) => {
      router.push(`/projects/${project.id}/understanding`);
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fixtureMode) {
      router.push(`/projects/${LOCAL_PROJECT_ID}/understanding?fixture=1`);
      return;
    }
    createProject.mutate({
      title: title.trim() || "Untitled research project",
      rawIdea: idea.trim(),
      ...(domain.trim() ? { domain: domain.trim() } : {}),
      resourceConstraints: constraint.trim() ? [constraint.trim()] : [],
    });
  }

  return (
    <AppShell activeStep={1} fixtureMode={fixtureMode}>
      <div className="space-y-8">
        <PageHeading
          icon={Lightbulb}
          title="Bắt đầu một research project"
          description="Nhập ý tưởng ban đầu, sau đó hệ thống sẽ tạo một interpretation proposal để bạn review và xác nhận."
        />

        {fixtureMode ? (
          <Alert className="bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200" role="status">
            <div className="flex items-center gap-2">
              <LocalDevelopmentBadge />
              <span>
                Đây là chế độ local để kiểm tra UI Step 1 → Step 2. Không có
                project production nào được tạo.
              </span>
            </div>
          </Alert>
        ) : null}

        <div className="grid gap-6 grid-cols-3">
          <SectionCard>
            <SectionHeader
              icon={Lightbulb}
              title="Ý tưởng ban đầu"
              tone="blue"
            />
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <Label htmlFor="title" className="text-sm font-medium">Tên project</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ví dụ: Evidence-grounded research spec"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="idea" className="text-sm font-medium">Raw idea</Label>
                  <Textarea
                    id="idea"
                    value={idea}
                    onChange={(event) => setIdea(event.target.value)}
                    rows={6}
                    minLength={10}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {initialTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div>
                  <Label htmlFor="domain" className="text-sm font-medium">Domain (tuỳ chọn)</Label>
                  <Input
                    id="domain"
                    value={domain}
                    onChange={(event) => setDomain(event.target.value)}
                    placeholder="Ví dụ: NLP"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="constraint" className="text-sm font-medium">Resource constraint (tuỳ chọn)</Label>
                  <Input
                    id="constraint"
                    value={constraint}
                    onChange={(event) => setConstraint(event.target.value)}
                    placeholder="Ví dụ: không có GPU"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createProject.isPending || idea.trim().length < 10}
                  className="w-full"
                >
                  <ArrowRight className="mr-2 size-4" />
                  {fixtureMode ? "Mở local Step 1" : "Tạo project & phân tích"}
                </Button>
                {createProject.error ? (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>{errorMessage(createProject.error)}</AlertDescription>
                  </Alert>
                ) : null}
              </form>
            </CardContent>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard>
              <SectionHeader
                icon={ShieldCheck}
                title="Nguyên tắc review"
                tone="green"
              />
              <CardContent>
                <ul className="space-y-2 text-sm list-disc pl-5">
                  <li>
                    Interpretation chỉ là proposal cho đến khi bạn xác nhận.
                  </li>
                  <li>
                    Hệ thống không được tự gán <code>USER_CONFIRMED</code> từ output AI.
                  </li>
                  <li>
                    Decomposition sẽ nhận <code>projectId</code> và tự kiểm tra gate ở server.
                  </li>
                </ul>
              </CardContent>
            </SectionCard>
            <SectionCard>
              <SectionHeader
                icon={Target}
                title="Phạm vi bước này"
                tone="amber"
              />
              <CardContent>
                <p className="text-sm text-muted-foreground text-justify">
                  Màn hình này chỉ thu thập raw idea và constraints. Search paper,
                  related-work, evidence và research gap có provenance sẽ xuất
                  hiện sau khi capability tương ứng được tích hợp.
                </p>
              </CardContent>
            </SectionCard>
          </div>

          <SectionCard>
            <SectionHeader
              icon={CircleHelp}
              title="Bạn sẽ xác nhận gì?"
              tone="purple"
            />
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4 border-border border-2">
                  <h3 className="font-semibold text-foreground mb-2">Interpretation contract</h3>
                  <p className="text-sm text-muted-foreground text-justify">
                    simple interpretation, technical interpretation, assumptions,
                    objectives và ambiguities — đúng theo schema AIT-01 hiện có.
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-4 border-border border-2">
                  <h3 className="font-semibold text-foreground mb-2">Quyền quyết định</h3>
                  <p className="text-sm text-muted-foreground text-justify">
                    Bạn có thể Confirm, Edit, Other hoặc Regenerate. Mỗi lựa chọn
                    phải đi qua lifecycle API tương ứng.
                  </p>
                </div>
              </div>
            </CardContent>
          </SectionCard>
        </div>

        <SummaryBar
          currentStep={1}
          confirmed={false}
          fixtureMode={fixtureMode}
        />
      </div>
    </AppShell>
  );
}

function InterpretationDetails({
  record,
  editing,
  draft,
  onDraftChange,
}: {
  record: InterpretationRecord;
  editing: boolean;
  draft: InterpretationOutput;
  onDraftChange: (next: InterpretationOutput) => void;
}) {
  const output = editing ? draft : record.output;
  const updateText = (
    key: "simpleInterpretation" | "technicalInterpretation",
    value: string
  ) => onDraftChange({ ...draft, [key]: value });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SIMPLE INTERPRETATION</p>
        {editing ? (
          <Textarea
            value={output.simpleInterpretation}
            onChange={(event) =>
              updateText("simpleInterpretation", event.target.value)
            }
            className="mt-2"
            rows={4}
          />
        ) : (
          <div className="mt-2 rounded-lg bg-muted/50 p-4 text-foreground">
            {output.simpleInterpretation}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">TECHNICAL INTERPRETATION</p>
        {editing ? (
          <Textarea
            value={output.technicalInterpretation}
            onChange={(event) =>
              updateText("technicalInterpretation", event.target.value)
            }
            className="mt-2"
            rows={4}
          />
        ) : (
          <div className="mt-2 rounded-lg bg-muted/50 p-4 text-foreground">
            {output.technicalInterpretation}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ASSUMPTIONS</p>
        <ul className="mt-2 space-y-1">
          {output.assumptions.length > 0 ? (
            output.assumptions.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-current" />
                {item}
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">Không có assumption nào được trả về.</li>
          )}
        </ul>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OBJECTIVES</p>
        <ul className="mt-2 space-y-1">
          {output.objectives.length > 0 ? (
            output.objectives.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="flex size-1.5 shrink-0 mt-1.5 rounded-full bg-current" />
                {item}
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">Không có objective nào được trả về.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export function UnderstandingWorkspace({
  projectId,
  fixtureMode,
}: {
  projectId: string;
  fixtureMode: boolean;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [localRecord, setLocalRecord] = useState(() =>
    cloneLocalInterpretation()
  );
  const [editing, setEditing] = useState(false);
  const [editAction, setEditAction] = useState<"EDIT" | "OTHER">("EDIT");
  const [draft, setDraft] = useState<InterpretationOutput>(localRecord.output);
  const projectQuery = trpc.projects.byId.useQuery(
    { id: projectId },
    { enabled: !fixtureMode, retry: false }
  );
  const latestQuery = trpc.interpretation.latest.useQuery(
    { projectId },
    { enabled: !fixtureMode, retry: false }
  );
  const generate = trpc.interpretation.generate.useMutation({
    onSuccess: (record) => {
      utils.interpretation.latest.setData({ projectId }, record);
      setEditing(false);
    },
  });
  const regenerate = trpc.interpretation.regenerate.useMutation({
    onSuccess: (record) => {
      utils.interpretation.latest.setData({ projectId }, record);
      setEditing(false);
    },
  });
  const revise = trpc.interpretation.revise.useMutation({
    onSuccess: (record) => {
      utils.interpretation.latest.setData({ projectId }, record);
      setEditing(false);
    },
  });
  const confirm = trpc.interpretation.confirm.useMutation({
    onSuccess: (record) => {
      utils.interpretation.latest.setData({ projectId }, record);
    },
  });

  const record = fixtureMode ? localRecord : (latestQuery.data ?? null);
  const project: Pick<ProjectSummary, "title" | "domain"> | null = fixtureMode
    ? LOCAL_PROJECT
    : (projectQuery.data ?? null);
  const pending =
    generate.isPending ||
    regenerate.isPending ||
    revise.isPending ||
    confirm.isPending;
  const confirmed = record?.status === "USER_CONFIRMED";
  const error =
    generate.error ??
    regenerate.error ??
    revise.error ??
    confirm.error ??
    projectQuery.error ??
    latestQuery.error;

  function handleGenerate() {
    if (fixtureMode) {
      setLocalRecord(cloneLocalInterpretation());
      setDraft(cloneLocalInterpretation().output);
      return;
    }
    generate.mutate({ projectId });
  }

  function handleRegenerate() {
    if (fixtureMode) {
      setLocalRecord(cloneLocalInterpretation());
      setDraft(cloneLocalInterpretation().output);
      return;
    }
    regenerate.mutate({ projectId });
  }

  function beginEdit(action: "EDIT" | "OTHER") {
    if (!record) return;
    setEditAction(action);
    setDraft(record.output);
    setEditing(true);
  }

  function saveRevision() {
    if (!record) return;
    if (fixtureMode) {
      setLocalRecord({
        ...record,
        output: draft,
        status: "PROPOSED",
        confirmedAt: null,
      });
      setEditing(false);
      return;
    }
    revise.mutate({
      projectId,
      interpretationId: record.interpretationId,
      action: editAction,
      output: draft,
    });
  }

  function handleConfirm() {
    if (!record) return;
    if (fixtureMode) {
      setLocalRecord(cloneLocalInterpretation("USER_CONFIRMED"));
      return;
    }
    confirm.mutate({ projectId, interpretationId: record.interpretationId });
  }

  return (
    <AppShell
      activeStep={1}
      projectId={projectId}
      projectTitle={project?.title}
      fixtureMode={fixtureMode}
      interpretationStatus={record?.status ?? null}
    >
      <div className="space-y-8">
        <PageHeading
          icon={Brain}
          title="1. Làm rõ & xác nhận ý tưởng"
          description="Review interpretation do API trả về, chỉnh sửa nếu cần, rồi xác nhận đúng phiên bản trước khi mở Step 2."
        />

        {fixtureMode ? (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800" role="status">
            <div className="flex items-center gap-2">
              <LocalDevelopmentBadge />
              <span>
                Toàn bộ record bên dưới là fixture local, không phải AI result
                production.
              </span>
            </div>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive" role="alert">
            <AlertDescription>
              <strong>API operation unavailable</strong>
              {errorMessage(error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard>
            <SectionHeader icon={Lightbulb} title="Project input" tone="blue" />
            {project ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-foreground font-medium">
                  {project.title}
                </div>
                <p className="text-sm text-muted-foreground">
                  API hiện trả về <code className="bg-muted px-1 rounded">ProjectSummary</code>; rawIdea không nằm
                  trong response này. Nội dung interpretation bên cạnh vẫn được
                  lấy từ lifecycle API.
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.domain ? (
                    <Badge variant="secondary" className="text-xs">
                      {project.domain}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="text-xs">project-scoped</Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <h3 className="font-semibold text-foreground mb-1">Chưa đọc được project</h3>
                <p className="text-sm text-muted-foreground">Kiểm tra projectId hoặc mở local fixture để kiểm tra UI.</p>
              </div>
            )}
            <div className="mt-4">
              <Button
                onClick={handleGenerate}
                disabled={pending}
              >
                <RefreshCw size={15} className="mr-2" />
                {record ? "Generate lại proposal" : "Generate interpretation"}
              </Button>
            </div>
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon={Brain}
              title="Cách hệ thống đang hiểu ý tưởng"
              tone="green"
              action={record ? <StatusPill status={record.status} /> : null}
            />
            {record ? (
              <>
                <InterpretationDetails
                  record={record}
                  editing={editing}
                  draft={draft}
                  onDraftChange={setDraft}
                />
                {editing ? (
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={saveRevision}
                      disabled={pending}
                    >
                      <Check size={15} className="mr-2" /> Lưu{" "}
                      {editAction === "OTHER" ? "Other" : "Edit"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      Huỷ
                    </Button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-center py-8">
                <h3 className="font-semibold text-foreground mb-1">Chưa có interpretation proposal</h3>
                <p className="text-sm text-muted-foreground">Nhấn Generate để bắt đầu lifecycle AIT-01.</p>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard>
          <SectionHeader
            icon={CircleHelp}
            title="Câu hỏi cần xác nhận"
            tone="purple"
          />
          {record ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="font-medium text-foreground mb-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold mr-2">1</span>
                  Interpretation này có phản ánh đúng ý định của bạn không?
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    variant={confirmed ? "default" : "outline"}
                    onClick={handleConfirm}
                    disabled={pending || confirmed}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => beginEdit("EDIT")}
                    disabled={pending}
                  >
                    <Pencil size={13} className="mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => beginEdit("OTHER")}
                    disabled={pending}
                  >
                    Other
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {confirmed
                    ? "Phiên bản hiện tại đã USER_CONFIRMED."
                    : "Chưa confirm thì Step 2 vẫn bị chặn theo BR-01."}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="font-medium text-foreground mb-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold mr-2">2</span>
                  Bạn muốn chạy lại proposal không?
                </p>
                <Button
                  variant="outline"
                  onClick={handleRegenerate}
                  disabled={pending}
                >
                  <RefreshCw size={14} className="mr-1" /> Regenerate
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Regenerate tạo proposal mới và không tự mở khóa
                  decomposition.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <h3 className="font-semibold text-foreground mb-1">Đợi proposal</h3>
              <p className="text-sm text-muted-foreground">
                Các lựa chọn Confirm/Edit/Other sẽ xuất hiện sau khi có output
                hợp lệ.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3 text-sm font-semibold text-foreground">
              <span className="flex size-9 items-center justify-center rounded-lg bg-green-50 text-green-600" aria-hidden="true">
                <ShieldCheck size={18} />
              </span>
              <span>{confirmed ? "Đã xác nhận" : "Đang chờ xác nhận"}</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <StatusPill status={record?.status ?? "MISSING"} />
              {confirmed ? (
                <a
                  href={`${`/projects/${projectId}/decomposition`}${fixtureMode ? "?fixture=1" : ""}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Mở Step 2 <ArrowRight size={14} className="inline ml-1" />
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">Step 2 locked by BR-01</span>
              )}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <strong>Authority:</strong> AI chỉ tạo PROPOSED; Confirm là hành
              động của user qua API lifecycle.
            </div>
          </CardContent>
        </SectionCard>
      </div>
    </AppShell>
  );
}
