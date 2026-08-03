# SpecLoop — Risk, Security and Cost Plan

**Trạng thái:** `PLANNED`  
**Phạm vi:** Product MVP bốn tuần, team ba người  
**Nguyên tắc:** mitigation/trigger/contingency là kế hoạch; không phải bằng chứng đã triển khai.

## 1. Risk management approach

- Review risk theo vertical slice và tại cut line cuối mỗi tuần.
- Mỗi risk có owner role, trigger quan sát được, mitigation trước sự cố và contingency sau khi trigger.
- Priority P0/P1/P2 của feature không được đổi chỉ để che risk; thay đổi cần team decision/ADR phù hợp.
- Metric, latency, cost và implementation status chỉ ghi từ evidence thực tế; planning estimate phải gắn nhãn.

## 2. Risk register

| Risk ID | Risk | Source assessment | Impact | Trigger | Mitigation | Contingency | Owner role | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RSK-01 | Scope P0 quá lớn cho 4 tuần | Likelihood Cao; impact Rất cao | Không hoàn tất E2E/evaluation | Story trễ dependency; E2E chưa vào spec/revision giữa tuần 3 | Lock P0/P1/P2, 45 PD feature budget, vertical slices, weekly cut lines | Giữ manual/in-process/basic fallback; loại toàn bộ P1/P2; giảm polish/dataset trong range | Product Workflow Lead | `PLANNED` |
| RSK-02 | Schedule bị dồn integration cuối kỳ | Likelihood Cao; impact Rất cao | Fail demo hoặc thiếu test/evaluation | Modules chỉ chạy riêng; không có integrated slice cuối tuần | Contract-first, daily integration, one E2E increment mỗi tuần | Pair across roles; freeze features sớm; ưu tiên critical path | All roles; Backend lead coordinates | `PLANNED` |
| RSK-03 | Team tạo ba silo Frontend/Backend/AI | Chưa có score từ nguồn | Rework, mismatch schema, ownership gap | Handoff chậm; duplicate types; story thiếu supporting role | Epic primary + supporting role, shared acceptance/Test Case, schema review | Cross-role swarm vào blocker; reassign support without changing product scope | All roles | `PLANNED` |
| RSK-04 | Academic API lỗi/rate limit | Likelihood Trung bình; impact Cao | Literature flow bị chặn | Timeout, rate-limit, auth/provider outage | Một API chính, bounded retry, cache khi phù hợp, normalize adapter | Manual source import; không thêm API thứ hai trong P0 | AI/Evidence Lead | `PLANNED` |
| RSK-05 | PDF parse sai hoặc không đọc được | Likelihood Cao; impact Cao | Evidence offset/provenance sai | Encrypted/malformed PDF; text mismatch; page extraction empty | MIME/size/page validation, PyMuPDF page model, exact-text check | Abstract/manual evidence with provenance; document limitation | Backend Lead + AI/Evidence Lead | `PLANNED` |
| RSK-06 | LLM structured output lỗi | Likelihood Cao; impact Trung bình | Job fail hoặc corrupt data | Invalid JSON/schema/enum/ID | Pydantic validation, ID allowlist, schema-specific prompts, bounded repair | Terminal error + regenerate/user path; never guess fields/IDs | AI/Evidence Lead | `PLANNED` |
| RSK-07 | Hallucination hoặc citation mismatch | Likelihood gắn với problem domain; impact Cao | Final spec chứa unsupported fact | Orphan claim, invalid span, human mismatch label | Claim–Evidence Integrity Loop, provenance, atomic review, finalization scan | Mark `UNSUPPORTED/NEEDS_REVIEW`, revise/remove; human review | AI/Evidence Lead | `PLANNED` |
| RSK-08 | Evidence verifier sai | Likelihood Trung bình; impact Cao | False support/rejection | Gold fixture disagreement, false positive/negative pattern | Deterministic first layer, one-pair rubric, human labels/confusion matrix | Downgrade to needs review/manual decision; report limitations | AI/Evidence Lead | `PLANNED` |
| RSK-09 | Ba Judge cùng bias | Likelihood Trung bình; impact Trung bình | Miss cùng issue hoặc false consensus | Gold issues missed by all; highly correlated findings | Independent prompts/context; target-specific rubrics; no cross-view | Human review, disclose same-provider limitation; do not add five Judges silently | AI/Evidence Lead | `PLANNED` |
| RSK-10 | Prompt injection từ PDF/source | Chưa có score từ nguồn; security P0 | Policy override, data/tool misuse | Document asks model to ignore rules, reveal data, execute action | Treat document as untrusted, delimit/minimize context, no tool authority, ID allowlist | Reject/flag content, manual evidence path, log security event | Backend Lead + AI/Evidence Lead | `PLANNED` |
| RSK-11 | Unsafe PDF upload | Chưa có score; security P0 | Parser abuse, storage exposure | Wrong MIME/ext, oversized/encrypted/malformed file, path tricks | Allowlist, exact limits, UUID filename, private volume, parser error isolation | Reject file, remove partial artifact, offer manual fallback | Backend Lead | `PLANNED` |
| RSK-12 | Secret leakage | Chưa có score; security P0 | Provider/database compromise | Secret in repo/log/error/export | Environment/secret configuration, redaction, no secret in client, least privilege | Rotate/revoke, purge exposed artifact where recoverable, incident note | Backend Lead | `PLANNED` |
| RSK-13 | Input/reference validation thiếu | Chưa có score; impact Cao | Cross-project link, corrupt graph, unauthorized data reference | Hallucinated ID, invalid relation/offset, schema bypass | API authority, Pydantic, DB constraints, same-project checks, transactions | Reject/rollback, preserve error code, add regression fixture | Backend Lead | `PLANNED` |
| RSK-14 | Retry loop gây duplicate/cost overrun | Likelihood liên quan LLM/API; impact Cao | Duplicate changes, runaway spend | Retry count rising; repeated side effect; budget warning | Hard retry cap, transient-only classification, idempotency/duplicate guards | Stop job, mark failure/budget exhausted, require explicit user rerun | Backend Lead | `PLANNED` |
| RSK-15 | Token/API cost vượt budget | Likelihood Trung bình; impact Cao | Không thể hoàn tất Judges/evaluation | Warning threshold, remaining budget insufficient | Pre-run estimate, max papers/calls/tokens/Judges, caching, prompt minimization | Hard stop; reduce corpus/reruns within declared protocol; report missing runs | AI/Evidence Lead + Backend Lead | `PLANNED` |
| RSK-16 | Queue integration chậm | Likelihood Trung bình; impact Trung bình | Platform work lấn feature | Redis/RQ work blocks P0 stories | P0 job abstraction and in-process execution | Defer Redis/RQ to P1; keep explicit job status | Backend Lead | `PLANNED` |
| RSK-17 | Deployment không tái lập hoặc demo lỗi | Chưa có score; impact Cao | Không bàn giao website | Clean setup fails; config/volume/migration mismatch | Docker Compose plan, config validation, health checks, early smoke test | One verified local deployment path; recorded manual demo fallback | Backend Lead | `PLANNED` |
| RSK-18 | Dataset/ground truth không đủ | Likelihood Cao; impact Trung bình | Evaluation yếu/không kết luận | Label count below plan; annotator disagreement; missing sources | Small planned ranges, early rubric, controlled errors, cross-check hidden subset | Reduce counts transparently, report limitation; never invent labels/results | AI/Evidence Lead | `PLANNED` |
| RSK-19 | Evaluation bias/confounded baseline | Chưa có score; impact Cao | Không thể diễn giải RQ1–RQ3 | Different model/data/budget/run conditions; leaked hidden cases | Freeze protocol, controlled conditions, record deviations, separate dev/hidden | Mark comparison invalid/inconclusive and rerun only if budget allows | AI/Evidence Lead | `PLANNED` |
| RSK-20 | P2 leakage vào MVP | Likelihood tied to scope risk; impact Cao | P0 trễ, architecture phình | Graph/GROBID/MinIO/five Judges/etc. enters current sprint/DoD | Automated/document audit; backlog priority gate | Remove from sprint/DoD; retain in P2 list only | Product Workflow Lead | `PLANNED` |

