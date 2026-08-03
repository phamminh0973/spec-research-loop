# SPECLOOP — ĐỀ XUẤT ĐỒ ÁN CHI TIẾT

## Hệ thống hoàn thiện ý tưởng nghiên cứu dựa trên bằng chứng và vòng lặp xác nhận

**Tên sản phẩm:** SpecLoop  
**Tên tiếng Anh:** Evidence-Grounded Research Specification Assistant  
**Tên repository:** `spec-research-loop`  
**Loại tài liệu:** Đề xuất đồ án chuẩn dùng làm nguồn cho PRD, backlog, kiến trúc, AI design, test plan và các tài liệu triển khai  
**Nhóm thực hiện:** 3 sinh viên  
**Thời gian dự kiến:** 4 tuần  
**Kiến trúc định hướng:** Monorepo + Modular Monolith + Background Job Processing  
**Phạm vi domain ưu tiên:** Artificial Intelligence, Machine Learning, Natural Language Processing, Software Engineering và Data Science  
**Sản phẩm chính:** Website tạo research specification có cấu trúc, có nguồn minh chứng, có kế hoạch thí nghiệm, có phản biện độc lập và có lịch sử sửa đổi  

> Thời gian 4 tuần là ràng buộc dùng để kiểm soát scope và lập kế hoạch triển khai, không phải yêu cầu nghiệp vụ của sản phẩm.

---

# 1. Vai trò và phạm vi của tài liệu

Tài liệu này là proposal đã được chuẩn hóa từ đề bài gốc. Nó phải được dùng cùng với đề bài làm nguồn đầu vào cho Codex khi sinh các tài liệu dẫn xuất.

## 1.1. Thứ tự ưu tiên nguồn

Khi có khác biệt giữa các tài liệu:

1. Đề bài gốc của giảng viên.
2. Proposal cuối cùng này.
3. Các Architecture Decision Record đã được nhóm chấp thuận.
4. PRD, backlog, kiến trúc, test plan và tài liệu dẫn xuất.
5. Source code và test thực tế sau khi triển khai.

## 1.2. Nguyên tắc diễn giải

- Nội dung được ghi là **P0** thuộc Product MVP.
- Nội dung **P1** nên làm khi P0 ổn định.
- Nội dung **P2/Stretch** không được đưa vào Definition of Done của MVP.
- Ví dụ hoặc nội dung “khuyến khích sáng tạo” trong đề bài không tự động trở thành yêu cầu P0.
- Không được bịa kết quả thực nghiệm, metric, trạng thái triển khai hoặc khả năng hệ thống chưa được chứng minh.

---

# 2. Tóm tắt đề xuất

SpecLoop là website hỗ trợ người dùng chuyển một ý tưởng nghiên cứu còn mơ hồ thành một **research specification** rõ ràng và có thể kiểm chứng.

Thay vì yêu cầu LLM viết ngay một proposal hoàn chỉnh, hệ thống dẫn người dùng qua workflow:

```text
Ý tưởng nghiên cứu
→ Diễn giải lại và xác nhận cách hiểu
→ Phân rã thành problem, question, gap, contribution và claim
→ Tìm, chọn và quản lý công trình liên quan
→ Liên kết nhận định với evidence
→ Xây dựng kế hoạch thí nghiệm và ước lượng tính khả thi
→ Sinh research specification
→ Đánh giá bằng các Judge độc lập
→ Người dùng quyết định sửa đổi
→ Lưu phiên bản, diff và xuất bản cuối
```

SpecLoop không coi nội dung do LLM tạo ra là đúng mặc định. Factual claim quan trọng phải được truy vết đến nguồn, evidence hoặc một experiment dự kiến kiểm chứng. Hệ thống phân biệt nội dung do người dùng xác nhận với nội dung được verifier kiểm tra.

Trong giới hạn 4 tuần và team 3 người, mục tiêu là một **vertical slice end-to-end hoạt động ổn định**, không phải một nền tảng production hoàn chỉnh.

---

# 3. Bối cảnh và vấn đề

Một ý tưởng nghiên cứu ban đầu thường gặp các vấn đề:

- Problem statement chưa cụ thể.
- Research question quá rộng hoặc khó đo lường.
- Research gap được suy luận chủ quan.
- Contribution bị mô tả quá mức.
- Claim thiếu evidence hoặc điều kiện bác bỏ.
- Baseline và metric không đo đúng claim.
- Kế hoạch thí nghiệm vượt tài nguyên.
- Citation tồn tại nhưng không thực sự hỗ trợ nhận định.
- Các quyết định và thay đổi không được lưu vết.

LLM có thể tạo proposal nhanh nhưng dễ:

