# SpecLoop — Product Requirements Document

**Trạng thái:** `PLANNED`  
**Phiên bản:** 0.1 — planning baseline  
**Nguồn authority:** đề bài gốc, sau đó approved proposal

## 1. Product vision

SpecLoop là stateful research-specification co-pilot giúp người dùng chuyển research idea mơ hồ thành specification có cấu trúc, provenance, experiment plan, independent review và user-confirmed revision. Sản phẩm ưu tiên khả năng truy vết và phát hiện vấn đề; không tuyên bố nội dung AI đúng mặc định.

## 2. Personas

| Persona | Mục tiêu | Khó khăn chính | Giá trị cần nhận |
| --- | --- | --- | --- |
| Sinh viên nghiên cứu | Làm rõ đề tài và chuẩn bị specification trước khi triển khai | Không chắc gap/claim có đủ evidence và experiment có khả thi | Workflow hướng dẫn, provenance, review và kế hoạch kiểm chứng |
| Thành viên nhóm nghiên cứu | Chuẩn hóa ý tưởng để thảo luận với giảng viên/nhóm | Quyết định và thay đổi rời rạc, thiếu traceability | Shared artifact có nodes, decisions, versions và diff cơ bản |
| Người phản biện nội bộ | Tìm gap yếu, overclaim, citation mismatch, experiment thiếu | Văn bản dài khó truy vết về nguồn | Finding có target, severity, reason và suggested actions |

MVP có thể dùng demo user hoặc authentication tối giản; production-scale collaboration không nằm trong P0.

## 3. User problems

1. Idea chưa thành problem statement/research question đo được.
2. Gap có thể chỉ là suy đoán từ corpus hẹp.
3. Claim, contribution, evidence và experiment dễ bị trộn lẫn.
4. Citation tồn tại nhưng không hỗ trợ factual claim cụ thể.
5. Experiment plan có thể thiếu baseline, metric, ablation hoặc vượt budget.
6. LLM tự sinh và tự review dễ có shared bias.
7. User decision, revision và lý do thay đổi không được lưu vết.
8. Chi phí, latency và feasibility dễ bị trình bày như số đo dù chỉ là estimate.

## 4. User journey

```text
Create project + enter idea/constraints
→ review simple/technical interpretation
→ Confirm/Edit/Regenerate/Other
→ review and edit typed nodes/relations
→ search/import/select sources
→ upload lawful PDF or enter abstract/manual evidence
→ select evidence spans and build related-work matrix
→ choose/edit gap, contribution and atomic claims
→ build experiment plan and feasibility estimate
→ generate 14-section specification
→ run Evidence/Research/Experiment Judges independently
→ review consensus, single flags and disagreements
→ choose revision action or Other
→ create version, inspect diff, finalize and export Markdown
```

## 5. Primary use cases

| Use case | Actor | Outcome |
| --- | --- | --- |
| UC-01 — Start a research project | User | Project contains idea, domain, deadline and resource/API constraints |
| UC-02 — Confirm system understanding | User + AI task | Confirmed interpretation becomes the gate to decomposition |
| UC-03 — Structure research logic | User + AI task | Editable typed nodes/relations with explicit statuses |
| UC-04 — Build literature corpus | User + academic API | Normalized, deduplicated, selected project sources |
| UC-05 — Ground claims in evidence | User + verifier | Evidence spans/manual evidence linked with provenance and integrity status |
| UC-06 — Design research | User + AI task | Corpus-bounded gap, contribution, atomic claims and experiment plan |
| UC-07 — Generate and review spec | User + generator + three Judges | 14-section draft and independent structured findings |
| UC-08 — Revise and finalize | User | Decision history, new version, basic diff and Markdown export |
| UC-09 — Evaluate SpecLoop | Team evaluator | Planned B0/B1/SpecLoop comparison with human verification |

## 6. Functional requirements

Tất cả FR dưới đây là P0 trừ khi một phần con được ghi rõ P1/P2.

