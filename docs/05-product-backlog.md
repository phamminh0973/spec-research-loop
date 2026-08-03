# SpecLoop — Product Backlog

**Trạng thái:** `PLANNED`  
**Product Goal:** Trong khoảng bốn tuần, team ba người tạo một vertical slice giúp user chuyển idea thành evidence-grounded research specification, nhận review từ ba Judge độc lập, sửa đổi, version và export Markdown.

## 1. Backlog hierarchy and planning rules

```text
Product Goal
→ Capability
→ Epic (EP-xx)
→ User Story (US-xx)
→ Technical Task (TT-USxx-xx)
→ Planned Test Case (TC-xx)
```

- Estimate dùng person-day (PD) để kiểm soát scope, không phải actual effort.
- Toàn bộ P0 estimate dưới đây là khoảng **45 PD**. Năng lực lý thuyết 3 người × 20 ngày là 60 PD; phần không phân bổ cho feature story dành cho integration, bug fixing, evaluation, documentation, report, demo và contingency.
- P1 chỉ bắt đầu khi P0 ổn định; P2 không thuộc Product MVP.
- Mỗi task trong tài liệu này thuộc đúng một User Story.

## 2. Capabilities and Epics

### Capability 1 — Project and Idea Understanding

| Epic ID | Goal | User value | Priority | Dependencies | Exit criteria | Primary owner role | Supporting role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-01 | Tạo project workspace và lưu idea/constraints. | User có nơi bắt đầu và quay lại research project. | P0 | — | Project CRUD và persisted inputs đáp ứng US-01/TC-01. | Member 2 — Backend, Data and Platform Lead | Member 1 — Product Workflow and Frontend Lead |
| EP-02 | Diễn giải idea và lấy user confirmation. | User kiểm tra hệ thống hiểu đúng trước khi đi tiếp. | P0 | EP-01, EP-10 | Simple/technical interpretation và decision gate đáp ứng US-02/US-03. | Member 1 — Product Workflow and Frontend Lead | Member 3 — AI, Evidence and Evaluation Lead; Member 2 |
| EP-03 | Phân rã idea thành typed nodes/relations và basic statuses. | User chỉnh sửa logic nghiên cứu thay vì chỉ đọc văn bản dài. | P0 | EP-02 | Nodes/relations/status rules đáp ứng US-04…US-06. | Member 2 — Backend, Data and Platform Lead | Member 1; Member 3 |

### Capability 2 — Literature and Evidence

| Epic ID | Goal | User value | Priority | Dependencies | Exit criteria | Primary owner role | Supporting role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-04 | Tạo selected literature corpus và related-work matrix. | User thấy prior work có provenance và có fallback khi API lỗi. | P0 | EP-01, EP-03, EP-10 | Một API + manual import + matrix đáp ứng US-07/US-08. | Member 3 — AI, Evidence and Evaluation Lead | Member 2; Member 1 |
| EP-05 | Thu thập evidence span và kiểm tra claim–evidence integrity. | User phân biệt citation tồn tại với evidence thực sự hỗ trợ claim. | P0 | EP-03, EP-04, EP-10, EP-11 | PDF/manual evidence, links và verifier đáp ứng US-09…US-11. | Member 3 — AI, Evidence and Evaluation Lead | Member 2 — Backend, Data and Platform Lead |

### Capability 3 — Research Specification Design

| Epic ID | Goal | User value | Priority | Dependencies | Exit criteria | Primary owner role | Supporting role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-06 | Xây dựng gap, contribution, atomic claims và experiment plan khả thi. | User có research design có thể bác bỏ và có resource assumptions. | P0 | EP-03, EP-04, EP-05 | US-12…US-14 và TC tương ứng đạt planned acceptance. | Member 3 — AI, Evidence and Evaluation Lead | Member 1; Member 2 |

### Capability 4 — Specification Generation and Review