1. Sinh văn bản dài trước khi làm rõ giả định.
2. Trộn fact, hypothesis và quyết định người dùng.
3. Tạo citation hoặc diễn giải nguồn không chính xác.
4. Thiết kế experiment không đủ để kiểm chứng claim.
5. Đánh giá chính output của nó mà thiếu phản biện độc lập.

SpecLoop giải quyết bằng workflow có trạng thái, evidence grounding, independent review và user confirmation.

---

# 4. Mục tiêu

## 4.1. Mục tiêu tổng quát

Xây dựng website giúp người dùng hoàn thiện ý tưởng nghiên cứu thành research specification có cấu trúc, có bằng chứng, có kế hoạch kiểm chứng và có vòng lặp phản biện–sửa đổi.

## 4.2. Mục tiêu cụ thể

Hệ thống cần:

1. Diễn giải lại ý tưởng bằng ngôn ngữ dễ hiểu.
2. Cho phép xác nhận, chỉnh sửa hoặc yêu cầu tạo lại cách hiểu.
3. Phân rã ý tưởng thành các thành phần nghiên cứu có cấu trúc.
4. Tìm kiếm và quản lý nguồn học thuật.
5. Tạo related-work matrix có liên kết nguồn.
6. Phát hiện missing, ambiguity, conflict và unsupported content.
7. Đề xuất research gap dựa trên corpus hiện có, không tuyên bố novelty tuyệt đối.
8. Xây dựng contribution, atomic claim và điều kiện bác bỏ.
9. Liên kết claim với evidence và experiment.
10. Sinh kế hoạch thí nghiệm và ước lượng tính khả thi.
11. Tạo research specification 14 phần.
12. Chạy nhiều Judge độc lập.
13. Tổng hợp consensus và disagreement.
14. Cho người dùng quyết định sửa đổi.
15. Lưu version, hiển thị diff và xuất Markdown.

## 4.3. Tiêu chí thành công cấp sản phẩm

MVP thành công khi:

- Một idea đi được end-to-end đến bản spec cuối.
- Mỗi factual claim trong bản cuối có provenance hoặc được gắn trạng thái phù hợp.
- Ba Judge chạy độc lập và trả finding có cấu trúc.
- Người dùng xử lý finding và tạo phiên bản mới được.
- Có ít nhất **hai baseline độc lập** để so sánh với SpecLoop.
- Có test cho workflow chính và evidence integrity.
- Có một research specification hoàn chỉnh do hệ thống tạo ra.

---

# 5. Định vị, người dùng và non-goals

## 5.1. Định vị

> SpecLoop là một stateful research-specification co-pilot giúp người dùng kiểm tra logic, bằng chứng và khả năng kiểm chứng của ý tưởng trước khi triển khai nghiên cứu thực tế.

## 5.2. Người dùng mục tiêu

- Sinh viên làm đồ án, khóa luận hoặc nghiên cứu khoa học.
- Nhóm nghiên cứu cần chuẩn hóa ý tưởng trước khi trao đổi với giảng viên.
- Người dùng cần kiểm tra gap, claim, evidence và experiment của một đề tài.

## 5.3. Domain ưu tiên

MVP ưu tiên:

- AI/ML/NLP.
- Software Engineering.
- Data Science.

Paper và nguồn học thuật ưu tiên tiếng Anh. Hệ thống không tuyên bố hỗ trợ đồng đều mọi domain.

## 5.4. Non-goals

SpecLoop không:

- Bảo đảm research gap là mới trên toàn bộ tri thức khoa học.
- Bảo đảm paper được chấp nhận.
- Thay thế giảng viên, chuyên gia hoặc reviewer.
- Vượt paywall để lấy full text.
- Tự động thực thi mọi experiment được đề xuất.
- Loại bỏ hallucination hoàn toàn.
- Hỗ trợ production-scale collaboration và phân quyền phức tạp trong MVP.
- Lưu hoặc hiển thị private chain-of-thought.

---

# 6. Điểm đóng góp và cơ chế sáng tạo

Cần phân biệt **yêu cầu sản phẩm** với **cơ chế được đánh giá như contribution**.

## 6.1. Contribution chính — Claim–Evidence Integrity Loop

Đây là cơ chế sáng tạo chính cần được ưu tiên triển khai và đánh giá.

Mỗi factual claim phải thuộc một trong các trường hợp:

```text
Có evidence span cụ thể
HOẶC
Có experiment dự kiến kiểm chứng
HOẶC
Được đánh dấu là hypothesis/research question
HOẶC
Bị gắn UNSUPPORTED/NEEDS_REVIEW
```

Verifier MVP gồm:

### Tầng 1 — Deterministic integrity

- Source tồn tại.
- Metadata hoặc external identifier được lưu.
- Page/offset hợp lệ khi dùng PDF.
- Exact text tồn tại trong nội dung đã parse.
- Claim có evidence hoặc experiment liên kết.
- Link không trỏ đến dữ liệu đã xóa.

### Tầng 2 — Atomic claim–evidence review

