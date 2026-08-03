# SpecLoop — AI System Design

**Trạng thái:** `PLANNED` — chưa có prompt run, model result hoặc benchmark  
**Nguyên tắc:** schema-first, provenance-aware, human-confirmed, bounded cost/retry  
**MVP:** một configurable LLM provider và đúng ba Judge độc lập

## 1. AI design goals

- Mỗi AI task có purpose, input/output schema và prompt version riêng.
- Không dùng một prompt duy nhất để search, generate claim và tự verify.
- Output AI là proposed data cho đến khi user hoặc verifier cấp authority phù hợp.
- Factual claim luôn giữ provenance hoặc review status.
- Document/PDF là untrusted content, không phải instruction.
- Không yêu cầu, lưu hoặc hiển thị private chain-of-thought; chỉ dùng structured reason/finding.
- External calls có timeout, bounded retry, budget và terminal error status.

## 2. AI task catalog and schemas

Các schema dưới đây mô tả contract planned; type chi tiết sẽ được định nghĩa bằng Pydantic và shared schemas khi implementation bắt đầu.

| Task ID | Task | Input schema | Output schema | Human gate |
| --- | --- | --- | --- | --- |
| AIT-01 | Idea interpretation | `InterpretIdeaInput { project_id, raw_idea, domain?, deadline?, resource_constraints[] }` | `InterpretationOutput { simple_interpretation, technical_interpretation, assumptions[], objectives[], ambiguities[] }` | Confirm/Edit/Regenerate/Other trước decomposition |
| AIT-02 | Structured decomposition | `DecomposeIdeaInput { confirmed_interpretation, confirmed_decisions[], constraints[] }` | `DecompositionOutput { nodes[], relations[], warnings[] }` | User review/edit nodes |
| AIT-03 | Search-query generation | `QueryGenerationInput { research_questions[], domain, known_terms[], limits }` | `QueryGenerationOutput { queries[{ query, rationale, target_concept }] }` | User may edit/select queries |
| AIT-04 | Related-work synthesis | `RelatedWorkInput { selected_sources[], evidence_summaries[], allowed_source_ids[] }` | `RelatedWorkOutput { rows[{ source_id, capabilities[], limitations[], evidence_refs[] }], warnings[] }` | User reviews matrix/provenance |
| AIT-05 | Atomic claim–evidence review | `EvidenceReviewInput { claim, evidence_span, short_context, rubric_version }` | `EvidenceReviewOutput { verdict, reason, unsupported_aspects[], confidence_label? }` | User/verifier review; does not confer user confirmation |
| AIT-06 | Gap proposal | `GapInput { research_questions[], related_work_rows[], evidence_refs[], scope_constraints[] }` | `GapOutput { candidates[{ known_capability, limitation, importance, testable_hypothesis, evidence_refs[], nearest_work_ids[], novelty_risk, scope }] }` | Select/Edit/Combine/Other |
| AIT-07 | Contribution and claim generation | `ClaimDesignInput { selected_gap, confirmed_nodes[], constraints[], evidence_refs[] }` | `ClaimDesignOutput { contributions[], claims[{ type, text, scope, baseline, dataset_domain, metric, expected_direction, falsification_condition, evidence_refs[], experiment_refs[] }] }` | User confirms/edits research choices |
| AIT-08 | Experiment planning | `ExperimentPlanInput { claims[], resources[], baselines[], available_datasets[], budget_limits }` | `ExperimentPlanOutput { baselines[], metrics[], protocol[], controls[], ablations[], generalization_proposals[], assumptions[], estimates[] }` | User reviews feasibility and choices |
| AIT-09 | Specification generation | `SpecGenerationInput { confirmed_nodes[], source_metadata[], evidence_links[], experiment_plans[], user_decisions[], template_version }` | `ResearchSpecificationOutput { sections[14], provenance_index[], proposed_claims[], warnings[] }` | User reviews draft before Judges/finalize |
| AIT-10 | Evidence Judge | `JudgeInput { judge_type=EVIDENCE, target_nodes[], evidence_links[], spec_sections[], rubric_version }` | `JudgeOutput { findings[] }` | Findings reviewed after aggregation |
| AIT-11 | Research Judge | `JudgeInput { judge_type=RESEARCH, target_nodes[], related_work[], spec_sections[], rubric_version }` | `JudgeOutput { findings[] }` | Findings reviewed after aggregation |
| AIT-12 | Experiment Judge | `JudgeInput { judge_type=EXPERIMENT, claims[], experiment_plans[], spec_sections[], rubric_version }` | `JudgeOutput { findings[] }` | Findings reviewed after aggregation |
| AIT-13 | Revision option generation | `RevisionInput { finding_group, target_content, allowed_actions, project_constraints }` | `RevisionOutput { options[{ action, explanation, example?, expected_effect }], warnings[] }` | User selects/edits/Other; AI never chooses automatically |

