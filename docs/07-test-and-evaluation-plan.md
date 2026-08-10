# SpecLoop — Test and Evaluation Plan

**Trạng thái:** `PLANNED`  
**Nguyên tắc:** software verification và AI/system evaluation là hai lớp khác nhau; không có kết quả nào được điền trước khi chạy.

## Part A — Software testing

## 1. Test objectives

- Chứng minh core workflow, state transitions, schemas, provenance và finalization rules hoạt động theo PRD.
- Phát hiện integration failure giữa web/API/database/files/jobs/AI gateway sớm theo vertical slice.
- Xác minh untrusted PDF/document không điều khiển tool/system behavior.
- Xác minh bounded timeout/retry/budget và explicit job errors.
- Tạo evidence để RTM chuyển trạng thái; test file tồn tại không đồng nghĩa test đã pass.

## 2. Test levels

### 2.1 Unit tests

- State transition và confirmation gate.
- Node/edge integrity, status authority và orphan claim rules.
- Metadata normalization/deduplication.
- Page/offset/exact-text validation.
- Claim–experiment coverage và estimator formulas.
- Finding grouping/severity policy.
- Version snapshot/basic diff và finalization gate.

### 2.2 Contract/schema tests

- Valid/malformed JSON, missing field, wrong type và invalid enum.
- Hallucinated/unknown IDs và cross-project references.
- Interpretation, nodes, evidence review, experiment, specification và finding schemas.
- Zod/tRPC input-output and prompt schema compatibility.

### 2.3 API tests

- Project, decision, node/edge, source, evidence, job, version và export endpoints.
- Validation errors and stable error envelope.
- Project access boundaries and idempotency/duplicate protection where designed.

### 2.4 Integration tests

- Academic API adapter → normalized sources → selected corpus.
- Upload → `pdfjs-dist`/`pdf-parse` pages → evidence span → claim link.
- AI gateway → schema validation → persistence/job status.
- Spec generation → three Judge jobs → aggregation → revision → version/export.
- Database transaction rollback for invalid cross-module updates.

### 2.5 End-to-end tests

- Happy path: idea → confirmed interpretation → nodes → evidence → research design → spec → three Judges → revision → Markdown.
- API unavailable/manual import fallback.
- PDF parse failure/manual evidence fallback.
- Budget/timeout/job failure visible to user.
- Unresolved blocker prevents finalize.

### 2.6 Basic security tests

- File extension/MIME/size/page/encryption/malformed cases.
- UUID storage name and no public-root exposure.
- Prompt injection in PDF/manual text.
- Hallucinated source/node IDs from model.
- Secret/redaction inspection and no private chain-of-thought fields.
- Token/Judge/paper budget warning/hard stop.

## 3. Planned Test Case catalog