LLM chỉ nhận:

- Một atomic claim.
- Một evidence span.
- Context ngắn.
- Rubric cố định.

Output:

```text
SUPPORTS
PARTIALLY_SUPPORTS
CONTRADICTS
INSUFFICIENT
IRRELEVANT
```

Cơ chế này được so sánh với baseline không có exact evidence verification.

## 6.2. Evidence-Grounded Spec Structure

Research specification được lưu thành typed nodes và relations để hỗ trợ:

- Kiểm tra orphan claim.
- Liên kết gap–contribution.
- Liên kết claim–evidence.
- Liên kết claim–experiment.
- Version và semantic diff.
- Targeted review.

Đây là nền tảng dữ liệu của sản phẩm. Graph visualization không bắt buộc P0.

## 6.3. Independent Multi-Judge Revision

Đây là yêu cầu cốt lõi của đề bài và cũng là cơ chế chất lượng:

1. Evidence Judge.
2. Research Judge.
3. Experiment Judge.

Các Judge chạy độc lập trước aggregation. MVP gom finding bằng rule xác định theo target, type và severity. Multi-model ensemble và semantic clustering là P2.

## 6.4. Claim-Scope Calibrator — P1

Cơ chế phát hiện claim rộng hơn phạm vi experiment.

Ví dụ:

```text
Claim: Phương pháp hoạt động trên nhiều domain.
Experiment: Chỉ đánh giá trên paper NLP tiếng Anh.
```

Finding:

```text
CLAIM_SCOPE_MISMATCH
Severity: MAJOR
Action: Thu hẹp claim hoặc mở rộng experiment
```

Nếu tiến độ không đủ, lỗi overclaim vẫn phải được Research Judge kiểm tra; calibrator rule riêng không chặn hoàn thành P0.

---

# 7. Mô hình research specification

## 7.1. Node types

```text
PROBLEM
RESEARCH_QUESTION
PRIOR_WORK_FINDING
LIMITATION
GAP
CONTRIBUTION
CLAIM
EVIDENCE
BASELINE
METRIC
EXPERIMENT
CONSTRAINT
RISK
OPEN_QUESTION
```

## 7.2. Relation types

```text
ADDRESSES
SUPPORTED_BY
CONTRADICTED_BY
TESTED_BY
MEASURED_BY
COMPARED_WITH
REQUIRES
LIMITED_BY
DERIVED_FROM
PART_OF
```

## 7.3. Trạng thái

```text
PROPOSED
USER_CONFIRMED
SYSTEM_VERIFIED
NEEDS_REVIEW
MISSING
AMBIGUOUS
UNSUPPORTED
CONFLICT
USER_REJECTED
SUPERSEDED
```

`USER_CONFIRMED` và `SYSTEM_VERIFIED` là hai authority khác nhau. Verifier không được xác nhận lựa chọn nghiên cứu thay người dùng.

---

# 8. Phạm vi chức năng

## 8.1. P0 — Product MVP

### A. Project và idea understanding

1. Tạo, xem và cập nhật project.
2. Nhập idea, domain, deadline và resource constraint.
3. Sinh interpretation, assumptions và ambiguities.
4. Cho phép Confirm, Edit, Regenerate hoặc nhập `Other`.
5. Không sang decomposition khi chưa có interpretation được xác nhận.

### B. Structured research logic

6. Sinh các node nghiên cứu chính.
7. Hiển thị và chỉnh sửa node dạng card/table.
8. Tạo/xóa relation.
9. Phát hiện missing, ambiguity, unsupported và conflict bằng rule cơ bản.
10. Lưu decision của người dùng.

### C. Literature và evidence

11. Sinh search query.
12. Tìm paper từ **ít nhất một academic API**.
13. Cho phép manual source import để bảo đảm demo khi API lỗi.
14. Normalize metadata và deduplicate.
15. Chọn paper vào project.
16. Upload PDF hợp pháp hoặc nhập abstract/manual text.
17. Parse PDF theo page.
18. Chọn/lưu exact evidence span hoặc manual evidence có provenance.
19. Liên kết evidence với claim/prior-work finding.
20. Tạo related-work matrix.
21. Kiểm tra deterministic integrity.
22. Chạy atomic claim–evidence review cho các claim demo.

### D. Gap, claim, experiment và feasibility

23. Đề xuất gap candidate dựa trên corpus đã chọn.
24. Hiển thị novelty-risk warning.
25. Cho phép chọn, sửa, kết hợp hoặc nhập `Other`.
26. Sinh contribution và atomic claim.
27. Tạo claim–evidence matrix.
28. Tạo claim–experiment matrix.
29. Sinh baseline, metric, protocol và ablation tối thiểu.
30. Ước lượng số call, token, runtime và tài nguyên bằng công thức minh bạch.

### E. Spec, Judge, revision và export