### 2.1 Common node schema

```json
{
  "client_ref": "local-reference",
  "type": "PROBLEM|RESEARCH_QUESTION|PRIOR_WORK_FINDING|LIMITATION|GAP|CONTRIBUTION|CLAIM|EVIDENCE|BASELINE|METRIC|EXPERIMENT|CONSTRAINT|RISK|OPEN_QUESTION",
  "title": "",
  "content": "",
  "status": "PROPOSED|NEEDS_REVIEW|MISSING|AMBIGUOUS|UNSUPPORTED|CONFLICT",
  "source_refs": [],
  "reason": ""
}
```

AI output không được tự gán `USER_CONFIRMED` hoặc `SYSTEM_VERIFIED`; application services quản lý authority transitions.

### 2.2 Evidence review schema

```json
{
  "claim_ref": "",
  "evidence_span_ref": "",
  "verdict": "SUPPORTS|PARTIALLY_SUPPORTS|CONTRADICTS|INSUFFICIENT|IRRELEVANT",
  "reason": "",
  "unsupported_aspects": []
}
```

### 2.3 Finding schema

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

No field requests hidden/private reasoning. `reason` is a concise review rationale intended for users and tests.

## 3. Prompt catalog

| Prompt ID | Task | System purpose | Context boundary | Version trigger |
| --- | --- | --- | --- | --- |
| PT-01 | AIT-01 | Interpret without inventing facts | User idea + declared constraints | Schema/rubric/copy change |
| PT-02 | AIT-02 | Produce typed proposed nodes/relations | Confirmed interpretation only | Node/relation rules change |
| PT-03 | AIT-03 | Generate bounded search queries | Confirmed research questions | Search provider/query strategy change |
| PT-04 | AIT-04 | Synthesize source-bounded related work | Selected sources + evidence refs | Matrix schema/rubric change |
| PT-05 | AIT-05 | Judge one claim–span pair | One claim + one span + short context | Verdict/rubric change |
| PT-06 | AIT-06 | Propose corpus-bounded gaps | Selected corpus-derived records | Gap schema/warning change |
| PT-07 | AIT-07 | Propose contribution/atomic claims | Selected gap + confirmed nodes | Claim schema/rubric change |
| PT-08 | AIT-08 | Plan controlled experiments | Claims + resources/budget | Planner schema/formulas change |
| PT-09 | AIT-09 | Assemble 14-section specification | Allowed confirmed inputs only | Template/section policy change |
| PT-10 | AIT-10 | Evidence Judge | Evidence-specific rubric/context | Judge rubric/context policy change |
| PT-11 | AIT-11 | Research Judge | Gap/contribution/overclaim rubric | Judge rubric/context policy change |
| PT-12 | AIT-12 | Experiment Judge | Claim–experiment adequacy rubric | Judge rubric/context policy change |
| PT-13 | AIT-13 | Generate revision options | One finding group + target | Decision-option policy change |

Prompt record planned fields: `prompt_id`, semantic version, task ID, input schema version, output schema version, template content hash, change note, status and created timestamp. Actual prompt text is not authored in this design document.

## 4. Structured JSON validation

