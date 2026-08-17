# Step 2 — Full Structured Decomposition Design

Status: `APPROVED`
Date: 2026-08-17
Approved by user: 2026-08-17
Scope owner: Week-1 vertical slice / AIT-02 / EP-03 / US-04…US-06

## 1. Outcome

Step 2 turns the latest user-confirmed interpretation into a complete,
reviewable decomposition of the research idea. The result is a typed graph of
cards and relations that makes missing, ambiguous, unsupported, and conflicting
content explicit before literature discovery begins.

This design completes the assignment's Step 2 behavior without moving
literature search, related-work synthesis, corpus-bounded gap assessment, or
verified evidence into this screen.

## 2. Source alignment and precedence

The design follows these sources in order:

1. `docs/source/01-assignment.md`, especially Step 2 at lines 96–127.
2. `docs/source/02-approved-proposal.md`, especially Structured Decomposition
   at lines 444–448 and the UI boundaries at lines 822–834.
3. `docs/02-product-requirements.md` FR-03…FR-05 and FR-10.
4. `docs/05-product-backlog.md` EP-03 / US-04…US-06.
5. The current schemas, API module, tests, and web workspace.

The visual file `ui-references/ui/02-related-work-gap.png` represents later
Literature and Research Gap work. It may guide spacing, card hierarchy, colors,
and responsive composition, but its search, related-work, and gap-selection
features do not belong to Step 2.

## 3. Resolved terminology

### 3.1 Required assignment card types

Every successful decomposition contains one or more nodes for each required
type:

- `PROBLEM`
- `RESEARCH_QUESTION`
- `GAP`
- `CONTRIBUTION`
- `CLAIM`
- `EVIDENCE`
- `CONSTRAINT`
- `OPEN_QUESTION`

`RISK` remains an optional supported type because it is required by the
approved proposal. It does not replace `EVIDENCE` or any assignment card.

`EVIDENCE` in Step 2 means an evidence requirement: what observation, result,
or experiment would support or falsify a claim. It is not a citation, extracted
paper span, measured result, or verified factual assertion. Those artifacts are
created in later Literature and Evidence capabilities.

### 3.2 Status mapping

The assignment status `CONFIRMED` maps to the domain status
`USER_CONFIRMED`. The explicit prefix preserves user authority and prevents AI
output from appearing user-approved. The remaining assignment statuses map
directly:

| Assignment label | Domain status    | Authority                                         |
| ---------------- | ---------------- | ------------------------------------------------- |
| `CONFIRMED`      | `USER_CONFIRMED` | User only                                         |
| `PROPOSED`       | `PROPOSED`       | AI or user-created proposal                       |
| `MISSING`        | `MISSING`        | AI/system finding                                 |
| `AMBIGUOUS`      | `AMBIGUOUS`      | AI proposal preserved only with reason and action |
| `UNSUPPORTED`    | `UNSUPPORTED`    | Deterministic rule or later verifier              |
| `CONFLICT`       | `CONFLICT`       | Deterministic relation/content rule               |

`NEEDS_REVIEW`, `USER_REJECTED`, `SYSTEM_VERIFIED`, and `SUPERSEDED` remain
valid lifecycle statuses but are not substitutes for the six assignment
statuses.

## 4. Current implementation gap

The current vertical slice already provides the confirmation gate, structured
LLM output, schema validation, deterministic warnings, an in-memory graph
store, tRPC procedures, node editing, Confirm/Reject, relation editing, status
history, and an explicitly labeled local fixture.

The remaining Step 2 gaps are:

- The required-type rule omits `EVIDENCE` and treats `RISK` as required.
- PT-02 prefers the approved-proposal set but does not require all eight
  assignment types or require a `MISSING` placeholder when input is incomplete.
- The local fixture renders only `PROBLEM`, `RESEARCH_QUESTION`, `GAP`, and
  `EVIDENCE`, so the browser flow cannot demonstrate complete decomposition.
- Warning coverage is strongest for absent types, unsupported claims, and
  contradictory relations; complete ambiguity and evidence-requirement
  semantics are not demonstrated end to end.