31. Sinh research specification 14 phần.
32. Chạy ba Judge độc lập.
33. Tổng hợp consensus, single-judge finding và disagreement.
34. Tạo lựa chọn sửa có giải thích, ví dụ và `Other`.
35. Lưu quyết định và tạo version mới.
36. Hiển thị diff theo section hoặc node.
37. Chạy lại kiểm tra liên quan ở mức cơ bản.
38. Finalize và xuất Markdown.

### F. Quality tối thiểu

39. Structured output validation.
40. Timeout và retry giới hạn.
41. Model/prompt/call log cơ bản.
42. Upload validation và budget limit.
43. Unit, integration, contract và end-to-end test cho luồng chính.
44. Docker Compose hoặc hướng dẫn local setup tái lập được.

## 8.2. P1 — Nên có

- Academic API thứ hai.
- Exact text hash.
- Redis + RQ và progress tracking đầy đủ.
- Claim-Scope Calibrator riêng.
- Semantic diff theo node tốt hơn.
- Cost dashboard cơ bản.
- Crossref DOI verification.
- Golden prompt regression.

## 8.3. P2/Stretch

- React Flow graph visualization.
- GROBID.
- MinIO/S3.
- Five-Judge configuration.
- Multi-model ensemble.
- Semantic clustering.
- Citation graph.
- Collaborative editing.
- PDF/DOCX export.
- Active Candidate Selection.
- Advanced observability.
- Fine-tuned NLI verifier.

---

# 9. Quy trình nghiệp vụ 10 bước

## Bước 1 — Idea interpretation

Input:

- Project name.
- Raw idea.
- Domain.
- Deadline.
- Resource/API constraints.

Output:

```json
{
  "simple_interpretation": "",
  "technical_interpretation": "",
  "assumptions": [],
  "objectives": [],
  "ambiguities": []
}
```

Người dùng Confirm, Edit, Regenerate hoặc nhập cách hiểu khác.

## Bước 2 — Structured decomposition

Sinh node problem, research question, gap candidate, contribution, claim, constraint, risk và open question.

Rule hậu xử lý đánh dấu missing, ambiguous, unsupported hoặc conflict.

## Bước 3 — Literature discovery

```text
Research question
→ Query generation
→ Academic API search
→ Normalize metadata
→ Deduplicate
→ Rank/shortlist
→ User selection
```

P0 dùng một API và manual import. API thứ hai là P1.

## Bước 4 — Evidence collection

```text
PDF/manual text
→ Validate
→ Parse page text
→ Select exact span
→ Save provenance
→ Link to claim
→ Verify integrity
```

Evidence tier:

```text
FULL_TEXT_EXACT
ABSTRACT_ONLY
SECONDARY_SOURCE
USER_ASSERTION
MANUAL_ENTRY
```

Đây là provenance/directness tier, không phải credibility score tuyệt đối.

## Bước 5 — Gap proposal

Mỗi gap candidate có:

- Known capability.
- Remaining limitation.
- Importance.
- Testable hypothesis.
- Supporting evidence.
- Nearest prior work.
- Novelty risk/counterevidence.
- Scope.

Luôn hiển thị:

> Không được bao phủ trong corpus hiện tại không đồng nghĩa với novelty toàn cầu.

## Bước 6 — Contribution và atomic claim

Mỗi claim gồm:

```text
Claim type
Claim text
Scope
Baseline
Dataset/domain
Metric
Expected direction
Falsification condition
Linked evidence
Linked experiment
```

## Bước 7 — Experiment planning

Kế hoạch tối thiểu:

- Hai baseline.
- Proposed approach.
- Metric.
- Dataset/setting.
- Control condition.
- Một ablation quan trọng.
- Generalization/robustness ở mức đề xuất.
- Resource estimate.

Các phương pháp phải được so sánh trong điều kiện kiểm soát hợp lý.

## Bước 8 — Feasibility estimation

Các công thức phải hiển thị giả định:

```text
calls = samples × candidates × rounds
estimated_tokens = calls × average_tokens_per_call
estimated_runtime = estimated_tokens / assumed_or_measured_throughput
estimated_cost = token_usage × provider_price
```

Nếu không có benchmark thật, hệ thống phải ghi rõ giá trị là ước lượng.

## Bước 9 — Spec generation

Bản spec gồm:

1. Problem statement.
2. Research questions.
3. Related-work matrix.
4. Research gap.
5. Proposed approach.
6. Expected contributions.
7. Claim–evidence matrix.
8. Experimental protocol.
9. Baselines and metrics.
10. Ablation plan.
11. Compute budget.
12. Risks and limitations.
13. Open issues.
14. Decision history.

Generator chỉ dùng confirmed nodes, source metadata, evidence links, experiment plans và user decisions. Factual claim mới phải được tạo dưới trạng thái `PROPOSED/NEEDS_REVIEW`.