```text
Build typed input
→ enforce context allowlist and budget
→ call provider requesting JSON/structured output
→ parse JSON
→ validate Pydantic schema and allowed IDs/enums
→ if repairable schema error: one bounded repair attempt
→ validate domain rules/provenance references
→ persist accepted proposed output or terminal error
```

Validation layers:

1. JSON syntax.
2. Schema fields/types/enums.
3. Reference allowlist: output may reference only IDs provided in input.
4. Domain invariants: same project, valid relation, allowed status transition.
5. Provenance policy: new factual content is proposed/reviewable, never silently verified.
6. Size/budget limits.

Malformed or hallucinated IDs are rejected; application does not guess intended IDs.

## 5. Prompt versioning and reproducibility

- Every model call records task ID, prompt version, schema version, provider/model, relevant generation parameters, input hash, output status and retry count.
- Prompt change creates a new immutable version; old evaluation runs retain their original version reference.
- Same prompt version does not imply deterministic model output; seeds/parameters are logged when provider supports them.
- Golden prompt regression is P1. P0 uses contract fixtures and a small curated evaluation set.

## 6. Literature discovery

P0 flow:

```text
Confirmed research question
→ AIT-03 queries
→ one academic API
→ normalize metadata
→ deterministic deduplicate
→ rank/shortlist
→ user selection
→ manual import fallback
```

LLM may propose queries and summarize selected records but cannot invent DOI/metadata. Academic API response or user-provided metadata is the provenance source. A second academic API and Crossref DOI verification are P1.

## 7. Evidence extraction and verification

### Extraction

- PyMuPDF extracts page text after security validation.
- User selects exact span; application computes/stores page and offsets and confirms exact text match.
- Abstract/manual evidence is allowed with explicit provenance tier.
- LLM does not choose or rewrite exact text while preserving an “exact” label.

### Verification

1. Deterministic: source exists, page/offset valid, exact text matches, link targets exist, claim has evidence/experiment disposition.
2. Atomic AI review (AIT-05): one claim, one span, short context, fixed rubric.
3. Human verification for evaluation/gold labels.

Evidence tier describes provenance/directness, not universal credibility.

## 8. Gap, contribution, claim and experiment generation

- Gap generation only receives selected corpus evidence; output always carries novelty-risk warning.
- Contribution/claim generation separates contribution from falsifiable claim and fills scope/baseline/metric fields.
- Experiment planner links claims to tests, includes B0/B1, controls and at least one important ablation.
- Feasibility calculations are deterministic where possible:

```text
calls = samples × candidates × rounds
estimated_tokens = calls × average_tokens_per_call
estimated_runtime = estimated_tokens / assumed_or_measured_throughput
estimated_cost = token_usage × provider_price
```

Every input is labeled assumed or measured. The system does not fabricate provider prices, GPU throughput or results.

## 9. Specification generation

AIT-09 outputs exactly these sections:

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

The generator consumes confirmed nodes, source metadata, evidence links, experiment plans and user decisions. Any new factual statement is marked `PROPOSED/NEEDS_REVIEW`. Finalization remains an application rule, not an LLM decision.

## 10. Three independent Judges

### Evidence Judge

Checks source/span validity, claim support, citation mismatch and unsupported factual content. Receives evidence-focused context only.

### Research Judge

Checks problem/question/gap/contribution logic, corpus-bounded novelty statement, overclaim and clarity. It does not receive findings from other Judges.

### Experiment Judge

Checks claim–experiment coverage, baseline/metric suitability, controls, ablation, feasibility assumptions and whether experiments can falsify claims.

All three may use the same provider/model with independent prompts and contexts. Five Judges, multi-model ensemble and semantic clustering are P2.

## 11. Finding aggregation, consensus and disagreement

AI does not perform the final grouping decision in P0. Application groups by:

```text
target_node_id + finding_type + severity_band
```

Rules:

- Deterministic CRITICAL: must fix or remove before finalize.
- MAJOR from at least two Judges: consensus issue.
- MAJOR from one Judge: single-Judge flag.
- Action/severity conflict: disagreement requiring user decision.
- Single MINOR: does not automatically block finalize.

Additional unresolved-status finalization rules remain an Open Question for PRD/implementation.

## 12. User revision

