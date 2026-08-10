# SpecLoop — Project Proposal

**Trạng thái:** `PLANNED`  
**Repository:** `spec-research-loop`  
**Nhóm:** 3 thành viên  
**Khung thời gian:** khoảng 4 tuần, dùng để kiểm soát scope  
**Nguồn:** `docs/source/01-assignment.md` và `docs/source/02-approved-proposal.md`

## 1. Executive summary

SpecLoop là website hỗ trợ người dùng chuyển một research idea còn mơ hồ thành research specification có cấu trúc, có provenance, có kế hoạch kiểm chứng, được phản biện độc lập và được người dùng xác nhận. Thay vì sinh proposal hoàn chỉnh trong một lần gọi LLM, hệ thống dẫn người dùng qua workflow có trạng thái: diễn giải ý tưởng, phân rã logic nghiên cứu, thu thập literature/evidence, hình thành gap–contribution–claim, thiết kế experiment, sinh specification, chạy ba Judge độc lập, sửa đổi, lưu version và xuất Markdown.

Mục tiêu bốn tuần là chứng minh một vertical slice end-to-end ổn định cho team ba người. Đây không phải kế hoạch xây nền tảng production hoàn chỉnh và không phải cam kết về kết quả nghiên cứu.

## 2. Problem statement

Research idea ban đầu thường có problem statement chưa rõ, gap suy luận chủ quan, contribution bị phóng đại, claim thiếu evidence, experiment không đủ sức kiểm chứng hoặc vượt tài nguyên. LLM có thể tạo văn bản nhanh nhưng dễ trộn fact, hypothesis và user decision; sinh citation không hỗ trợ claim; hoặc tự đánh giá output của chính nó mà thiếu review độc lập.

Người dùng cần một quy trình giúp họ làm rõ ý tưởng trước khi triển khai nghiên cứu, truy vết factual claim đến evidence hoặc experiment, nhìn thấy nội dung còn thiếu/xung đột, và chủ động quyết định sửa đổi.

## 3. Product vision

SpecLoop trở thành stateful research-specification co-pilot giúp sinh viên và nhóm nghiên cứu kiểm tra logic, bằng chứng và khả năng kiểm chứng của ý tưởng trước khi thực hiện nghiên cứu thực tế.

Sản phẩm không bảo đảm novelty toàn cầu, không bảo đảm paper được chấp nhận, không thay thế chuyên gia/reviewer và không tuyên bố loại bỏ hallucination hoàn toàn.

## 4. Objectives

1. Diễn giải research idea bằng simple và technical interpretation để người dùng xác nhận.
2. Biểu diễn problem, question, gap, contribution, claim, evidence, experiment và risk bằng typed nodes/relations.
3. Tìm kiếm và quản lý nguồn học thuật với provenance rõ ràng.
4. Triển khai Claim–Evidence Integrity Loop ở mức deterministic và atomic review cho phạm vi demo.
5. Sinh experiment plan và feasibility estimate với giả định minh bạch.
6. Sinh research specification 14 phần từ dữ liệu đã xác nhận.
7. Chạy Evidence Judge, Research Judge và Experiment Judge độc lập.
8. Hỗ trợ user decision, revision, version, diff và Markdown export.
9. Đánh giá hệ thống bằng hai baseline B0/B1 và protocol có human verification.

## 5. Target users

- Sinh viên làm đồ án, khóa luận hoặc nghiên cứu khoa học.
- Nhóm nghiên cứu cần chuẩn hóa ý tưởng trước khi trao đổi với giảng viên.
- Người dùng cần kiểm tra quan hệ gap–claim–evidence–experiment trong các domain ưu tiên AI/ML/NLP, Software Engineering và Data Science.

Paper và nguồn học thuật ưu tiên tiếng Anh; MVP không tuyên bố hỗ trợ đồng đều mọi domain.

## 6. Proposed solution

SpecLoop dùng structured workflow thay cho single-shot generation. Mỗi bước có input/output schema, trạng thái, human confirmation point và provenance. Factual claim trong bản cuối phải có evidence span, experiment dự kiến kiểm chứng, nhãn hypothesis/research question hoặc trạng thái `UNSUPPORTED/NEEDS_REVIEW`.

Giải pháp gồm:

- Web workspace cho project, interpretation, spec nodes, literature, evidence, research design, Judges, revision và export.
- Node.js + tRPC + Fastify modular monolith quản lý domain logic, persistence, API và job abstraction (per ADR-001).
- Shared Zod schemas trong `packages/schemas` làm single source of truth cho runtime validation và TypeScript types; `apps/web` import trực tiếp `AppRouter` từ `apps/api` để có end-to-end type safety.
- PostgreSQL lưu project, nodes/relations, sources/evidence, experiments, Judge findings, decisions và versions.
- Background worker thuộc cùng application/domain cho long-running jobs; P0 có thể chạy in-process nếu đủ cho demo.
- Một configurable LLM provider với structured JSON validation, timeout/retry giới hạn và model-call logging.

## 7. Core workflow

```text
Research idea
→ Interpretation + user confirmation
→ Typed decomposition
→ Literature discovery/import
→ PDF/manual evidence + provenance
→ Gap, contribution, atomic claims
→ Claim–evidence / claim–experiment integrity
→ Experiment plan + feasibility estimate
→ Research specification 14 phần
→ 3 independent Judges
→ Consensus/disagreement + user decision
→ Revision + version/diff
→ Finalize + Markdown export
```

## 8. Main contributions

### 8.1 Claim–Evidence Integrity Loop — contribution chính

- Deterministic integrity: source/link/page/offset/exact-text và orphan-claim checks.
- Atomic claim–evidence review với verdict `SUPPORTS`, `PARTIALLY_SUPPORTS`, `CONTRADICTS`, `INSUFFICIENT`, `IRRELEVANT`.
- So sánh với baseline không có exact evidence verification.

### 8.2 Evidence-Grounded Spec Structure

Typed nodes và relations cho phép trace gap–contribution, claim–evidence, claim–experiment, targeted review, version và basic diff. Graph visualization không phải P0.

### 8.3 Independent Multi-Judge Revision

Ba Judge P0 chạy độc lập trước aggregation. Hệ thống tổng hợp finding nhưng người dùng quyết định sửa đổi; verifier không thay thế user authority.

## 9. Product MVP — P0

- Project CRUD, idea input, interpretation và Confirm/Edit/Regenerate/`Other`.
- Typed nodes, relations, statuses và basic ambiguity/conflict/unsupported rules.
- Một academic API, manual source import, metadata normalization/deduplication.
- PDF validation/parsing theo page hoặc abstract/manual evidence fallback.
- Evidence span, provenance, related-work matrix và claim–evidence integrity.
- Gap candidate có evidence và novelty-risk warning; contribution và atomic claim.
- Claim–evidence matrix, claim–experiment matrix, experiment plan và transparent estimate.
- Research specification 14 phần.
- Ba Judge: Evidence, Research, Experiment; deterministic aggregation.
- User decision/revision, basic version/diff, finalize và Markdown export.
- Structured-output validation, timeout/retry giới hạn, budget control, logging cơ bản.
- Unit, contract, integration, evidence-integrity và end-to-end tests cho luồng chính.
- B0/B1 evaluation, reproducible local/Docker setup, report và demo artifacts.

## 10. P1 capabilities

- Academic API thứ hai.
- Redis + BullMQ và progress tracking đầy đủ nếu in-process jobs không đáp ứng.
- Exact-text hash.
- Claim-Scope Calibrator riêng.
- Better semantic diff.
- Crossref DOI verification.
- Golden prompt regression và cost dashboard cơ bản.

P1 chỉ bắt đầu khi P0 ổn định và không thuộc Definition of Done của MVP.

## 11. P2/stretch capabilities

- Graph visualization/React Flow, citation graph.
- GROBID, MinIO/S3.
- Five-Judge configuration, multi-model ensemble, semantic clustering.
- Collaborative editing.
- PDF/DOCX export.
- Active Candidate Selection, advanced observability, fine-tuned NLI verifier.

P2 không nằm trong Product MVP và không được triển khai trước feature freeze P0.

## 12. Non-goals

- Bảo đảm research gap mới trên toàn bộ tri thức khoa học hoặc paper được chấp nhận.
- Vượt paywall để tải full text.
- Tự động thực thi mọi experiment.
- Production-scale collaboration, authentication hoặc phân quyền phức tạp.
- Loại bỏ hallucination hoàn toàn.
- Lưu hoặc hiển thị private chain-of-thought.
- Microservices, Kafka, Kubernetes, event sourcing hoặc service mesh.

## 13. High-level architecture

```text
Monorepo
├── apps/web       Next.js + TypeScript
├── apps/api       Node.js + tRPC + Fastify modular monolith
├── apps/worker    same-domain Node.js background job executor
├── packages       Zod schemas and prompts
├── PostgreSQL     shared application database
├── local storage  MVP source/PDF files
└── Docker Compose reproducible delivery
```