## 3. Security plan

### 3.1 Trust boundaries

- Browser/user input, academic API data, LLM output và uploaded documents đều untrusted.
- FastAPI validates all external input and owns authorization/domain transitions.
- LLM receives minimal delimited context and no direct database/file/tool access.
- API/worker share business domain but run with explicit file/database permissions.
- Local storage is private and mounted; web public directory never contains uploads.

### 3.2 PDF upload safety

Planned controls:

1. Allow `.pdf` only and verify MIME/content signature as selected by implementation.
2. Enforce maximum bytes and pages; exact values remain Open Questions.
3. Generate UUID storage filename; retain sanitized original name as metadata only.
4. Reject encrypted/malformed documents when PyMuPDF cannot safely parse.
5. Store outside public root with project-scoped access.
6. Delete/mark failed partial artifacts via a controlled cleanup path.
7. Never execute embedded code, links, attachments or document instructions.

### 3.3 Prompt injection handling

- Separate system/developer instructions from user/document content.
- Label paper text as untrusted evidence candidate.
- Restrict output to schema and allowlisted project IDs.
- No autonomous browsing/tool action from document content.
- Add fixtures for “ignore prior instructions,” data exfiltration, fake IDs and fake citations.
- Keep human confirmation before research choices and finalization.

### 3.4 Secret management