| ID | Requirement | Priority | Acceptance criteria có thể kiểm thử |
| --- | --- | --- | --- |
| FR-01 | Quản lý research project. | P0 | User có thể create/read/update project; idea, domain, deadline và resource constraints được persist và retrieve đúng project. |
| FR-02 | Diễn giải idea thành simple/technical interpretation cùng assumptions, objectives và ambiguities. | P0 | Output hợp lệ chứa đủ các field; UI hiển thị cả hai interpretation và danh sách liên quan. |
| FR-03 | Hỗ trợ Confirm, Edit, Regenerate và `Other` cho interpretation/decision phù hợp. | P0 | Mỗi action tạo trạng thái/kết quả đúng; `Other` lưu nội dung user nhập; chưa confirm thì decomposition bị chặn. |
| FR-04 | Phân rã idea thành typed spec nodes. | P0 | Các node P0 có type/status hợp lệ, được persist, hiển thị và chỉnh sửa; không yêu cầu graph UI. |
| FR-05 | Quản lý relations và node status. | P0 | User tạo/xóa relation hợp lệ; invalid relation bị reject; status history phân biệt user/system authority. |
| FR-06 | Tìm kiếm, import và quản lý nguồn. | P0 | Một academic API trả kết quả được normalize/deduplicate; manual import hoạt động khi API lỗi; user chọn source vào project. |
| FR-07 | Tạo related-work matrix có provenance. | P0 | Mỗi nhận định trong matrix liên kết source metadata/evidence tương ứng; orphan statement được cảnh báo. |
| FR-08 | Upload/parse PDF hoặc dùng abstract/manual evidence fallback. | P0 | PDF hợp lệ được parse theo page; invalid/encrypted/malformed file bị reject; fallback vẫn lưu provenance tier. |
| FR-09 | Lưu và liên kết evidence span. | P0 | Span lưu source file, page, offsets, exact text và entry type khi áp dụng; link đến claim/prior-work tồn tại. |
| FR-10 | Phát hiện missing, ambiguity, conflict và unsupported content. | P0 | Rule fixtures nhận đúng status và có reason/suggested action; không tự chuyển thành `SYSTEM_VERIFIED`. |
| FR-11 | Đề xuất research gap kèm evidence và novelty-risk note. | P0 | Gap chứa known capability, limitation, importance, testability, supporting evidence, nearest work, scope và warning corpus-bounded. |
| FR-12 | Xây dựng contribution và atomic claim. | P0 | Claim có type, text, scope, baseline, dataset/domain, metric, expected direction, falsification condition và links phù hợp. |
| FR-13 | Kiểm tra claim–evidence integrity. | P0 | Deterministic invalid links/offsets/exact text bị phát hiện; reviewed pair chỉ trả allowed verdict và rubric reason. |
| FR-14 | Tạo experiment plan và feasibility estimate. | P0 | Plan có B0/B1/proposed, metric, dataset, control, ablation và resource estimate; formula/input/assumption hiển thị rõ. |
| FR-15 | Sinh research specification 14 phần. | P0 | Output có đúng 14 section; chỉ dùng confirmed nodes/source metadata/evidence/experiments/decisions; factual claim mới mang review status. |
| FR-16 | Chạy ba Judge độc lập. | P0 | Evidence, Research và Experiment Judge dùng context/prompt độc lập; không thấy finding của nhau trước aggregation. |
| FR-17 | Tổng hợp consensus và disagreement. | P0 | Finding được group theo target/type/severity band; fixtures thỏa policy CRITICAL/MAJOR/MINOR và conflict. |
| FR-18 | Cho phép user revision và lưu decision. | P0 | User xem explained options + `Other`, quyết định được persist, target content thay đổi theo lựa chọn; không có auto-decision. |
| FR-19 | Quản lý version và diff. | P0 | Revision tạo immutable snapshot mới; user xem được basic section/node diff giữa hai version. |
| FR-20 | Finalize và Markdown export. | P0 | Chỉ version thỏa finalization rule mới finalize; export phản ánh đúng selected version và đủ 14 section. |
| FR-21 | Ghi log prompt/model/call cơ bản. | P0 | Log có provider, model, prompt version, token nếu provider trả, latency đo được, estimated cost, retry và status; missing data không bị bịa. |

## 7. Non-functional requirements