- `Step2Workspace` combines data orchestration, fixture mutations, card/table
  rendering, warnings, relations, and history in one large component.
- The UI does not provide a clear eight-type coverage view or type/status
  filtering.
- The derived documentation marks Step 2 `IN_PROGRESS`; durable PostgreSQL
  persistence, tenant authorization, and live-provider evidence remain open.

## 5. Functional requirements

### SD-01 — Confirmation gate

Step 2 generation accepts only `projectId`. The server reads the confirmed
interpretation and rejects generation unless the selected project owns a
`USER_CONFIRMED` interpretation. Client-supplied interpretation content is
never trusted as the gate input.

### SD-02 — Complete typed decomposition

The generator returns at least one node for every required assignment type.
When the confirmed interpretation lacks enough information, it returns a
bounded placeholder node of the correct type with status `MISSING` or
`AMBIGUOUS`, a concise reason, and a concrete action for the user. It does not
invent a plausible answer to fill the card.

### SD-03 — Proposed-data authority

AI may assign only `PROPOSED`, `NEEDS_REVIEW`, `MISSING`, `AMBIGUOUS`,
`UNSUPPORTED`, or `CONFLICT`. Only a user mutation can assign
`USER_CONFIRMED` or `USER_REJECTED`. Only deterministic application logic may
assign `SYSTEM_VERIFIED` in capabilities where verification is defined.

### SD-04 — Review and correction

The user can inspect every card's type, title, content, status, reason, and
source-reference count; edit title/content/reason; confirm or reject a card;
and see the resulting status-history entry. Empty title or content is rejected.

### SD-05 — Relations

The user can create and delete same-project relations between distinct nodes.
Self-relations, duplicate relations, missing endpoints, and cross-project
endpoints are rejected. The UI exposes only relation types defined by the
shared schema.

### SD-06 — Explainable warnings

Deterministic rules produce warnings for:

- each absent required card type;
- a claim without a planned support or test path;
- a complete targeted ambiguity proposed by the generator;
- contradictory `SUPPORTED_BY` and `CONTRADICTED_BY` relations for the same
  ordered pair.

Every warning contains `code`, `targetType`, an optional valid
`targetClientRef`, `reason`, and `suggestedAction`. A targeted warning updates
the proposed node status using the priority `CONFLICT` > `AMBIGUOUS` >
`UNSUPPORTED` > `MISSING`.

### SD-07 — Evidence boundary

An `EVIDENCE` requirement node does not prove a claim and does not clear an
`UNSUPPORTED` finding merely because a `SUPPORTED_BY` edge exists. Actual
support requires later evidence provenance and integrity review. Step 2 copy
must state this boundary.

### SD-08 — Regeneration

Regeneration replaces the generated graph only after the new output passes
schema and deterministic validation. It never silently falls back to fixture
data, never changes the confirmed Step 1 interpretation, and never preserves a
user confirmation on newly generated AI content.

### SD-09 — Complete local fixture

Fixture mode contains all eight required assignment types plus optional
`RISK`, representative relations, and examples of `PROPOSED`, `MISSING`,
`AMBIGUOUS`, `UNSUPPORTED`, `CONFLICT`, and user confirmation history. Fixture
content is explicitly fictional and contains no paper, DOI, citation, novelty,
or experiment-result claim.

### SD-10 — User-facing completion signal

The workspace displays required-type coverage, unresolved warning count, and
review status. Step 2 is ready to hand off only when all eight required types
are present and no required card remains `MISSING`, `AMBIGUOUS`, `CONFLICT`, or
`NEEDS_REVIEW`. `UNSUPPORTED` claims may remain visible at the handoff because
evidence work occurs later; the UI must label the handoff as conditional rather
than verified.

## 6. Architecture

### 6.1 Shared schema boundary

`packages/schemas` remains the source of truth for node types, statuses,
relations, decomposition output, warnings, and graph views. It will export a
single assignment-required Step 2 type list used by API rules, fixtures, UI
coverage calculations, and tests. This prevents the current required-type sets
from drifting across prompt, backend, and frontend.