## Bước 10 — Judge, revision và finalize

Judge output:

```json
{
  "target_node_id": "uuid",
  "finding_type": "",
  "severity": "MINOR|MAJOR|CRITICAL",
  "problem": "",
  "reason": "",
  "suggested_actions": []
}
```

Aggregation:

```text
target_node_id
+ finding_type
+ severity_band
```

Policy:

- Deterministic CRITICAL failure: bắt buộc sửa hoặc loại.
- MAJOR từ ít nhất hai Judge: consensus issue.
- MAJOR từ một Judge: single-judge flag.
- Action/severity conflict: yêu cầu user decision.
- Single MINOR: không tự động chặn finalize.

Revision tạo version mới, diff và rerun phần liên quan ở mức khả thi.

---

# 10. Yêu cầu chức năng chuẩn

| ID | Yêu cầu |
|---|---|
| FR-01 | Quản lý project nghiên cứu |
| FR-02 | Diễn giải lại idea thành simple/technical interpretation |
| FR-03 | User confirmation, edit, regenerate và Other |
| FR-04 | Structured decomposition thành typed nodes |
| FR-05 | Quản lý relation và node status |
| FR-06 | Tìm kiếm, import và quản lý nguồn |
| FR-07 | Tạo related-work matrix có provenance |
| FR-08 | Upload/parse PDF hoặc manual evidence fallback |
| FR-09 | Lưu và liên kết evidence span |
| FR-10 | Phát hiện ambiguity, conflict và unsupported content |
| FR-11 | Đề xuất gap kèm evidence và novelty-risk note |
| FR-12 | Xây dựng contribution và atomic claim |
| FR-13 | Kiểm tra claim–evidence integrity |
| FR-14 | Tạo experiment plan và feasibility estimate |
| FR-15 | Sinh research specification 14 phần |
| FR-16 | Chạy ba Judge độc lập |
| FR-17 | Tổng hợp consensus và disagreement |
| FR-18 | User revision và lưu decision |
| FR-19 | Version và diff |
| FR-20 | Finalize và Markdown export |
| FR-21 | Prompt/model/call logging cơ bản |

---

# 11. Yêu cầu phi chức năng

| ID | Yêu cầu |
|---|---|
| NFR-01 | Mọi factual claim trong bản cuối có provenance hoặc trạng thái rõ ràng |
| NFR-02 | Warning/Judge finding có lý do và suggested action |
| NFR-03 | CRUD phản hồi phù hợp điều kiện demo; long-running task có trạng thái |
| NFR-04 | LLM/API call có timeout, retry giới hạn và error status |
| NFR-05 | PDF upload được kiểm tra type, MIME, size và filename |
| NFR-06 | Có giới hạn paper, token, Judge run và budget |
| NFR-07 | Có local/Docker setup tái lập được |
| NFR-08 | Rule, schema và workflow chính có test |
| NFR-09 | Không thực thi instruction hoặc code từ tài liệu ngoài |
| NFR-10 | Không lưu private chain-of-thought |

---

# 12. Kiến trúc hệ thống

## 12.1. Quyết định kiến trúc

```text
Repository: spec-research-loop
Repository strategy: Monorepo
Application architecture: Modular Monolith
Long-running processing: Background jobs
Deployment: Docker Compose
```

Không dùng microservices trong đồ án. Background worker là thành phần thực thi job của cùng application/domain, không phải một business microservice độc lập.

## 12.2. Stack định hướng

```text
Frontend
- Next.js
- TypeScript
- Tailwind CSS
- TanStack Query

Backend
- FastAPI
- Pydantic
- SQLAlchemy
- Alembic

Database
- PostgreSQL

Background processing
- P0: job abstraction + persisted status; có thể chạy in-process cho demo nhỏ
- P1: Redis + RQ worker

Storage
- Local mounted volume

PDF
- PyMuPDF

AI
- Một configurable LLM provider
- Structured JSON output
- Embedding/NLI không bắt buộc P0

Delivery
- Docker Compose
- GitHub Actions cơ bản
```

## 12.3. Monorepo dự kiến

```text
spec-research-loop/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── schemas/
│   └── prompts/
├── docs/
├── infrastructure/
├── tests/
├── AGENTS.md
├── README.md
└── docker-compose.yml
```

`apps/worker` có thể dùng chung package/domain code với API. Không tách database theo module.

## 12.4. Backend capability modules

```text
projects
idea_understanding
spec_structure
literature
evidence
research_design
spec_generation
judging
revision
versions
exports
operations
```

Module boundary phục vụ tổ chức code và ownership; product backlog vẫn được tổ chức theo capability/vertical slice, không chia đơn thuần Frontend/Backend/AI.

---

# 13. Thiết kế dữ liệu mức khái niệm

## 13.1. Project và workflow

