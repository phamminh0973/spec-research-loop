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
    <div className="page-heading">
      <span className="page-heading-icon" aria-hidden="true">
        <Icon size={27} />
      </span>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
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
    <SectionCard className="summary-card">
      <div className="summary-label">
        <span className="section-icon card-tone-blue" aria-hidden="true">
          <FileText size={18} />
        </span>
        <span>Workflow status</span>
      </div>
      <StepBreadcrumb steps={steps} />
      <div className="summary-tip">
        <strong>{fixtureMode ? "Local check:" : "BR-01:"}</strong>{" "}
        {fixtureMode
          ? "fixture chỉ mô phỏng lifecycle; không phải production result."
          : "decomposition chỉ mở sau khi người dùng xác nhận interpretation."}
      </div>
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
      <div className="page-container">
        <PageHeading
          icon={Lightbulb}
          title="Bắt đầu một research project"
          description="Nhập ý tưởng ban đầu, sau đó hệ thống sẽ tạo một interpretation proposal để bạn review và xác nhận."
        />

        {fixtureMode ? (
          <div className="alert alert-warning" role="status">
            <LocalDevelopmentBadge />
            <span>
              Đây là chế độ local để kiểm tra UI Step 1 → Step 2. Không có
              project production nào được tạo.
            </span>
          </div>
        ) : null}

        <div className="review-grid">
          <SectionCard>
            <SectionHeader
              icon={Lightbulb}
              title="Ý tưởng ban đầu"
              tone="blue"
            />
            <form className="form-stack" onSubmit={handleSubmit}>
              <label className="field-label">
                Tên project
                <input
                  className="text-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Ví dụ: Evidence-grounded research spec"
                />
              </label>
              <label className="field-label">
                Raw idea
                <textarea
                  className="text-area"
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  rows={6}
                  minLength={10}
                  required
                />
              </label>
              <div className="tag-list" aria-label="Local input tags">
                {initialTags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
              <label className="field-label">
                Domain (tuỳ chọn)
                <input
                  className="text-input"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="Ví dụ: NLP"
                />
              </label>
              <label className="field-label">
                Resource constraint (tuỳ chọn)
                <input
                  className="text-input"
                  value={constraint}
                  onChange={(event) => setConstraint(event.target.value)}
                  placeholder="Ví dụ: không có GPU"
                />
              </label>
              <button
                className="button button-primary"
                disabled={createProject.isPending || idea.trim().length < 10}
                type="submit"
              >
                <ArrowRight size={16} />
                {fixtureMode ? "Mở local Step 1" : "Tạo project & phân tích"}
              </button>
              {createProject.error ? (
                <div className="alert alert-error" role="alert">
                  {errorMessage(createProject.error)}
                </div>
              ) : null}
            </form>
          </SectionCard>

          <div className="review-column">
            <SectionCard>
              <SectionHeader
                icon={ShieldCheck}
                title="Nguyên tắc review"
                tone="green"
              />
              <ul className="bullet-list">
                <li>
                  Interpretation chỉ là proposal cho đến khi bạn xác nhận.
                </li>
                <li>
                  Hệ thống không được tự gán `USER_CONFIRMED` từ output AI.
                </li>
                <li>
                  Decomposition sẽ nhận projectId và tự kiểm tra gate ở server.
                </li>
              </ul>
            </SectionCard>
            <SectionCard>
              <SectionHeader
                icon={Target}
                title="Phạm vi bước này"
                tone="amber"
              />
              <p className="helper-text">
                Màn hình này chỉ thu thập raw idea và constraints. Search paper,
                related-work, evidence và research gap có provenance sẽ xuất
                hiện sau khi capability tương ứng được tích hợp.
              </p>
            </SectionCard>
          </div>

          <SectionCard>
            <SectionHeader
              icon={CircleHelp}
              title="Bạn sẽ xác nhận gì?"
              tone="purple"
            />
            <div className="surface-muted">
              <h3>Interpretation contract</h3>
              <p>
                simple interpretation, technical interpretation, assumptions,
                objectives và ambiguities — đúng theo schema AIT-01 hiện có.
              </p>
            </div>
            <div className="surface-muted" style={{ marginTop: 12 }}>
              <h3>Quyền quyết định</h3>
              <p>
                Bạn có thể Confirm, Edit, Other hoặc Regenerate. Mỗi lựa chọn
                phải đi qua lifecycle API tương ứng.
              </p>
            </div>
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
    <div className="field-stack">
      <div>
        <p className="eyebrow">SIMPLE INTERPRETATION</p>
        {editing ? (
          <textarea
            className="text-area"
            value={output.simpleInterpretation}
            onChange={(event) =>
              updateText("simpleInterpretation", event.target.value)
            }
          />
        ) : (
          <div className="interpretation-box">
            {output.simpleInterpretation}
          </div>
        )}
      </div>
      <div>
        <p className="eyebrow">TECHNICAL INTERPRETATION</p>
        {editing ? (
          <textarea
            className="text-area"
            value={output.technicalInterpretation}
            onChange={(event) =>
              updateText("technicalInterpretation", event.target.value)
            }
          />
        ) : (
          <div className="surface-muted">{output.technicalInterpretation}</div>
        )}
      </div>
      <div>
        <p className="eyebrow">ASSUMPTIONS</p>
        <ul className="bullet-list">
          {output.assumptions.length > 0 ? (
            output.assumptions.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>Không có assumption nào được trả về.</li>
          )}
        </ul>
      </div>
      <div>
        <p className="eyebrow">OBJECTIVES</p>
        <ul className="bullet-list">
          {output.objectives.length > 0 ? (
            output.objectives.map((item) => <li key={item}>{item}</li>)
          ) : (
            <li>Không có objective nào được trả về.</li>
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
      <div className="page-container">
        <PageHeading
          icon={Brain}
          title="1. Làm rõ & xác nhận ý tưởng"
          description="Review interpretation do API trả về, chỉnh sửa nếu cần, rồi xác nhận đúng phiên bản trước khi mở Step 2."
        />

        {fixtureMode ? (
          <div className="alert alert-warning" role="status">
            <LocalDevelopmentBadge />
            <span>
              Toàn bộ record bên dưới là fixture local, không phải AI result
              production.
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="alert alert-error" role="alert">
            <span>
              <strong>API operation unavailable</strong>
              {errorMessage(error)}
            </span>
          </div>
        ) : null}

        <div className="review-grid">
          <SectionCard>
            <SectionHeader icon={Lightbulb} title="Project input" tone="blue" />
            {project ? (
              <div className="field-stack">
                <div className="idea-quote">{project.title}</div>
                <p className="helper-text">
                  API hiện trả về <code>ProjectSummary</code>; rawIdea không nằm
                  trong response này. Nội dung interpretation bên cạnh vẫn được
                  lấy từ lifecycle API.
                </p>
                <div className="tag-list">
                  {project.domain ? (
                    <span className="tag">{project.domain}</span>
                  ) : null}
                  <span className="tag">project-scoped</span>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Chưa đọc được project</h3>
                <p>Kiểm tra projectId hoặc mở local fixture để kiểm tra UI.</p>
              </div>
            )}
            <div className="step1-actions">
              <button
                className="button button-primary"
                type="button"
                onClick={handleGenerate}
                disabled={pending}
              >
                <RefreshCw size={15} />
                {record ? "Generate lại proposal" : "Generate interpretation"}
              </button>
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
                  <div className="step1-actions">
                    <button
                      className="button button-primary"
                      type="button"
                      onClick={saveRevision}
                      disabled={pending}
                    >
                      <Check size={15} /> Lưu{" "}
                      {editAction === "OTHER" ? "Other" : "Edit"}
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => setEditing(false)}
                    >
                      Huỷ
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-state">
                <h3>Chưa có interpretation proposal</h3>
                <p>Nhấn Generate để bắt đầu lifecycle AIT-01.</p>
              </div>
            )}
          </SectionCard>

          <SectionCard>
            <SectionHeader
              icon={CircleHelp}
              title="Câu hỏi cần xác nhận"
              tone="purple"
            />
            {record ? (
              <div className="field-stack">
                <div className="question-block">
                  <p className="question-title">
                    <span className="question-index">1</span>
                    Interpretation này có phản ánh đúng ý định của bạn không?
                  </p>
                  <div className="choice-list">
                    <button
                      className={`choice-button ${confirmed ? "selected" : ""}`}
                      type="button"
                      onClick={handleConfirm}
                      disabled={pending || confirmed}
                    >
                      Confirm
                    </button>
                    <button
                      className="choice-button"
                      type="button"
                      onClick={() => beginEdit("EDIT")}
                      disabled={pending}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      className="choice-button"
                      type="button"
                      onClick={() => beginEdit("OTHER")}
                      disabled={pending}
                    >
                      Other
                    </button>
                  </div>
                  <p className="helper-text">
                    {confirmed
                      ? "Phiên bản hiện tại đã USER_CONFIRMED."
                      : "Chưa confirm thì Step 2 vẫn bị chặn theo BR-01."}
                  </p>
                </div>
                <div className="question-block">
                  <p className="question-title">
                    <span className="question-index">2</span>
                    Bạn muốn chạy lại proposal không?
                  </p>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={handleRegenerate}
                    disabled={pending}
                  >
                    <RefreshCw size={14} /> Regenerate
                  </button>
                  <p className="helper-text">
                    Regenerate tạo proposal mới và không tự mở khóa
                    decomposition.
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <h3>Đợi proposal</h3>
                <p>
                  Các lựa chọn Confirm/Edit/Other sẽ xuất hiện sau khi có output
                  hợp lệ.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard className="summary-card">
          <div className="summary-label">
            <span className="section-icon card-tone-green" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <span>{confirmed ? "Đã xác nhận" : "Đang chờ xác nhận"}</span>
          </div>
          <div className="summary-meta">
            <StatusPill status={record?.status ?? "MISSING"} />
            {confirmed ? (
              <a
                className="button button-primary button-small"
                href={`${`/projects/${projectId}/decomposition`}${fixtureMode ? "?fixture=1" : ""}`}
              >
                Mở Step 2 <ArrowRight size={14} />
              </a>
            ) : (
              <span className="meta-text">Step 2 locked by BR-01</span>
            )}
          </div>
          <div className="summary-tip">
            <strong>Authority:</strong> AI chỉ tạo PROPOSED; Confirm là hành
            động của user qua API lifecycle.
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