All tRPC Step 2 procedures retain explicit Zod `.input()` and `.output()`
schemas. Invalid client input is a `BAD_REQUEST`; a server value that fails the
declared output schema is an `INTERNAL_SERVER_ERROR` and is never presented as
user input failure.

### 6.2 API/domain boundary

The existing `SpecStructureModule` remains the application boundary. The
domain service owns the confirmation gate and generation transaction; the LLM
adapter only produces untrusted structured output; deterministic rules validate
and annotate it; the store persists the accepted graph and status history.

The existing shared tRPC instance and `createContextInner` composition remain
in place. Step 2 does not initialize another tRPC instance or import server
router values into client code.

Expected tRPC error mapping:

| Condition                                                             | tRPC code               |
| --------------------------------------------------------------------- | ----------------------- |
| Invalid input/schema                                                  | `BAD_REQUEST`           |
| No confirmed interpretation                                           | `PRECONDITION_FAILED`   |
| Project, node, graph, or relation not found                           | `NOT_FOUND`             |
| Duplicate/self/cross-project relation or invalid lifecycle transition | `CONFLICT`              |
| Valid request but invalid LLM/output contract                         | `INTERNAL_SERVER_ERROR` |

Unexpected errors retain their original cause for server diagnostics while the
client receives a bounded message without secrets or raw provider content.

### 6.3 Web boundary and component decomposition

`Step2Workspace` remains the route-level container responsible for queries,
mutations, fixture-mode state, and cache updates. Presentation is split into
focused components:

- page heading and Step 2 boundary notice;
- required-type coverage and summary metrics;
- type/status filters;
- node review list/cards and edit form;
- warnings panel;
- relation editor and relation list;
- status-history panel;
- conditional handoff summary.

The large desktop table is replaced or supplemented by responsive cards so
title, content, reason, status, and actions remain readable beside the project
sidebar. The implementation reuses existing design tokens and section-card
patterns; it does not copy hard-coded feature data from `ui-references`.

Graph visualization, drag-and-drop, animation, and domain-specific custom card
types remain optional P2 work.

## 7. Data flow

```text
User confirms Step 1 interpretation
→ Web calls decomposition.generate({ projectId })
→ tRPC validates input
→ DecompositionService reads confirmed snapshot server-side
→ PT-02 sends only confirmed interpretation/decisions/constraints as untrusted data
→ Structured gateway validates DecompositionOutput
→ Deterministic rules calculate required-type and integrity warnings
→ Store replaces the accepted generated graph and records AI authority history
→ tRPC validates SpecGraphView output
→ Web cache updates and renders coverage/cards/warnings/relations/history
→ User edits cards, changes status, and edits relations through validated mutations
→ Store recalculates warnings and appends status history
→ UI shows conditional readiness for the Literature/Evidence handoff
```

## 8. UI behavior

The default view presents:

1. A heading identifying “2. Phân rã ý tưởng / Structured decomposition”.
2. A boundary notice that literature, citations, and novelty are not evaluated
   here.
3. A coverage strip with the eight required card types and their current state.
4. Filters for node type and status.
5. Responsive review cards ordered by required type, then optional type, then
   stable `clientRef`.
6. Warning, relation, and history sections.
7. A conditional handoff summary explaining unresolved work.

Each review card exposes one primary action at a time. View mode offers Edit,
Confirm, and Reject where valid. Edit mode offers Save and Cancel. Destructive
actions remain visually distinct. Pending mutations disable conflicting
actions, and errors appear next to the affected section while preserving the
last successful graph.

The interface uses Vietnamese user-facing copy with stable English enum labels
only where they help debugging or traceability.

## 9. Error and recovery behavior

- A missing confirmation leaves Step 2 locked and links the user back to Step 1.
- Provider or structured-output failure leaves the previous graph intact and
  offers regeneration; it does not substitute fixture data.
- A missing graph shows an empty state and Generate action.
- A failed edit, status change, or relation mutation preserves the current
  rendered graph and the user's edit draft where safe.