| Epic ID | Goal | User value | Priority | Dependencies | Exit criteria | Primary owner role | Supporting role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-07 | Sinh research specification 14 phần có provenance/status. | User có artifact thống nhất để review. | P0 | EP-03…EP-06, EP-10 | US-15/TC-15 hoàn tất; không có factual claim unlabeled. | Member 3 — AI, Evidence and Evaluation Lead | Member 1; Member 2 |
| EP-08 | Chạy ba Judge độc lập và aggregate findings. | User nhận phản biện có cấu trúc, agreement/disagreement rõ. | P0 | EP-05…EP-07, EP-10 | US-16/US-17 đáp ứng independence và deterministic policy. | Member 3 — AI, Evidence and Evaluation Lead | Member 2; Member 1 |

### Capability 5 — Revision, Versioning and Export

| Epic ID | Goal | User value | Priority | Dependencies | Exit criteria | Primary owner role | Supporting role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-09 | User quyết định sửa, tạo version/diff và export Markdown. | User giữ authority và lịch sử thay đổi đến bản final. | P0 | EP-07, EP-08, EP-10, EP-11 | US-18…US-20 hoàn tất; previous version không bị overwrite. | Member 1 — Product Workflow and Frontend Lead | Member 2; Member 3 |

### Capability 6 — Platform Quality

| Epic ID | Goal | User value | Priority | Dependencies | Exit criteria | Primary owner role | Supporting role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP-10 | Cung cấp job lifecycle và model-call logging dùng chung. | User thấy long-task status; team truy vết AI calls và failures. | P0 | EP-01 | US-21/TC-21; mọi long-running story dùng job abstraction. | Member 2 — Backend, Data and Platform Lead | Member 3 |
| EP-11 | Áp dụng reliability, upload, injection, secret và budget controls. | Workflow demo an toàn và không vượt giới hạn im lặng. | P0 | EP-01, EP-10 | Relevant NFR acceptance trong US-22/TC-22. | Member 2 — Backend, Data and Platform Lead | Member 3; Member 1 |
| EP-12 | Test, B0/B1 evaluation, reproducible delivery, report và demo. | Team có evidence bàn giao thay vì assertion. | P0 | EP-01…EP-11 | Critical tests/evaluation/deploy/report artifacts tồn tại và đã chạy khi chuyển khỏi `PLANNED`. | Member 3 — AI, Evidence and Evaluation Lead | Member 2; Member 1 |

## 3. P0 User Stories