| Test Case | User Story | Requirement coverage                  | Planned level            | Expected result                                                                                              | Status    |
| --------- | ---------- | ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ | --------- |
| TC-01     | US-01      | FR-01                                 | API/integration          | Create/read/update returns persisted project fields; invalid input fails.                                    | `PLANNED` |
| TC-02     | US-02      | FR-02, NFR-04                         | Contract/integration     | Interpretation output passes schema; malformed output reaches bounded repair/error path.                     | `PLANNED` |
| TC-03     | US-03      | FR-03                                 | Unit/E2E                 | All four decision actions persist; decomposition before confirmation is blocked.                             | `PLANNED` |
| TC-04     | US-04      | FR-04                                 | Contract/API             | Required node types/statuses create/edit correctly; AI cannot assign confirmed/verified authority.           | `PLANNED` |
| TC-05     | US-05      | FR-05                                 | Unit/API                 | Valid relation succeeds; invalid/cross-project relation fails; status history preserved.                     | `PLANNED` |
| TC-06     | US-06      | FR-10, NFR-02                         | Unit                     | Fixtures produce missing/ambiguous/conflict/unsupported state with reason/action.                            | `PLANNED` |
| TC-07     | US-07      | FR-06, NFR-04                         | Integration              | One academic adapter normalizes/deduplicates; provider failure uses manual import.                           | `PLANNED` |
| TC-08     | US-08      | FR-07, NFR-01                         | Integration              | Related-work statements retain allowed source/evidence refs; orphan is flagged.                              | `PLANNED` |
| TC-09     | US-09      | FR-08, NFR-05, NFR-09                 | Security/integration     | Valid PDF parses by page; unsafe/unreadable file fails; manual tier works.                                   | `PLANNED` |
| TC-10     | US-10      | FR-09, NFR-01                         | Unit/integration         | Valid span/link persists; wrong offset/text/deleted source is rejected.                                      | `PLANNED` |
| TC-11     | US-11      | FR-13, NFR-01                         | Unit/contract/evaluation | Deterministic faults detected; atomic output uses allowed verdict and concise reason.                        | `PLANNED` |
| TC-12     | US-12      | FR-11, NFR-02                         | Contract/E2E             | Gap has required fields, provenance and corpus-bounded novelty warning.                                      | `PLANNED` |
| TC-13     | US-13      | FR-12                                 | Contract/API             | Atomic claim contains scope/baseline/metric/falsification and valid links.                                   | `PLANNED` |
| TC-14     | US-14      | FR-14, NFR-06                         | Unit/contract            | Plan has B0/B1/proposed/control/ablation; calculations expose inputs and labels.                             | `PLANNED` |
| TC-15     | US-15      | FR-15, NFR-01                         | Contract/E2E             | All 14 sections exist; only allowed inputs used; new facts are review-labeled.                               | `PLANNED` |
| TC-16     | US-16      | FR-16, NFR-02                         | Integration              | Exactly three isolated Judge runs produce schema-valid findings; failure remains explicit.                   | `PLANNED` |
| TC-17     | US-17      | FR-17                                 | Unit/integration         | CRITICAL/MAJOR/MINOR/conflict fixtures aggregate according to BR-06.                                         | `PLANNED` |
| TC-18     | US-18      | FR-18                                 | E2E                      | Explained actions + Other persist user decision; no automatic research choice.                               | `PLANNED` |
| TC-19     | US-19      | FR-19                                 | Unit/E2E                 | Revision creates new immutable version and accurate basic diff.                                              | `PLANNED` |
| TC-20     | US-20      | FR-20, NFR-01                         | E2E                      | Known blockers stop finalization; eligible selected version exports valid Markdown.                          | `PLANNED` |
| TC-21     | US-21      | FR-21, NFR-03, NFR-04, NFR-06, NFR-10 | Unit/integration         | Job lifecycle, bounded retry and redacted call logs retain real/optional values without fabrication.         | `PLANNED` |
| TC-22     | US-22      | NFR-05, NFR-06, NFR-09, NFR-10        | Security/integration     | Upload, injection, secret, validation, retry and budget controls enforce approved boundaries.                | `PLANNED` |
| TC-23     | US-23      | NFR-07, NFR-08                        | Test/evaluation/setup    | Critical suites, B0/B1 protocol/run artifacts and reproducible local/Docker evidence satisfy approved gates. | `PLANNED` |

## 4. Test environment

Planned environment mirrors Docker Compose architecture:

- Next.js web, Node.js + tRPC + Fastify API, PostgreSQL, private mounted storage.
- Same-domain worker when enabled; in-process job implementation remains testable through the same contract.
- Redis/BullMQ is absent from P0 unless a recorded P1 activation decision exists.
- Mock/fake academic API and LLM provider for deterministic contract/failure tests.
- Explicit opt-in live provider tests using configured secrets/budget.
- Small lawful PDF fixtures including valid, encrypted, malformed and injection text cases.

Exact commands do not exist yet and must be documented only after implementation.

## 5. Software test entry criteria