```text
users
projects
workflow_runs
workflow_steps
workflow_events
```

MVP có thể dùng demo user hoặc authentication tối giản.

## 13.2. Spec structure

```text
spec_nodes
spec_edges
node_status_history
```

## 13.3. Literature và evidence

```text
source_documents
source_files
document_pages
search_queries
search_results
evidence_spans
claim_evidence_links
```

Evidence span cần lưu tối thiểu:

```text
source_file_id
page_number
start_offset
end_offset
exact_text
entry_type
```

`text_hash` là P1.

## 13.4. Experiment, Judge và revision

```text
experiment_plans
experiment_claim_links
baseline_definitions
metric_definitions
resource_estimates
judge_runs
judge_findings
finding_groups
user_decisions
```

## 13.5. Version và operations

```text
spec_versions
spec_changes
prompt_templates
prompt_versions
model_calls
job_runs
audit_logs
```

Schema chi tiết sẽ được chốt trong Architecture & Technical Design, không xem danh sách trên là migration cuối cùng.

---

# 14. UI/UX tối thiểu

1. **Project Dashboard** — stage, unresolved nodes, findings, version.
2. **Understanding Screen** — idea, interpretation, assumptions, ambiguities, Confirm/Edit/Regenerate.
3. **Spec Workspace** — card/table nodes và relations.
4. **Literature Workbench** — search/import, shortlist, related-work matrix.
5. **Evidence Workspace** — page/manual text, claim, selected span và verification.
6. **Research Design Workspace** — gap, contribution, claim, experiment và estimate.
7. **Spec Preview** — 14 sections với provenance indicators.
8. **Judge Center** — consensus, single flags, conflicts và decision options.
9. **Version/Export** — diff, finalize và Markdown export.

Graph visualization là P2.

---

# 15. Prompt, AI và reliability rules

- Mỗi AI task có input/output schema.
- Output được validate bằng Pydantic.
- JSON lỗi được retry tối đa 1–2 lần.
- Prompt và schema được version hóa.
- Không dùng một prompt duy nhất để tìm nguồn, tạo claim và tự xác minh.
- Document/PDF là untrusted data, không phải instruction.
- Judge không được xem finding của Judge khác trước aggregation.
- Không yêu cầu hoặc lưu private chain-of-thought.
- Model-call log lưu provider, model, prompt version, token, latency, estimated cost, retry và status.
- Cost chưa đo phải ghi là estimate.
- External API và model call phải có timeout.
- Retry chỉ dành cho lỗi tạm thời và không retry vô hạn.

---

# 16. Bảo mật tối thiểu

## 16.1. Upload

- Allowlist PDF.
- Kiểm tra extension và MIME.
- Giới hạn dung lượng và số trang.
- Đổi filename bằng UUID.
- Không lưu trong public web root.
- Reject encrypted/malformed file khi parser không xử lý được.

## 16.2. Prompt injection

- Tách system instruction và document content.
- Chỉ gửi context cần thiết.
- Không cho tài liệu điều khiển tool.
- Không thực thi code/lệnh từ paper.
- Ghi provenance của context.

## 16.3. Cost và abuse control

- Max papers/project.
- Max Judge runs.
- Token/API budget.
- Warning threshold và hard stop.
- Cache theo input hash khi phù hợp.

---

# 17. Kế hoạch kiểm thử và đánh giá

## 17.1. Software verification

- Unit test: state, edge integrity, dedup, offsets, scope rule, grouping, estimator, diff.
- Contract test: valid/malformed JSON, missing field, invalid enum, hallucinated ID.
- Integration test: source search/import, PDF parse, evidence link, Judge run, export.
- Evidence integrity test: source/page/span/link validity.
- End-to-end test: idea → spec → Judge → revision → export.

## 17.2. Baselines bắt buộc

Đề bài yêu cầu ít nhất hai baseline. Hai baseline sau là P0:

### B0 — Single-shot LLM

```text
Idea → Spec 14 phần bằng một prompt
```

### B1 — Staged pipeline without evidence verification and Multi-Judge

```text
Interpretation → decomposition → spec
```

Không có exact evidence integrity, independent Judges và revision loop.

### Proposed — SpecLoop MVP

```text
Structured specification
+ literature/evidence
+ integrity verification
+ 3 Judges
+ user revision
```

`Proposed` không được tính là một baseline.

## 17.3. Câu hỏi đánh giá chính

- **RQ1:** SpecLoop có giảm human-verified Unsupported Claim Rate so với B0 và B1 không?
- **RQ2:** Claim–Evidence Integrity Loop có phát hiện citation mismatch tốt hơn B1 không?
- **RQ3:** Independent Judges có phát hiện nhiều gold issues hơn single/self review không?

RQ về Claim-Scope Calibrator chỉ thực hiện khi cơ chế P1 được hoàn thành.