| US ID | Epic | User story statement | Priority | Acceptance criteria | Estimate | Dependencies | Week | Owner role | Planned TC |
| --- | --- | --- | --- | --- | ---: | --- | ---: | --- | --- |
| US-01 | EP-01 | Là user, tôi muốn tạo/xem/cập nhật project và idea/constraints để quản lý một nghiên cứu. | P0 | Project fields persist, retrieve và update đúng; invalid input bị reject. | 1.5 PD | — | 1 | Member 2 | TC-01 |
| US-02 | EP-02 | Là user, tôi muốn nhận simple/technical interpretation để kiểm tra cách hệ thống hiểu idea. | P0 | Structured output đủ field, schema-valid và hiển thị được. | 1.5 PD | US-01, US-21 | 1 | Member 3 | TC-02 |
| US-03 | EP-02 | Là user, tôi muốn Confirm/Edit/Regenerate/Other và chặn decomposition trước confirm. | P0 | Bốn action lưu đúng kết quả; gate reject transition chưa confirm. | 1.0 PD | US-02 | 1 | Member 1 | TC-03 |
| US-04 | EP-03 | Là user, tôi muốn xem/chỉnh typed nodes để làm rõ logic nghiên cứu. | P0 | Required P0 node types/statuses persist và edit; AI output bắt đầu proposed. | 2.0 PD | US-03 | 1 | Member 2 | TC-04 |
| US-05 | EP-03 | Là user, tôi muốn tạo/xóa relations và xem status history. | P0 | Valid relation succeeds; invalid/cross-project relation fails; authority history retained. | 1.5 PD | US-04 | 1 | Member 2 | TC-05 |
| US-06 | EP-03 | Là user, tôi muốn thấy missing/ambiguous/conflict/unsupported warnings để biết cần xử lý gì. | P0 | Rule fixtures map đúng status với reason/action. | 1.5 PD | US-04, US-05 | 1 | Member 3 | TC-06 |
| US-07 | EP-04 | Là user, tôi muốn search/import/select scholarly sources để tạo corpus. | P0 | Một API path và manual fallback normalize/deduplicate/select được sources. | 2.5 PD | US-01, US-21, US-22 | 2 | Member 3 | TC-07 |
| US-08 | EP-04 | Là user, tôi muốn related-work matrix có provenance để kiểm tra từng nhận định. | P0 | Mỗi row/statement có source/evidence ref; orphan bị warning. | 1.5 PD | US-07 | 2 | Member 3 | TC-08 |
| US-09 | EP-05 | Là user, tôi muốn upload/parse PDF hoặc nhập evidence thủ công để không phụ thuộc full text. | P0 | Safe PDF parse theo page; bad file reject; manual/abstract tier hoạt động. | 2.5 PD | US-07, US-22 | 2 | Member 2 | TC-09 |
| US-10 | EP-05 | Là user, tôi muốn lưu exact evidence span và link tới claim/prior work. | P0 | Page/offset/exact text/link validity được enforce; provenance hiển thị. | 2.0 PD | US-04, US-09 | 2 | Member 2 | TC-10 |
| US-11 | EP-05 | Là user, tôi muốn verifier kiểm tra claim–evidence để phát hiện mismatch/unsupported claim. | P0 | Deterministic failures đúng; atomic review chỉ trả allowed verdict + reason. | 2.5 PD | US-10, US-21 | 2 | Member 3 | TC-11 |
| US-12 | EP-06 | Là user, tôi muốn gap candidate có evidence và novelty-risk warning để tránh claim novelty tuyệt đối. | P0 | Candidate đủ field, corpus refs và warning; Select/Edit/Combine/Other hoạt động. | 2.0 PD | US-08, US-11 | 2 | Member 3 | TC-12 |
| US-13 | EP-06 | Là user, tôi muốn contribution và atomic claims có scope/falsification để thiết kế kiểm chứng. | P0 | Claim schema đủ fields và links; user edit/confirm được. | 2.0 PD | US-12 | 2 | Member 3 | TC-13 |
| US-14 | EP-06 | Là user, tôi muốn experiment plan và estimate minh bạch để đánh giá feasibility. | P0 | B0/B1/proposed, metrics, control, ablation, links và formula assumptions đủ. | 3.0 PD | US-13 | 2 | Member 3 | TC-14 |
| US-15 | EP-07 | Là user, tôi muốn sinh specification 14 phần từ dữ liệu được phép. | P0 | Đủ 14 sections; provenance/status scan pass; factual content mới needs review. | 2.5 PD | US-08, US-11, US-14, US-21 | 3 | Member 3 | TC-15 |
| US-16 | EP-08 | Là user, tôi muốn Evidence/Research/Experiment Judge chạy độc lập để giảm self-review bias. | P0 | Đúng ba Judge; independent context; structured findings; failure explicit. | 3.0 PD | US-15, US-21 | 3 | Member 3 | TC-16 |
| US-17 | EP-08 | Là user, tôi muốn thấy consensus, single flags và disagreement để ưu tiên xử lý. | P0 | Grouping/severity fixtures theo BR-06; không semantic clustering P0. | 1.5 PD | US-16 | 3 | Member 2 | TC-17 |
| US-18 | EP-09 | Là user, tôi muốn chọn explained revision action hoặc Other để giữ quyền quyết định. | P0 | Decision persist với actor/target; AI không auto-apply choice; targeted rerun tracked. | 2.0 PD | US-17 | 3 | Member 1 | TC-18 |
| US-19 | EP-09 | Là user, tôi muốn version và basic diff để xem thay đổi. | P0 | Revision tạo snapshot mới; section/node diff hiển thị; old version intact. | 1.5 PD | US-18 | 3 | Member 2 | TC-19 |
| US-20 | EP-09 | Là user, tôi muốn finalize và export Markdown khi specification đủ điều kiện. | P0 | Gate chặn known blocker; export đúng selected version và 14 sections. | 1.0 PD | US-19 | 3 | Member 1 | TC-20 |
| US-21 | EP-10 | Là operator, tôi muốn job state và model-call log để truy vết long tasks, errors và usage. | P0 | Persisted lifecycle, bounded retry, provider/model/prompt/status/usage fields; missing values không bị bịa. | 1.5 PD | US-01 | 1–3 | Member 2 | TC-21 |
| US-22 | EP-11 | Là operator, tôi muốn security, validation, retry và budget safeguards để workflow không chạy ngoài boundary. | P0 | NFR-05, NFR-06, NFR-09 và NFR-10 có control/error path testable; secret/input/retry rules được enforce. | 2.5 PD | US-01, US-21 | 1–3 | Member 2 | TC-22 |
| US-23 | EP-12 | Là team, tôi muốn tests, B0/B1 evaluation và reproducible delivery để bàn giao có evidence. | P0 | NFR-07/NFR-08, critical test classes, B0/B1 protocol/run evidence, Docker/local setup, report/demo checklist được đáp ứng trước Done. | 2.5 PD | US-01…US-22 | 1–4 | Member 3 | TC-23 |