- Validation messages identify the field or lifecycle rule that failed.
- Concurrent or conflicting mutations are serialized by disabling related UI
  controls in the current P0 client. Durable optimistic concurrency is part of
  the later database/persistence work.

## 10. Testing strategy

### Shared schemas

- Required assignment type list contains exactly the eight approved types.
- `RISK` remains supported but optional.
- AI output cannot assign user/system authority statuses.
- Malformed nodes, relations, warnings, and graph views fail Zod validation.

### Prompt/generator

- PT-02 names all eight required assignment types and the optional `RISK` type.
- PT-02 instructs the model to return `MISSING`/`AMBIGUOUS` placeholders rather
  than invent content.
- Prompt input includes only the confirmed snapshot, decisions, and constraints.
- Structured output receives one bounded repair attempt and rejects invalid
  output after that attempt.

### Deterministic rules and store

- Every absent required type creates one deduplicated `MISSING` warning.
- `RISK` absence does not create a missing warning.
- Unsupported, ambiguous, and conflict rules preserve the documented priority.
- Evidence-requirement edges do not falsely verify claims.
- Node edits, user status changes, and relation changes recalculate warnings and
  append correct authority history.
- Invalid, duplicate, self, and cross-project relations fail without mutation.

### Router and integration

- Generation before confirmation returns `PRECONDITION_FAILED`.
- All procedures validate input and output schemas.
- The Step 1 confirm → Step 2 generate → review mutation path succeeds with a
  deterministic generator and store.
- Invalid generator output is never persisted.

### Web

- Coverage calculation reports all eight required types and unresolved states.
- Filters produce stable node ordering.
- Review cards expose the correct actions for each status.
- Fixture mode can generate, edit, confirm/reject, create/delete a relation, and
  show status history without calling the API.
- Error states preserve the previous successful graph.

### Browser smoke

The browser fixture path performs:

```text
Open local Step 1
→ Confirm interpretation
→ Open Step 2
→ Generate full fixture
→ verify eight required types
→ filter by type/status
→ edit and confirm one card
→ create and delete one relation
→ inspect warnings and status history
→ verify conditional handoff state
```

Browser evidence must state that fixture data is not a live provider,
PostgreSQL, citation, novelty, or experiment result.

## 11. Acceptance criteria

Step 2 is functionally complete for this plan when:

1. The server blocks generation before a user-confirmed interpretation.
2. A valid generated graph contains all eight required assignment card types,
   using explicit missing/ambiguous placeholders when needed.
3. AI cannot assign user/system authority statuses.
4. Users can review, edit, confirm/reject nodes, manage relations, and inspect
   warning/status history through validated API and fixture paths.
5. Deterministic rules expose missing, ambiguous, unsupported, and conflict
   conditions with reason and suggested action.
6. An evidence-requirement card cannot be mistaken for verified evidence.
7. The UI displays full type coverage and a conditional handoff state without
   literature or novelty claims.
8. Focused schema, API, integration, web, and browser checks pass using commands
   that exist in the repository.
9. `.agents/agent-docs/implementation-progress.md` is updated with observed
   evidence only; unverified provider, database, authorization, latency, cost,
   and evaluation claims remain explicitly open.

## 12. Out of scope

- Academic search, manual source import, deduplication, and corpus selection.
- Related-work matrix and source provenance.
- PDF parsing and exact evidence spans.
- Corpus-bounded research-gap validation and novelty-risk assessment.
- Experiment planning and measured results.
- Graph visualization, drag-and-drop, and animation.
- Authentication redesign, multi-tenant authorization, and collaboration.
- PostgreSQL migration and optimistic concurrency; these remain platform-level
  dependencies and must not be claimed complete by this Step 2 plan.

## 13. Documentation and completion policy

The implementation plan will live at
`.agents/agent-docs/step-2-implementation-plan.md` and will trace every task to
the requirements and acceptance criteria above. A task may be marked `DONE`
only after its listed test or verification command has been run and its result
checked. No implementation status, provider result, citation, metric, or
performance claim may be inferred from fixture data.