- Relevant FR/NFR and User Story acceptance criteria are stable.
- Schema/API/domain contract for the slice is reviewed.
- Test data is lawful, sanitized and versioned where applicable.
- Provider-dependent tests declare mock versus live mode and budget.
- Migration/setup commands actually exist before use.

## 6. Software test exit criteria

- All P0 critical-path TC-01…TC-23 have observed status and evidence.
- No unresolved CRITICAL security, provenance, data-integrity or finalization defect.
- Contract tests cover malformed JSON/IDs and bounded error paths.
- E2E happy path and documented manual fallbacks run successfully.
- Remaining failures/limitations are recorded accurately; no result is inferred from an unrun test.

Numeric coverage percentage is not set by the sources and remains a team decision; passing a percentage cannot replace critical-path tests.

## Part B — AI and system evaluation

## 7. Research questions

- **RQ1:** SpecLoop có giảm human-verified Unsupported Claim Rate so với B0 và B1 không?
- **RQ2:** Claim–Evidence Integrity Loop có phát hiện citation mismatch tốt hơn B1 không?
- **RQ3:** Ba independent Judges có phát hiện nhiều gold issues hơn single/self review không?

RQ về Claim-Scope Calibrator chỉ được đánh giá nếu P1 thực sự được hoàn thành; không thuộc MVP evaluation requirement.

## 8. Systems under comparison

### B0 — Single-shot LLM

```text
Idea → one prompt → 14-section specification
```

### B1 — Staged pipeline without evidence verification and Multi-Judge

```text
Interpretation → decomposition → specification
```

B1 không có exact evidence integrity, independent Judges hoặc revision loop.

### Proposed SpecLoop

```text
Structured specification
+ literature/evidence provenance
+ integrity verification
+ exactly 3 independent Judges
+ user revision
```

Proposed không được tính là baseline. Các system phải dùng controlled model, dataset, token/call budget và run conditions ở mức khả thi; deviation phải được ghi.

## 9. Dataset and use-case plan

Proposal đưa ra range phù hợp bốn tuần:

- 8–12 research ideas.
- 5–7 development cases.
- 3–5 hidden test cases.
- 50–80 claim–evidence pairs nếu đủ nguồn lực; được giảm nhưng phải báo cáo.
- Controlled error injection cho citation mismatch/unsupported claim.

Final count chưa được quyết định. Dataset manifest planned fields: case ID, domain, source/license/provenance, dev/hidden split, injected-error flag, annotator coverage và exclusion reason. Hidden subset được ít nhất hai thành viên kiểm tra chéo khi có thể; nếu không, ghi limitation.

## 10. Human verification protocol

1. Viết rubric trước khi xem kết quả system.
2. Annotator đánh dấu factual claims, evidence support verdict và gold issues.
3. Ít nhất hai thành viên cross-check hidden subset khi feasible.
4. Disagreement được ghi riêng và giải quyết bằng documented discussion/adjudication rule do nhóm chốt.
5. Annotator không dùng Judge output làm gold label mặc định.
6. Báo cáo inter-review agreement nếu có phép đo thật; không bịa hệ số.

Exact annotator assignment và adjudication threshold là Open Questions.

## 11. Metrics and planned formulas