## 17.4. Dataset phù hợp 4 tuần

- 8–12 research ideas.
- 5–7 development cases.
- 3–5 hidden test cases.
- 50–80 claim–evidence pairs nếu đủ nguồn lực; có thể giảm nhưng phải báo cáo rõ.
- Controlled error injection cho citation mismatch/unsupported claim.
- Hidden subset được ít nhất hai thành viên kiểm tra chéo khi có thể.

## 17.5. Metric

Primary:

```text
Human-verified Unsupported Claim Rate
```

Secondary:

- Evidence verification precision/recall/F1.
- Citation validity.
- Claim–experiment coverage.
- Spec completeness.
- Judge issue recall.
- JSON validity.
- Time to finalize.
- Token/cost/latency.

Không bắt buộc kiểm định thống kê phức tạp với dataset nhỏ; phải báo cáo mean/median, tỷ lệ, confusion matrix, error analysis và limitations.

---

# 18. Roadmap 4 tuần

Proposal chỉ giữ roadmap cấp milestone. Task chi tiết, estimate, owner và dependency phải nằm trong Product Backlog/Roadmap dẫn xuất.

| Tuần | Sprint goal | Deliverable/exit criteria |
|---|---|---|
| 1 | Foundation và first vertical slice | Tạo project, nhập idea, interpretation được xác nhận, decomposition/cards được lưu |
| 2 | Literature và evidence slice | Search/import source, related-work matrix, PDF/manual evidence, claim–evidence link |
| 3 | Research design, spec và review slice | Gap, claim, experiment, spec 14 phần, ba Judge, user revision chạy end-to-end |
| 4 | Stabilization và evaluation | Version/diff, Markdown export, B0/B1 evaluation, test, deploy, report và video |

## 18.1. Cut line

- Cuối tuần 1: không thêm authentication/phân quyền phức tạp.
- Cuối tuần 2: nếu academic API thứ hai chưa ổn, giữ một API + manual import.
- Cuối tuần 3: feature freeze P0; không bắt đầu P2.
- Tuần 4: ưu tiên bug, evaluation, test, report và demo.

---

# 19. Tổ chức team 3 người

Dùng primary ownership, không tạo ba silo độc lập.

## Member 1 — Product Workflow and Frontend Lead

- User journey.
- Web UI.
- Interpretation/spec/revision/version screens.
- Frontend integration và E2E UX.

## Member 2 — Backend, Data and Platform Lead

- FastAPI structure.
- Database/migration.
- APIs.
- Job status/worker.
- Docker, reliability và integration tests.

## Member 3 — AI, Evidence and Evaluation Lead

- Prompt/schema.
- Literature/evidence pipeline.
- Spec generator và Judges.
- Baseline, dataset và AI evaluation.

Mỗi Epic có một primary role và supporting role. Mỗi thành viên chịu trách nhiệm test phần mình làm. Integration theo vertical slice được thực hiện liên tục, không dồn cuối dự án.

---

# 20. Backlog priority

## P0

- End-to-end workflow.
- Interpretation confirmation.
- Typed nodes/cards và relations.
- Một academic API + manual import.
- Related-work matrix.
- PDF/manual evidence và provenance.
- Claim–evidence integrity.
- Gap, claim, experiment và estimate.
- Spec 14 phần.
- Ba Judges.
- User decision/revision.
- Version/diff cơ bản.
- Markdown export.
- Hai baseline B0 và B1.
- Test và reproducible setup.

## P1

- Academic API thứ hai.
- Redis/RQ worker.
- Exact text hash.
- Claim-Scope Calibrator.
- Better semantic diff.
- Prompt regression và cost dashboard.

## P2

- Graph visualization.
- GROBID/MinIO.
- Multi-model/five Judges.
- Semantic clustering.
- Collaboration.
- PDF/DOCX export.
- Active Candidate Selection.

---

# 21. Rủi ro chính

| Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---:|---:|---|
| Scope quá lớn | Cao | Rất cao | Khóa P0/P1/P2 và feature freeze cuối tuần 3 |
| Academic API lỗi/rate limit | Trung bình | Cao | Một API chính, cache và manual import |
| PDF parse sai | Cao | Cao | Page parser, manual evidence fallback |
| LLM JSON lỗi | Cao | Trung bình | Schema validation, retry giới hạn |
| Evidence verifier sai | Trung bình | Cao | Deterministic checks và human review |
| Judge cùng bias | Trung bình | Trung bình | Independent prompts/context và gold issue set |
| API cost vượt | Trung bình | Cao | Budget, max rerun, caching |
| Queue integration chậm | Trung bình | Trung bình | In-process job mode cho P0, Redis/RQ P1 |
| Không đủ dữ liệu | Cao | Trung bình | Dataset nhỏ, controlled errors, báo cáo limitations |
| Integration dồn cuối | Cao | Rất cao | Vertical slice mỗi tuần |