**Tổng estimate P0 feature/story:** 45 PD. Estimate này cần được refine trong sprint planning; không phải actual effort hoặc cam kết đã hoàn thành.

## 4. Technical Tasks by User Story

| Task ID | Parent User Story | Planned technical task | Primary role |
| --- | --- | --- | --- |
| TT-US01-01 | US-01 | Define project schema/repository/API contracts. | Member 2 |
| TT-US01-02 | US-01 | Build minimal project/idea UI and validation. | Member 1 |
| TT-US02-01 | US-02 | Define interpretation schema/prompt/service and contract fixtures. | Member 3 |
| TT-US02-02 | US-02 | Integrate interpretation request/status UI. | Member 1 |
| TT-US03-01 | US-03 | Implement decision persistence and confirmation state transition. | Member 2 |
| TT-US03-02 | US-03 | Build Confirm/Edit/Regenerate/Other interactions. | Member 1 |
| TT-US04-01 | US-04 | Define node enums/schema and decomposition service. | Member 2 / Member 3 |
| TT-US04-02 | US-04 | Build editable card/table workspace. | Member 1 |
| TT-US05-01 | US-05 | Implement relation validation and status history. | Member 2 |
| TT-US05-02 | US-05 | Add relation/status UI. | Member 1 |
| TT-US06-01 | US-06 | Implement basic deterministic status rules and fixtures. | Member 3 / Member 2 |
| TT-US07-01 | US-07 | Select academic API adapter and normalize/deduplicate records. | Member 3 / Member 2 |
| TT-US07-02 | US-07 | Implement manual import, shortlist and fallback UI. | Member 1 / Member 2 |
| TT-US08-01 | US-08 | Define related-work schema/generator with provenance allowlist. | Member 3 |
| TT-US08-02 | US-08 | Render matrix and provenance links. | Member 1 |
| TT-US09-01 | US-09 | Implement upload validation, private local storage and PyMuPDF page extraction. | Member 2 |
| TT-US09-02 | US-09 | Implement manual/abstract evidence fallback. | Member 1 / Member 2 |
| TT-US10-01 | US-10 | Implement span offsets/exact-text validation and claim link repository. | Member 2 |
| TT-US10-02 | US-10 | Build evidence selection/link UI. | Member 1 |
| TT-US11-01 | US-11 | Implement deterministic integrity rules. | Member 2 / Member 3 |
| TT-US11-02 | US-11 | Define atomic review schema/prompt/rubric and contract tests. | Member 3 |
| TT-US12-01 | US-12 | Define gap generator and novelty-risk policy. | Member 3 |
| TT-US12-02 | US-12 | Build candidate Select/Edit/Combine/Other UI. | Member 1 |
| TT-US13-01 | US-13 | Define contribution/claim schemas and generation. | Member 3 |
| TT-US13-02 | US-13 | Persist/edit claim scope and links. | Member 2 / Member 1 |
| TT-US14-01 | US-14 | Implement experiment/baseline/metric/link model. | Member 2 / Member 3 |
| TT-US14-02 | US-14 | Implement transparent deterministic estimator and assumptions UI. | Member 3 / Member 1 |
| TT-US15-01 | US-15 | Define 14-section template, generator and provenance rules. | Member 3 |
| TT-US15-02 | US-15 | Build spec preview with status/provenance indicators. | Member 1 |
| TT-US16-01 | US-16 | Define three isolated Judge prompts/schemas/jobs. | Member 3 |
| TT-US16-02 | US-16 | Persist Judge runs/findings and failure status. | Member 2 |
| TT-US17-01 | US-17 | Implement deterministic finding grouping/policy fixtures. | Member 2 / Member 3 |
| TT-US17-02 | US-17 | Build Judge Center views. | Member 1 |
| TT-US18-01 | US-18 | Implement decision/revision application service and targeted rerun plan. | Member 2 / Member 3 |
| TT-US18-02 | US-18 | Build revision options/Other interaction. | Member 1 |
| TT-US19-01 | US-19 | Implement immutable snapshots and basic diff. | Member 2 |
| TT-US19-02 | US-19 | Build version/diff view. | Member 1 |
| TT-US20-01 | US-20 | Implement finalization gate and Markdown renderer. | Member 2 |
| TT-US20-02 | US-20 | Build finalize/export UI. | Member 1 |
| TT-US21-01 | US-21 | Implement persisted job abstraction/status API. | Member 2 |
| TT-US21-02 | US-21 | Implement prompt/model/call logging with redaction. | Member 2 / Member 3 |
| TT-US22-01 | US-22 | Implement upload, prompt-injection, secret and input-validation safeguards. | Member 2 / Member 3 |
| TT-US22-02 | US-22 | Implement bounded retry, usage limits, warning and hard-stop paths. | Member 2 / Member 3 |
| TT-US23-01 | US-23 | Build unit/contract/integration/E2E/security test suites and fixtures. | All roles |
| TT-US23-02 | US-23 | Prepare B0/B1 dataset, human rubric and evaluation scripts. | Member 3 |
| TT-US23-03 | US-23 | Create verified local/Docker setup, report and demo assets. | Member 2 / All roles |