AIT-13 can propose explained options and examples, including a path for `Other`, but cannot apply a research decision automatically. User choice is stored with actor, target, chosen/entered action and timestamp. Revision creates a new version and reruns only relevant checks where feasible.

## 13. Retry, timeout and fallback

| Failure | Retry policy | Fallback/terminal behavior |
| --- | --- | --- |
| Invalid JSON/schema | One repair attempt within proposal's 1–2 limit | Persist schema error; user can retry/regenerate |
| Provider timeout/transient 5xx/rate limit | Bounded policy, exact timeout/backoff to be configured | Job failed/deferred with clear status; no infinite retry |
| Permanent provider/auth error | No blind retry | Terminal error and configuration action |
| Academic API unavailable | Bounded retry if transient | Manual source import |
| PDF parse failure | No model retry | Manual abstract/evidence fallback |
| Atomic review budget exhausted | No hidden overrun | Mark `NEEDS_REVIEW` and require user/human path |
| Judge failure | Preserve independent completed results | Failed Judge remains explicit; finalization policy requires team decision if incomplete |

Exact timeout/backoff values are Open Questions and must not be invented here.

## 14. Token/API budget

P0 controls:

- maximum papers per project;
- maximum calls/tokens per workflow step;
- maximum Judge runs/reruns;
- warning threshold and hard stop;
- estimate before user-triggered expensive operation;
- cache by validated input/prompt/model hash where safe;
- log measured usage returned by provider and label derived cost as estimate.

Numeric defaults depend on provider/team budget and remain unresolved. Budget failure is an explicit job status, never a partial success claim.

## 15. Model-call logging

Planned fields:

```text
project_id, workflow_step_id, job_run_id, task_id,
provider, model, prompt_version, schema_version,
input_hash, token_input?, token_output?, latency_ms,
estimated_cost?, retry_count, status, error_code?, created_at
```

Logs omit secrets, raw private reasoning and unnecessary document content. `latency_ms` is measured by application when implemented; cost is marked estimated unless reconciled with a real provider bill.

## 16. Prompt-injection handling

1. System/developer policy is separate from document/user content.
2. Document content is delimited, labeled untrusted and minimized.
3. Model receives no direct tool execution authority.
4. Output must match schema and only reference allowlisted IDs.
5. Instructions found in papers are ignored as data.
6. Uploaded content is never executed or imported as code.
7. Adversarial fixtures test instruction override, data exfiltration and hallucinated IDs.

## 17. Human confirmation points

| Stage | Required human action |
| --- | --- |
| Interpretation | Confirm/Edit/Regenerate/Other before decomposition |
| Source selection | Select corpus and validate manual metadata |
| Evidence | Select/confirm evidence span or manual evidence provenance |
| Gap/contribution/claim | Select/edit/combine/Other and accept scope |
| Experiment | Review baselines, metrics, assumptions and feasibility |
| Specification | Review proposed/unsupported items before Judges/finalize |
| Findings | Decide revision action for consensus/disagreement/blockers |
| Finalize | Explicitly finalize selected version after rules pass |

`USER_CONFIRMED` cannot be generated by a verifier or Judge.

## 18. AI testing strategy

### Contract tests

- Valid JSON and every allowed enum.
- Malformed JSON, missing field, wrong type, extra/hallucinated ID.
- Output size and budget boundary.

### Deterministic integrity tests

- Missing/deleted source, invalid page/offset, exact-text mismatch.
- Orphan claim and invalid claim–experiment link.
- Authority/status transition rules.

### Prompt behavior evaluation

- Curated idea/source/evidence fixtures.
- Controlled citation mismatch and unsupported-claim injection.
- Rubric-scored claim–evidence verdicts.
- Judge independence and gold-issue recall.
- Prompt-injection fixtures.

### Baselines

- B0: single-shot LLM produces 14-section spec.
- B1: staged interpretation/decomposition/spec without exact evidence verification and Multi-Judge.
- Proposed: structured evidence/integrity + three Judges + user revision.

No result, pass rate, latency, token count or cost is claimed before the corresponding evaluation runs.