---

# 22. Sản phẩm bàn giao

1. Website chạy được.
2. Source code.
3. README và local/Docker setup.
4. Tài liệu kiến trúc.
5. Dataset hoặc use-case set.
6. Prompt của generator và ba Judges.
7. Claim–evidence integrity mechanism.
8. Hai baseline B0 và B1.
9. Báo cáo đánh giá.
10. Video demo.
11. Một research specification hoàn chỉnh.
12. Markdown export.

---

# 23. Requirement Traceability cấp đề bài

| # | Yêu cầu đề bài | Thành phần proposal |
|---:|---|---|
| 1 | Nhập ý tưởng | Project + idea input |
| 2 | Diễn giải lại | Interpretation |
| 3 | Phân rã problem/gap/claim/contribution/evidence | Typed nodes |
| 4 | Tìm kiếm và quản lý nguồn | Literature workbench |
| 5 | Related-work matrix | Related-work generation |
| 6 | Ambiguity và conflict | Status/rule checks |
| 7 | Lựa chọn có giải thích, ví dụ và Other | Decision UI |
| 8 | Lưu quyết định | User decisions |
| 9 | Experiment plan | Experiment planner |
| 10 | Resource feasibility | Estimator |
| 11 | Research spec | 14-section generator |
| 12 | Nhiều Judge độc lập | Three-Judge MVP |
| 13 | Consensus/disagreement | Finding aggregation |
| 14 | User revision | Revision workflow |
| 15 | Version và diff | Snapshots + diff |
| 16 | Xuất spec cuối | Markdown export |

---

# 24. Definition of Done

MVP hoàn thành khi:

1. User tạo project và nhập idea.
2. Interpretation được tạo và xác nhận/chỉnh sửa.
3. Structured nodes và relations được lưu/chỉnh sửa.
4. Có literature search từ một academic API và manual import fallback.
5. Có related-work matrix.
6. Có PDF/manual evidence với provenance.
7. Có claim–evidence và claim–experiment matrix.
8. Gap có supporting evidence và novelty-risk note.
9. Có experiment plan và feasibility estimate.
10. Sinh được spec 14 phần.
11. Ba Judge chạy độc lập.
12. Có consensus/single flag/conflict.
13. User xử lý finding và tạo version mới.
14. Có diff và Markdown export.
15. B0 và B1 được chạy và so sánh với SpecLoop.
16. Có test cho workflow chính, structured output và evidence integrity.
17. Có setup tái lập được.
18. Có báo cáo, video và spec mẫu hoàn chỉnh.

P1/P2 không nằm trong Definition of Done.

---

# 25. Hướng dẫn dùng proposal này để sinh tài liệu khác

Codex phải đọc:

1. Đề bài gốc.
2. Proposal cuối cùng này.

Sau đó mới sinh:

```text
docs/proposal/project-proposal.md
docs/product/requirements-catalog.md
docs/product/prd.md
docs/product/requirement-traceability-matrix.md
docs/project-management/product-backlog.md
docs/project-management/roadmap-4-weeks.md
docs/project-management/team-ownership.md
docs/architecture/architecture-and-technical-design.md
docs/architecture/adr/*.md
docs/ai/ai-llm-design.md
docs/testing/test-and-evaluation-plan.md
docs/testing/test-cases.md
docs/project-management/risk-security-cost.md
docs/report/final-report-outline.md
```

Quy tắc:

- Derived documents không được thay đổi P0/P1/P2 mà không có ADR hoặc quyết định nhóm.
- Product Backlog phải khả thi trong 4 tuần cho team 3 người.
- Mỗi FR phải ánh xạ tới user story, module và test.
- Không bịa result, implementation status hoặc command chưa tồn tại.
- Proposal chỉ giữ milestone; task chi tiết nằm trong backlog.
- Architecture dùng monorepo + modular monolith, không microservices.
- Repository dùng tên `spec-research-loop`.

---

# 26. Kết luận

SpecLoop được đề xuất như một hệ thống hoàn thiện research specification theo hướng:

```text
Có cấu trúc
+ Có nguồn và provenance
+ Có kế hoạch kiểm chứng
+ Có phản biện độc lập
+ Có người dùng xác nhận
+ Có version và diff
```

Trong 4 tuần, team 3 người tập trung chứng minh workflow end-to-end và contribution chính là **Claim–Evidence Integrity Loop**. Các cơ chế khác được triển khai theo mức ưu tiên, không làm scope P0 mất kiểm soát.

Nguyên tắc cốt lõi:

> SpecLoop không tuyên bố loại bỏ hallucination hoàn toàn. Hệ thống cung cấp khả năng truy vết, phát hiện, cảnh báo và yêu cầu xử lý factual claim chưa đủ bằng chứng trước khi đưa vào research specification cuối.
