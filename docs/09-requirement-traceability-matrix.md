# SpecLoop — Requirement Traceability Matrix

**Trạng thái mặc định:** `PLANNED`  
**Quy tắc:** mỗi FR P0 có ít nhất một User Story, module và Test Case; status chỉ đổi khi có implementation/test evidence thực tế.

## 1. Assignment Requirement index

| Assignment Requirement | Mandatory capability from assignment |
| --- | --- |
| AR-01 | Nhập research idea |
| AR-02 | Diễn giải lại idea |
| AR-03 | Phân rã problem/gap/claim/contribution/evidence |
| AR-04 | Tìm kiếm và quản lý nguồn |
| AR-05 | Related-work matrix |
| AR-06 | Phát hiện ambiguity/conflict |
| AR-07 | Explained options, examples và `Other` |
| AR-08 | Lưu user decision |
| AR-09 | Experiment plan |
| AR-10 | Resource feasibility |
| AR-11 | Research specification |
| AR-12 | Nhiều Judge độc lập |
| AR-13 | Consensus/disagreement |
| AR-14 | User revision |
| AR-15 | Version/diff |
| AR-16 | Final specification export |

## 2. Traceability matrix

| Assignment Requirement | FR/NFR | Priority | Epic | User Story | Module | API/Job | Test Case | Deliverable | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AR-01 | FR-01; NFR-03 | P0 | EP-01 | US-01 | `projects` | Project CRUD API | TC-01 | Project Dashboard + persisted project | `PLANNED` |
| AR-02 | FR-02; NFR-04 | P0 | EP-02 | US-02 | `idea_understanding`, `operations` | Interpretation job | TC-02 | Understanding Screen interpretation | `PLANNED` |
| AR-02, AR-07 | FR-03 | P0 | EP-02 | US-03 | `idea_understanding` | Decision API / regenerate job | TC-03 | Confirmation/decision workflow | `PLANNED` |
| AR-03 | FR-04 | P0 | EP-03 | US-04 | `spec_structure` | Node APIs / decomposition job | TC-04 | Editable typed-node workspace | `PLANNED` |
| AR-03 | FR-05 | P0 | EP-03 | US-05 | `spec_structure` | Edge/status APIs | TC-05 | Relations and status history | `PLANNED` |
| AR-04 | FR-06; NFR-04 | P0 | EP-04 | US-07 | `literature`, `operations` | Literature search job / manual import API | TC-07 | Literature corpus with fallback | `PLANNED` |
| AR-05 | FR-07; NFR-01 | P0 | EP-04 | US-08 | `literature`, `evidence` | Related-work generation job | TC-08 | Provenance-aware related-work matrix | `PLANNED` |
| AR-04 | FR-08; NFR-05; NFR-09 | P0 | EP-05 | US-09 | `evidence`, `operations` | Source-file upload / PDF parse job | TC-09 | PDF/manual evidence intake | `PLANNED` |
| AR-03, AR-05 | FR-09; NFR-01 | P0 | EP-05 | US-10 | `evidence`, `spec_structure` | Evidence-span/link APIs | TC-10 | Evidence span and claim link | `PLANNED` |
| AR-06 | FR-10; NFR-02 | P0 | EP-03 | US-06 | `spec_structure` | Integrity/status check | TC-06 | Missing/ambiguity/conflict/unsupported warnings | `PLANNED` |
| AR-03, AR-07 | FR-11; NFR-02 | P0 | EP-06 | US-12 | `research_design`, `evidence` | Research-design job | TC-12 | Gap candidates with evidence/warning | `PLANNED` |
| AR-03 | FR-12 | P0 | EP-06 | US-13 | `research_design`, `spec_structure` | Claim-design job / node APIs | TC-13 | Contributions and atomic claims | `PLANNED` |
| AR-03, AR-05 | FR-13; NFR-01 | P0 | EP-05 | US-11 | `evidence`, `operations` | Integrity-check job | TC-11 | Claim–Evidence Integrity Loop | `PLANNED` |
| AR-09, AR-10 | FR-14; NFR-06 | P0 | EP-06 | US-14 | `research_design` | Experiment-plan API/job | TC-14 | Experiment plan and feasibility estimate | `PLANNED` |
| AR-11 | FR-15; NFR-01 | P0 | EP-07 | US-15 | `spec_generation`, `operations` | Specification-generation job | TC-15 | 14-section specification preview | `PLANNED` |
| AR-12 | FR-16; NFR-02; NFR-04; NFR-06 | P0 | EP-08 | US-16 | `judging`, `operations` | Three Judge jobs | TC-16 | Evidence/Research/Experiment Judge findings | `PLANNED` |
| AR-13 | FR-17; NFR-02 | P0 | EP-08 | US-17 | `judging` | Finding aggregation service/API | TC-17 | Consensus/single-flag/disagreement view | `PLANNED` |
| AR-07, AR-08, AR-14 | FR-18 | P0 | EP-09 | US-18 | `revision`, `judging` | Revision API/job | TC-18 | User decision and revised content | `PLANNED` |
| AR-15 | FR-19 | P0 | EP-09 | US-19 | `versions` | Version list / diff API | TC-19 | Immutable versions and basic diff | `PLANNED` |
| AR-16 | FR-20; NFR-01 | P0 | EP-09 | US-20 | `exports`, `versions` | Finalize / Markdown export | TC-20 | Finalized Markdown specification | `PLANNED` |
| AR-02, AR-12 (cross-cutting support) | FR-21; NFR-03; NFR-04; NFR-06; NFR-07; NFR-08; NFR-09; NFR-10 | P0 | EP-10, EP-11, EP-12 | US-21, US-22, US-23 | `operations` + all modules | Job status / model-call logs / setup and test workflows | TC-21, TC-22, TC-23 | Operational traceability, safeguards, tests and reproducible delivery | `PLANNED` |

## 3. Coverage checks

### Assignment coverage

- AR-01…AR-16 đều xuất hiện ít nhất một lần trong matrix.
- Assignment examples/“khuyến khích sáng tạo” không được tạo thành P0 rows.
- “Nhiều Judge” được proposal scope thành đúng ba Judge P0; five-Judge configuration vẫn P2.

### FR coverage

- FR-01…FR-21 mỗi ID có một row, User Story, module/API or job, và planned Test Case.
- FR-01…FR-21 đều P0 theo approved proposal.

### NFR coverage

- NFR-01: provenance/final claims across related work, evidence, integrity, spec và export.
- NFR-02: warnings/findings across rule, gap và Judge workflows.
- NFR-03/NFR-04: job lifecycle, responsiveness decision, timeout/retry/error.
- NFR-05/NFR-09: PDF safety và untrusted-document handling.
- NFR-06: resource/token/Judge/paper budget controls.
- NFR-07: reproducible local/Docker setup.
- NFR-08: core rule/schema/workflow tests.
- NFR-10: no private chain-of-thought in prompt/schema/logs.

## 4. Status transition policy

Allowed reporting states for this planning set:

- `PLANNED`: requirement/story/test/deliverable is defined but no implementation evidence is claimed.
- Future states may be introduced by the team only with definitions and evidence.

This matrix currently uses only `PLANNED`. File presence, generated documentation or a written Test Case is not evidence of implementation or test success.
