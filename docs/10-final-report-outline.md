# SpecLoop — Final Report Outline

**Trạng thái:** `PLANNED OUTLINE`  
**Quy tắc:** chỉ hoàn thiện phần implementation, testing, evaluation, results, cost/latency, team contribution và lessons learned sau khi có evidence thực tế. Không điền dữ liệu giả.

## 1. Introduction

- Bối cảnh research idea → research specification.
- Động lực evidence grounding, independent review và user confirmation.
- Phạm vi team ba người/bốn tuần.
- **Placeholder:** cập nhật summary cuối sau khi dự án hoàn tất.

## 2. Problem

- Idea mơ hồ, gap chủ quan, overclaim, citation mismatch, experiment thiếu.
- Hạn chế của single-shot generation và self-review.
- Non-goals: không bảo đảm novelty/paper acceptance, không loại bỏ hallucination.

## 3. Objectives

- Product objectives.
- Research/evaluation objectives RQ1–RQ3.
- P0 success definition và scope boundaries.

## 4. Requirements

- Personas, user journey và use cases.
- FR-01…FR-21, NFR-01…NFR-10.
- Business rules và P0/P1/P2.
- Open questions/decisions đã được giải quyết.
- **Placeholder:** cập nhật decision log thực tế.

## 5. Proposed approach

- Structured workflow.
- Claim–Evidence Integrity Loop.
- Evidence-Grounded Spec Structure.
- Independent Multi-Judge Revision.
- Human confirmation points.

## 6. Architecture

- Monorepo và modular monolith rationale.
- System context/container diagrams.
- Same-domain background worker và shared PostgreSQL.
- Local storage/PyMuPDF/Docker Compose.
- Trade-offs và ADRs.
- **Placeholder — update after code:** as-built architecture và deviations.

## 7. System design

- Backend modules và data model.
- API/job contracts.
- Workflow/state machine.
- Provenance, versioning và finalization policy.
- Error/retry/budget boundaries.
- **Placeholder — update after code:** final schemas/routes/migrations actually implemented.

## 8. Implementation

- Frontend implementation.
- Backend/domain/persistence implementation.
- Background-job implementation.
- PDF/storage/external API integration.
- Version/export implementation.
- **TO UPDATE AFTER CODE:** repository structure, exact commands, key implementation decisions, screenshots and known gaps.

## 9. AI design

- AI task/prompt/schema catalogs.
- Structured JSON validation.
- Literature/evidence/gap/claim/experiment generation.
- Specification generator.
- Evidence, Research and Experiment Judges.
- Prompt injection, human gates and model-call logging.
- **Placeholder — update after AI implementation:** actual provider/model, prompt versions and deviations.

## 10. Testing

- Unit, contract/schema, API, integration, E2E and security strategy.
- TC-01…TC-23 traceability.
- Test environment và entry/exit criteria.
- **TO UPDATE AFTER TEST RUNS:** exact commands, executed counts, pass/fail/error results and unresolved defects.

## 11. Evaluation methodology

- RQ1–RQ3.
- B0 single-shot, B1 staged without evidence/Multi-Judge, Proposed SpecLoop.
- Dataset/use-case split and controlled error injection.
- Human verification/adjudication.
- Metric formulas and controlled conditions.
- Threats to validity.
- **Placeholder:** freeze final protocol before evaluation.

## 12. Results

- Product workflow completion evidence.
- Quantitative metric tables.
- Qualitative observations.
- Cost/token/latency measurements.
- **TO UPDATE AFTER EVALUATION:** do not insert expected, estimated or illustrative values as results.

## 13. Baseline comparison

- B0 versus B1 versus Proposed table.
- Unsupported Claim Rate.
- Evidence verification metrics.
- Judge issue recall.
- Completeness/time/token/cost/latency where measured.
- **TO UPDATE AFTER CONTROLLED RUNS:** include conditions and deviations.

## 14. Error analysis

- Unsupported factual claims.
- Citation mismatch and partial support.
- Gap/overclaim errors.
- Experiment-plan coverage errors.
- Judge false positives/misses/shared bias.
- JSON, PDF, API and job failures.
- **TO UPDATE AFTER HUMAN REVIEW:** use traceable lawful examples only.

## 15. Security and reliability

- Prompt-injection controls.
- PDF upload safety and private storage.
- Validation, secrets, timeout/retry and budget limits.
- Job/error/logging behavior.
- **TO UPDATE AFTER VERIFICATION:** actual controls implemented, security test evidence and residual risk.

## 16. Limitations

- Corpus-bounded novelty.
- Small/domain-focused dataset.
- Human annotation and same-provider Judge bias.
- Manual evidence/full-text availability.
- Four-week scope and deferred P1/P2.
- **Placeholder:** add implementation/evaluation-specific limitations when known.

## 17. Team contribution

- Member 1 — Product Workflow and Frontend Lead.
- Member 2 — Backend, Data and Platform Lead.
- Member 3 — AI, Evidence and Evaluation Lead.
- Cross-role integration/testing responsibilities.
- **TO UPDATE AFTER WORK:** record actual contributions from repository/issues/review evidence; do not infer or assign names here.

## 18. Lessons learned

- Product/scope management.
- Evidence/provenance design.
- Structured LLM integration.
- Independent review and human decision workflow.
- Testing/evaluation trade-offs.
- **TO UPDATE AFTER PROJECT:** no retrospective claims before work occurs.

## 19. Future work

### P1 candidates

- Second academic API, Redis/RQ, exact-text hash.
- Claim-Scope Calibrator, better semantic diff.
- DOI verification, prompt regression and cost dashboard.

### P2/stretch candidates

- Graph/citation visualization, GROBID, MinIO/S3.
- Five Judges, multi-model ensemble, semantic clustering.
- Collaboration, PDF/DOCX export, Active Candidate Selection.
- Advanced observability and fine-tuned NLI verifier.

Future work must not be presented as implemented or included in MVP Definition of Done.

## 20. Conclusion

- Restate problem, contribution and evaluated outcome.
- Answer RQ1–RQ3 only from actual results.
- Separate supported conclusion from limitation/future work.
- **TO UPDATE AFTER RESULTS:** no conclusion about superiority or hallucination reduction yet.

## 21. Appendices

- A. Requirement Traceability Matrix.
- B. API/schema reference as implemented.
- C. Prompt versions for generator and three Judges.
- D. Test Case/run evidence.
- E. Dataset manifest and annotation rubric.
- F. Raw/aggregate evaluation tables.
- G. Risk register and ADR index.
- H. Reproducible setup commands.
- I. Sample research specification and Markdown export.
- **TO UPDATE AFTER ARTIFACTS EXIST:** include only real, reviewable artifacts.