Worker không phải business microservice độc lập. Redis/BullMQ là P1 và chỉ được kích hoạt khi long-running jobs thực sự cần queue ngoài process.

## 14. Team structure

| Role                                          | Primary responsibility                                                                         | Supporting responsibility            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------ |
| Member 1 — Product Workflow and Frontend Lead | User journey, web UI, interpretation/spec/revision/version screens, E2E UX                     | API contract review và evaluation UI |
| Member 2 — Backend, Data and Platform Lead    | Node.js, tRPC/Fastify, database/migrations, job status/worker, Docker, integration reliability | E2E and security testing             |
| Member 3 — AI, Evidence and Evaluation Lead   | Prompt/schema, literature/evidence pipeline, generator, Judges, baselines và evaluation        | Contract tests và provenance review  |

Mỗi Epic có primary owner role và supporting role; integration theo vertical slice, không tạo ba silo độc lập.

## 15. Roadmap tổng quan bốn tuần

| Tuần | Goal                                                                    | Exit signal                                                                                   |
| ---- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1    | Foundation, project/idea, confirmed interpretation, basic decomposition | Project và nodes được lưu; interpretation gate hoạt động ở mức planned acceptance             |
| 2    | Literature, evidence, gap, claim và experiment                          | Một API/manual import, evidence link, integrity checks và research design slice được tích hợp |
| 3    | Spec generation, ba Judge và revision                                   | P0 end-to-end idea → revision chạy trước cuối tuần; feature freeze P0                         |
| 4    | Integration, test, B0/B1 evaluation, deploy, report và demo             | Có evidence thực tế cho test/evaluation/deployment; không thêm P2                             |

## 16. Deliverables

1. Website và source code sau giai đoạn implementation.
2. README và reproducible local/Docker setup.
3. Architecture, AI design, requirements, backlog, delivery, risk và test documents.
4. Dataset/use-case set và prompt catalog của generator/ba Judges.
5. Claim–Evidence Integrity mechanism.
6. Hai baseline B0 và B1 cùng evaluation report sau khi chạy.
7. Video demo và một research specification mẫu hoàn chỉnh.
8. Markdown export.

Tất cả deliverable liên quan code, test, evaluation hoặc demo hiện có trạng thái `PLANNED`.

## 17. Main risks

| Risk                        | Impact     | Primary mitigation                                         |
| --------------------------- | ---------- | ---------------------------------------------------------- |
| Scope quá lớn               | Rất cao    | Khóa P0/P1/P2, feature freeze cuối tuần 3                  |
| Academic API lỗi/rate limit | Cao        | Một API chính, cache khi phù hợp, manual import            |
| PDF parse sai               | Cao        | Page parser, validation, manual evidence fallback          |
| LLM JSON lỗi                | Trung bình | Zod validation, một repair retry theo policy, error status |
| Evidence verifier sai       | Cao        | Deterministic checks, atomic rubric, human review          |
| Judge cùng bias             | Trung bình | Independent prompts/context và gold issue set              |
| API cost vượt               | Cao        | Budget, max rerun, caching, hard stop                      |
| Queue integration chậm      | Trung bình | In-process P0, Redis/BullMQ P1                             |
| Không đủ dữ liệu/label      | Trung bình | Dataset nhỏ, controlled errors, limitations report         |
| Integration dồn cuối        | Rất cao    | Vertical slice và E2E trước cuối tuần 3                    |

## 18. Definition of Done — Product MVP

MVP được xem là hoàn thành chỉ khi có evidence thực tế rằng:

1. User tạo project, nhập idea, xác nhận/chỉnh sửa interpretation.
2. Typed nodes và relations được lưu/chỉnh sửa.
3. Một academic API và manual import fallback hoạt động.
4. Related-work matrix và PDF/manual evidence có provenance.
5. Claim–evidence và claim–experiment matrices cùng integrity checks hoạt động.
6. Gap có supporting evidence/novelty-risk note; experiment plan và estimate có giả định.
7. Specification 14 phần được sinh từ dữ liệu được phép.
8. Ba Judge chạy độc lập và tạo consensus/single flag/conflict theo policy.
9. User xử lý finding, tạo version mới, xem basic diff và xuất Markdown.
10. B0/B1 được chạy và so sánh với SpecLoop; kết quả được báo cáo trung thực.
11. Core workflow, structured output và evidence integrity có tests đã chạy.
12. Setup tái lập, report, video và specification mẫu hoàn chỉnh tồn tại.

P1 và P2 không thuộc Definition of Done. Hiện tại tất cả tiêu chí trên đều là `PLANNED`, chưa phải trạng thái implementation.