- API, LLM, database and deployment secrets use environment/approved secret mechanism.
- `.env` values are never committed; `.env.example` contains names only when created.
- Frontend receives no server secret.
- Logs/errors redact credentials, authorization headers and sensitive payloads.
- Rotation/revocation procedure must be documented when providers are selected.

### 3.5 Input validation

- Pydantic request/response schemas, enum and length validation.
- Database foreign keys/constraints and same-project reference checks.
- Offset/page/exact-text validation before evidence link acceptance.
- Structured LLM output rejects hallucinated IDs and forbidden authority statuses.
- Markdown/UI output escapes untrusted content according to rendering context.

## 4. Retry hard limits

- Structured JSON repair: at most the approved 1–2 attempts; planned default/final value must be chosen in AI configuration. It may never exceed two without a recorded decision.
- External API/model transient retry: bounded configurable count and timeout; exact values depend on provider and remain open.
- Permanent auth/validation/policy errors: no automatic retry.
- Side-effecting command: idempotency or duplicate guard before retry.
- Budget hard stop overrides remaining retries.
- Retry exhaustion produces terminal job error, never `SUCCEEDED` with hidden omission.

## 5. Token and API budget plan

### 5.1 Controls

- Per-project maximum papers.
- Per-task/per-workflow call and token allowance.
- Maximum Judge runs/reruns.
- Estimated-cost preview before expensive jobs.
- Warning threshold and hard stop.
- Cache validated result by input/prompt/model hash where privacy and correctness allow.
- Provider usage and application-measured latency logged when available.

### 5.2 Values still requiring decision

No numeric budget is present in the approved sources. The team must select:

- provider/model and price reference;
- max papers, calls, tokens and Judge runs;
- warning and hard-stop values;
- cache retention policy;
- live evaluation run budget.

Until selected, budget controls are `PLANNED`. No cost estimate is reported as actual spend.

## 6. Deployment risk controls

- Pin exact dependency/runtime versions when implementation begins.
- Validate required environment variables at startup.
- Apply migrations through one documented command/path.
- Use health checks for web/API/database and worker if enabled.
- Back up or seed only lawful demo data; never claim production durability.
- Test mounted-volume permissions and cleanup.
- Maintain one verified local/Docker demo path; Redis is absent unless P1 activated.

## 7. Dataset and ground-truth controls

- Manifest every case/source/split and lawful provenance.
- Freeze dev/hidden split and rubric before interpreting results.
- Use controlled error injection with explicit labels, separate from natural cases.
- Cross-check hidden subset by two members when feasible; otherwise record limitation.
- Preserve raw system outputs and annotation decisions.
- Do not treat Judge output as gold label by default.
- Report reduced sample size and threats to validity instead of fabricating coverage.

## 8. Open decisions

1. PDF maximum bytes/pages and MIME rules.
2. Provider/model, timeout/backoff and external retry count.
3. Token/call/Judge/paper budgets and warning/hard-stop thresholds.
4. Secret storage/rotation mechanism for the selected deployment.
5. Data retention/deletion policy for uploads, prompts, logs and evaluation artifacts.
6. Numeric demo responsiveness target.
7. Final dataset counts and human adjudication rule.

These decisions require team input or implementation evidence and are not resolved in this document.