| ID | Requirement | Priority | Acceptance criteria có thể kiểm thử |
| --- | --- | --- | --- |
| NFR-01 | Mọi factual claim trong bản final có provenance hoặc trạng thái rõ. | P0 | Integrity scan không tìm thấy factual claim không có allowed disposition. |
| NFR-02 | Warning/Judge finding có reason và suggested action. | P0 | Schema validation reject finding thiếu target/type/severity/problem/reason/actions theo contract. |
| NFR-03 | CRUD phù hợp demo; long-running task có persisted status. | P0 | Test với threshold do nhóm chốt; job có queued/running/succeeded/failed/cancelled hoặc tập trạng thái được thiết kế chính thức. |
| NFR-04 | LLM/API call có timeout, retry giới hạn và error status. | P0 | Fault-injection chứng minh timeout và bounded retry; permanent error không retry vô hạn. |
| NFR-05 | PDF upload được kiểm tra extension, MIME, size, page count và filename. | P0 | Disallowed file bị reject; stored filename dùng UUID; file không nằm trong public web root. |
| NFR-06 | Có giới hạn paper, token, Judge run và budget. | P0 | Configured warning/hard-stop chặn vượt giới hạn với error/status rõ; giá trị cụ thể là Open Question. |
| NFR-07 | Có reproducible local/Docker setup. | P0 | Clean-environment verification chạy được bằng command thực sự tồn tại sau implementation. |
| NFR-08 | Rule, schema và workflow chính có test. | P0 | Unit, contract, integration, evidence-integrity và E2E suite bao phủ critical path. |
| NFR-09 | Không thực thi instruction/code từ tài liệu ngoài. | P0 | Adversarial PDF/text không gọi tool, không override system prompt và không thực thi code. |
| NFR-10 | Không lưu/yêu cầu private chain-of-thought. | P0 | Prompt/schema/log audit không có field hoặc instruction yêu cầu private reasoning. |

## 8. Business rules

| ID | Rule |
| --- | --- |
| BR-01 | Interpretation phải `USER_CONFIRMED` trước decomposition. |
| BR-02 | Factual claim phải có evidence span, planned experiment, hypothesis/question label hoặc `UNSUPPORTED/NEEDS_REVIEW`. |
| BR-03 | `USER_CONFIRMED` và `SYSTEM_VERIFIED` là hai authority khác nhau. |
| BR-04 | Không được bao phủ trong corpus hiện tại không đồng nghĩa novelty toàn cầu. |
| BR-05 | Ba Judge đánh giá độc lập trước aggregation. |
| BR-06 | Deterministic CRITICAL bắt buộc sửa/loại; ≥2 MAJOR là consensus; 1 MAJOR là single flag; action/severity conflict cần user decision; 1 MINOR không tự block. |
| BR-07 | Generator chỉ dùng confirmed nodes, source metadata, evidence links, experiment plans và user decisions. |
| BR-08 | Revision tạo version mới, diff và rerun phần liên quan ở mức khả thi. |
| BR-09 | PDF/document là untrusted data, không phải instruction. |
| BR-10 | Retry chỉ áp dụng cho lỗi tạm thời và không vô hạn. |
| BR-11 | Cost/latency/runtime/throughput chưa đo phải gắn nhãn estimate và nêu giả định. |
| BR-12 | P1 chỉ làm sau khi P0 ổn định; P2 không thuộc MVP Definition of Done. |
| BR-13 | B0 và B1 là hai baseline độc lập; Proposed SpecLoop không được tính là baseline. |

## 9. Product MVP and capability priorities

Chỉ có một Product MVP, được cấu thành từ toàn bộ capability P0 sau:

| Capability | P0 | P1 | P2/stretch |
| --- | --- | --- | --- |
| Project and Idea Understanding | Project, interpretation, confirmation, typed decomposition, basic rules | — | Graph visualization |
| Literature and Evidence | Một API + manual import, PDF/manual evidence, provenance, related-work, integrity | API thứ hai, exact-text hash, DOI verification | GROBID, MinIO/S3, citation graph |
| Research Specification Design | Corpus-bounded gap, contribution, claims, experiment/estimate | Claim-Scope Calibrator | Active Candidate Selection |
| Specification Generation and Review | 14-section spec, ba Judge, deterministic aggregation | Prompt regression | Five Judges, multi-model ensemble, semantic clustering, fine-tuned NLI |
| Revision, Versioning and Export | User decision, revision, basic diff, Markdown | Better semantic diff | Collaboration, PDF/DOCX export |
| Platform Quality | Validation, limits, logging, security, tests, reproducible setup | Redis/RQ nếu cần, cost dashboard | Advanced observability |