| Metric                                | Planned definition                                                    | Notes                                                      |
| ------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Human-verified Unsupported Claim Rate | `unsupported factual claims / all reviewed factual claims`            | Primary; denominator/exclusion rubric must be frozen first |
| Evidence precision                    | `correct SUPPORT-type predictions / all SUPPORT-type predictions`     | Map partial support policy before run                      |
| Evidence recall                       | `correctly detected supported/mismatched pairs / relevant gold pairs` | Positive class must be explicit                            |
| Evidence F1                           | Harmonic mean of precision and recall                                 | Report confusion matrix                                    |
| Citation validity                     | Valid source identifiers/metadata and retrievable cited source ratio  | Separate existence from support                            |
| Claim–experiment coverage             | Claims with valid experiment link / claims requiring experiment       | Does not prove experiment adequacy alone                   |
| Spec completeness                     | Required populated/valid items against 14-section rubric              | Avoid scoring verbosity as completeness                    |
| Judge issue recall                    | Gold issues found by Judge setup / all gold issues                    | Compare three-Judge versus single/self review              |
| JSON validity                         | Schema-valid first/final outputs / total calls                        | Report repair attempts separately                          |
| Time to finalize                      | Elapsed time from case start to finalized version                     | Only measured runs; workflow definition fixed              |
| Token usage                           | Provider-returned or instrumented input/output tokens                 | Missing usage remains missing                              |
| Cost                                  | Provider usage × applicable recorded price                            | Label estimate unless reconciled to actual billing         |
| Latency                               | Application-measured duration per call/job/workflow                   | Report environment and percentile only if measured         |

Report count, mean/median as appropriate, ratios, confusion matrix, error analysis and limitations. Complex statistical significance tests are not mandatory for the small dataset.

## 12. Pass/fail criteria

### Evaluation validity gate

Pass only if:

- B0, B1 and Proposed use the documented controlled setup or deviations are reported.
- Final dataset counts, rubric, metric formulas and exclusion rules were fixed before result interpretation.
- Human verification covers the declared evaluation set.
- Raw outputs, labels and calculation artifacts are traceable.
- No invented/missing value is silently imputed.

### Product evaluation completion gate

Pass means the planned B0/B1/Proposed comparison and required analyses were actually run and reported, including unfavorable or inconclusive outcomes. It does **not** mean SpecLoop is declared superior without evidence.

### Research hypothesis outcome

The sources do not define numeric superiority thresholds. Before evaluation, the team must record directional/threshold criteria for RQ1–RQ3. Until then, hypothesis outcome is `UNDECIDED`, not pass or fail.

## 13. Cost and latency measurement

- Capture per-call provider/model/prompt version, tokens when available, retry, measured duration and status.
- Aggregate by task/system/case; separate cache hits and failures.
- Record provider price source/date/config used for any estimate.
- Distinguish application wall-clock, queue wait and provider-call latency where instrumentation supports it.
- Never reuse feasibility estimate as measured runtime/cost.

## 14. Error analysis

Planned categories:

- unsupported/hallucinated factual claim;
- citation exists but does not support claim;
- partial/over-broad claim;
- missing or wrong evidence span;
- gap unsupported by corpus or novelty overstatement;
- contribution/claim conflation;
- weak baseline/metric/experiment coverage;
- Judge miss, false alarm or correlated bias;
- malformed JSON/hallucinated ID;
- PDF/API/provider/job failure;
- user-decision or versioning workflow failure.

Report representative cases with lawful excerpts/provenance and no fabricated paper/citation.

## 15. Threats to validity

- Small and domain-focused dataset limits generalization.
- Human annotator subjectivity and limited cross-check capacity.
- Same-provider Judges may share model bias despite independent prompts.
- Source/API availability affects corpus quality.
- Manual evidence fallback differs from exact full text.
- Controlled injected errors may not reflect natural errors.
- Prompt/model/provider updates reduce reproducibility.
- Budget/call limits may favor one system or restrict reruns.
- Team members who build the system may introduce evaluation bias.

Mitigation: freeze protocol/versioning, independent review where feasible, transparent deviations, controlled conditions, confusion matrices, qualitative error analysis and explicit limitations.

## 16. Result placeholders

The following remain intentionally unfilled until real runs exist:

- Test execution summary: `TO UPDATE AFTER IMPLEMENTATION`.
- Dataset final counts: `TO UPDATE AFTER DATASET FREEZE`.
- B0/B1/Proposed metric values: `TO UPDATE AFTER EVALUATION`.
- Cost/latency/token measurements: `TO UPDATE AFTER INSTRUMENTED RUNS`.
- Error-analysis examples and conclusions: `TO UPDATE AFTER HUMAN REVIEW`.