## 5. P1 backlog

| Item | Parent capability | Dependency | Promotion condition |
| --- | --- | --- | --- |
| Second academic API | Literature and Evidence | US-07 stable | P0 API/manual fallback stable and capacity remains |
| Exact-text hash | Literature and Evidence | US-10 stable | Provenance needs stronger change detection |
| Redis + RQ/full progress | Platform Quality | US-21 stable | Observed job lifetime/recovery need justifies queue |
| Claim-Scope Calibrator | Research Specification Design | US-13/US-14 stable | Research Judge overclaim checks stable |
| Better semantic diff | Revision/Versioning | US-19 stable | Basic diff meets P0 |
| DOI verification | Literature and Evidence | US-07 stable | Provider/API support and capacity available |
| Golden prompt regression | Platform Quality | AI prompts stable | Core contract/evaluation fixtures stable |
| Cost dashboard | Platform Quality | US-21 stable | Reliable measured usage exists |

## 6. P2/stretch backlog — excluded from MVP

Graph visualization, GROBID, MinIO/S3, five Judges, multi-model ensemble, semantic clustering, citation graph, collaborative editing, PDF/DOCX export, Active Candidate Selection, advanced observability và fine-tuned NLI verifier. Các mục này không có P0 estimate, không nằm trong Definition of Done và phải bị loại ngay nếu tiến độ trễ.