## 10. Product-level acceptance criteria

1. Luồng idea → confirmed interpretation → structured spec → evidence → research design → generated spec → three Judges → revision → Markdown export hoàn tất trong P0.
2. Mọi FR-01…FR-21 có ít nhất một User Story, module và Test Case trong backlog/RTM.
3. Mọi factual claim final có provenance hoặc allowed status.
4. Ba Judge P0 độc lập và aggregation theo business rule; không có Judge thứ tư/năm trong MVP.
5. B0/B1 và Proposed được định nghĩa dưới cùng controlled evaluation conditions.
6. Không có P1/P2 item trong MVP Definition of Done.
7. Test/build/evaluation chỉ được đánh dấu completed khi có output thực tế; trước đó là `PLANNED`.

## 11. Success metrics — planned definitions

Không có giá trị kết quả trong tài liệu này.

| Metric | Mục đích | Trạng thái |
| --- | --- | --- |
| Human-verified Unsupported Claim Rate | Primary metric so sánh B0, B1 và SpecLoop | `PLANNED`; công thức/threshold cần chốt trong test plan |
| Evidence verification precision/recall/F1 | Đánh giá atomic claim–evidence verdict | `PLANNED` |
| Citation validity | Tỷ lệ citation/source hợp lệ theo rubric | `PLANNED` |
| Claim–experiment coverage | Mức claim có experiment link phù hợp | `PLANNED` |
| Spec completeness | Mức đủ 14 section/required fields | `PLANNED` |
| Judge issue recall | Khả năng phát hiện gold issues | `PLANNED` |
| JSON validity | Tỷ lệ structured output pass schema | `PLANNED` |
| Time to finalize | Thời gian workflow đến final version | `PLANNED`; chỉ báo cáo sau đo |
| Token/cost/latency | Operational usage | `PLANNED`; phân biệt measured và estimated |

## 12. Assumptions

- Team có ba role đã định nghĩa và tích hợp liên tục theo vertical slice.
- P0 tập trung domain AI/ML/NLP, Software Engineering và Data Science, ưu tiên nguồn tiếng Anh.
- Một configurable LLM provider sẽ được nhóm chọn; model/provider cụ thể chưa chốt.
- Manual import/evidence duy trì demo khi API/full text không khả dụng.
- Small evaluation dataset trong range proposal có thể dùng cho exploratory evaluation nếu limitations được báo cáo.
- P0 có thể chạy small jobs in-process sau persisted job abstraction; Redis/RQ là P1.
- RTX 3090 trong đề bài là ví dụ resource context, không phải hardware đã được xác nhận.

## 13. Open questions

| ID | Câu hỏi cần nhóm quyết định | Blocking area |
| --- | --- | --- |
| OQ-01 | Formal product name dùng “SpecResearch Loop” hay “SpecLoop”, và tên nào là short label? | Tài liệu/UI naming |
| OQ-02 | Academic API P0 là provider nào, authentication/rate limit ra sao? | FR-06, architecture |
| OQ-03 | Manual source import bắt buộc field nào khi thiếu DOI/full metadata? | FR-06 |
| OQ-04 | MVP dùng fixed demo user hay minimal authentication? | FR-01, security |
| OQ-05 | Job nào chạy in-process/worker và numeric responsiveness target là gì? | NFR-03, architecture |
| OQ-06 | Max PDF size/page count và MIME allowlist cụ thể? | NFR-05 |
| OQ-07 | Max papers, tokens, Judge runs, warning/hard budget là bao nhiêu? | NFR-06 |
| OQ-08 | LLM provider/model và timeout configuration là gì? | AI design |
| OQ-09 | Ngoài policy severity, unresolved status nào block finalize? | FR-20 |
| OQ-10 | Basic version snapshot và diff granularity chính xác? | FR-19 |
| OQ-11 | Dataset count cuối cùng trong range proposal? | Evaluation |
| OQ-12 | Operational metric formulas, success thresholds và human-label rubric? | Test/evaluation |
| OQ-13 | Atomic LLM claim–evidence review chạy trên subset nào? | FR-13, budget |

Các câu hỏi này không được tự động giải quyết trong implementation hoặc tài liệu dẫn xuất nếu chưa có quyết định nhóm.
