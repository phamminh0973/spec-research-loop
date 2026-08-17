# Step 2 Full Structured Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Step 2 conform to the assignment by generating and reviewing a
complete structured decomposition with the eight required node types, explicit
uncertainty, editable relations, status authority, coverage/readiness signals,
and no literature-search leakage.

**Architecture:** Keep `packages/schemas` as the shared runtime/type contract,
keep the existing `SpecStructureModule` and process-scoped store as the Step 2
domain boundary, and preserve the existing tRPC instance/context. Extend the
deterministic rule engine and router contracts, then expose pure web view-model
functions that focused React presentation components consume. Every external
input and output remains Zod-validated.

**Tech Stack:** TypeScript, Zod, tRPC, Next.js App Router, React, TanStack Query,
Tailwind CSS, shadcn/ui, Vitest, pnpm workspaces.

## Global constraints

- Source precedence is assignment, approved proposal, accepted ADRs, derived
  documents, then code/tests.
- Do not edit `docs/source/`.
- The Step 2 required types are exactly `PROBLEM`, `RESEARCH_QUESTION`, `GAP`,
  `CONTRIBUTION`, `CLAIM`, `EVIDENCE`, `CONSTRAINT`, and `OPEN_QUESTION`.
- `RISK` remains supported but optional; it cannot substitute for `EVIDENCE`.
- A Step 2 `EVIDENCE` card states what evidence would be needed. It is not a
  paper, citation, source span, measured result, or verified support.
- AI output may use only AI-authorized statuses. Only a user action may create
  `USER_CONFIRMED` or `USER_REJECTED`; assignment wording `CONFIRMED` maps to
  internal `USER_CONFIRMED`.
- Do not add literature discovery, related-work synthesis, corpus gap/novelty
  assessment, experiment planning, graph visualization, authentication redesign,
  database migration, or optimistic concurrency.
- Do not add a new dependency. Web component verification uses pure model tests,
  typecheck/build, and a browser smoke test because React Testing Library and
  Playwright are not currently part of the workspace.
- Preserve the existing tRPC initialization and `createContextInner` path.
- Preserve unrelated worktree changes, especially the user-owned `.gitignore`
  modification.
- Commit commands below are implementation checkpoints. Run them only after the
  user explicitly authorizes commits.

## Requirement-to-task map

| Requirement                                   | Implementation task |
| --------------------------------------------- | ------------------- |
| SD-01 confirmation gate                       | Task 5              |
| SD-02 all eight types and honest placeholders | Tasks 1, 2, 5       |
| SD-03 status authority                        | Tasks 1, 4, 5       |
| SD-04 edit/confirm/reject                     | Tasks 4, 7, 8       |
| SD-05 relation create/delete validation       | Tasks 4, 7, 8       |
| SD-06 explainable deterministic warnings      | Task 3              |
| SD-07 evidence boundary                       | Tasks 2, 3, 8       |
| SD-08 atomic regeneration                     | Tasks 4, 5          |
| SD-09 complete local fixture                  | Task 7              |
| SD-10 coverage/readiness signal               | Tasks 6, 8          |

---

### Task 1: Establish one shared Step 2 type contract

**Files:**

- Modify: `packages/schemas/package.json`
- Modify: `packages/schemas/src/spec-graph.ts`
- Modify: `packages/schemas/src/__tests__/decomposition.test.ts`
- Modify: `packages/schemas/src/__tests__/fixtures.test.ts`
- Modify: `packages/schemas/src/__fixtures__/decomposition-output.ts`
- Create: `packages/schemas/src/__fixtures__/index.ts`

**Interfaces:**

```ts
export const STEP2_REQUIRED_NODE_TYPES = [
  "PROBLEM",
  "RESEARCH_QUESTION",
  "GAP",
  "CONTRIBUTION",
  "CLAIM",
  "EVIDENCE",
  "CONSTRAINT",
  "OPEN_QUESTION",
] as const satisfies readonly SpecNodeType[];

export const Step2RequiredNodeTypeSchema = z.enum(STEP2_REQUIRED_NODE_TYPES);
export type Step2RequiredNodeType = z.infer<typeof Step2RequiredNodeTypeSchema>;
```

- [x] **Step 1: Add a failing contract test for the exact list**

```ts
import { STEP2_REQUIRED_NODE_TYPES } from "../spec-graph";

it("publishes the assignment Step 2 required node types", () => {
  expect(STEP2_REQUIRED_NODE_TYPES).toEqual([
    "PROBLEM",
    "RESEARCH_QUESTION",
    "GAP",
    "CONTRIBUTION",
    "CLAIM",
    "EVIDENCE",
    "CONSTRAINT",
    "OPEN_QUESTION",
  ]);
  expect(STEP2_REQUIRED_NODE_TYPES).not.toContain("RISK");
});
```

- [x] **Step 2: Run the targeted test and observe the missing export**

Run:

```bash
pnpm --filter @specloop/schemas exec vitest run src/__tests__/decomposition.test.ts
```

Expected: FAIL because `STEP2_REQUIRED_NODE_TYPES` is not exported.

- [x] **Step 3: Add the constant, schema, and inferred type**

Place the interface block directly after `SpecNodeType` in `spec-graph.ts`.
`packages/schemas/src/index.ts` already re-exports `./spec-graph`, so no second
list or manual export is needed.

- [x] **Step 4: Make the shared decomposition fixture prove full coverage**

Keep one node for every required type and keep the optional `RISK` example.
Add this assertion to the fixture test section:

```ts
const fixtureTypes = new Set(
  decompositionOutputFixture.nodes.map((node) => node.type)
);

expect(STEP2_REQUIRED_NODE_TYPES.every((type) => fixtureTypes.has(type))).toBe(
  true
);
expect(fixtureTypes.has("RISK")).toBe(true);
```

Place this assertion in `fixtures.test.ts`, where the fixture is already parsed.

- [x] **Step 5: Publish a test-only fixture entry point**

Create `src/__fixtures__/index.ts`:

```ts
export { confirmedInterpretationFixture } from "./confirmed-interpretation";
export { decompositionOutputFixture } from "./decomposition-output";
```

Add a package subpath without adding fixtures to the production root export:

```json
"exports": {
  ".": "./src/index.ts",
  "./fixtures": "./src/__fixtures__/index.ts"
}
```

API tests may then import from `@specloop/schemas/fixtures`; application runtime
code must continue importing from `@specloop/schemas` only.

- [x] **Step 6: Re-run schemas tests**

Run:

```bash
pnpm --filter @specloop/schemas test
pnpm --filter @specloop/schemas typecheck
```

Expected: both commands PASS.

- [ ] **Step 7: Checkpoint commit, only with explicit authorization**

```bash
git add packages/schemas/package.json packages/schemas/src/spec-graph.ts packages/schemas/src/__tests__/decomposition.test.ts packages/schemas/src/__tests__/fixtures.test.ts packages/schemas/src/__fixtures__/decomposition-output.ts packages/schemas/src/__fixtures__/index.ts
git commit -m "feat(schemas): define step 2 required node types"
```

---

### Task 2: Make PT-02 request complete, honest decomposition output

**Files:**

- Modify: `apps/api/src/modules/spec-structure/prompt.ts`
- Create: `apps/api/src/modules/spec-structure/prompt.test.ts`
- Modify: `apps/api/src/modules/spec-structure/generator.test.ts`

**Prompt contract:**

```ts
const requiredTypeInstruction = STEP2_REQUIRED_NODE_TYPES.join(", ");

const boundaryInstruction = [
  "Return at least one node for every required type.",
  "If the confirmed interpretation lacks content for a required type, emit a MISSING or AMBIGUOUS placeholder with a reason instead of inventing content.",
  "An EVIDENCE node describes evidence needed to evaluate a claim; it must not invent papers, citations, source spans, measured results, or verified support.",
  "RISK is optional and does not replace EVIDENCE.",
].join(" ");
```

- [x] **Step 1: Add prompt tests that fail against the current preference list**

```ts
import { STEP2_REQUIRED_NODE_TYPES } from "@specloop/schemas";
import { buildDecompositionPrompt } from "./prompt.js";

it("requires every assignment Step 2 type", () => {
  const prompt = buildDecompositionPrompt(input);
  for (const type of STEP2_REQUIRED_NODE_TYPES) {
    expect(prompt).toContain(type);
  }
  expect(prompt).toContain("at least one node for every required type");
});

it("defines evidence as a requirement and forbids fabricated research", () => {
  const prompt = buildDecompositionPrompt(input);
  expect(prompt).toContain("evidence needed");
  expect(prompt).toContain("must not invent papers");
  expect(prompt).toContain("RISK is optional");
});
```

Import the confirmed interpretation from `@specloop/schemas/fixtures` to
construct `input`; do not duplicate a second interpretation object in this test
file.

- [x] **Step 2: Run the prompt test and observe missing instructions**

```bash
pnpm --filter @specloop/api exec vitest run src/modules/spec-structure/prompt.test.ts
```

Expected: FAIL because the current prompt prefers `RISK`, omits required
`EVIDENCE`, and does not require full coverage.

- [x] **Step 3: Build PT-02 from the shared constant**

Import `STEP2_REQUIRED_NODE_TYPES`, remove the local preferred-type sentence,
and insert `requiredTypeInstruction` and `boundaryInstruction` into the prompt.
Keep the existing constraints and confirmed decisions sections unchanged.

- [x] **Step 4: Add generator acceptance and rejection tests**

Add one test in which the model returns the shared full fixture and assert:

```ts
expect(
  STEP2_REQUIRED_NODE_TYPES.every((type) =>
    output.nodes.some((node) => node.type === type)
  )
).toBe(true);
expect(
  output.nodes.find((node) => node.type === "EVIDENCE")?.sourceRefs
).toEqual([]);
```

Add one test in which the adapter omits `EVIDENCE`; assert generation rejects the
output with `DecompositionValidationError` rather than silently accepting an
incomplete graph. The validation belongs after Zod parsing and before returning
the output:

```ts
const missingTypes = STEP2_REQUIRED_NODE_TYPES.filter(
  (type) => !parsed.nodes.some((node) => node.type === type)
);
if (missingTypes.length > 0) {
  throw new DecompositionValidationError(
    `Generated decomposition omitted required types: ${missingTypes.join(", ")}.`
  );
}
```

- [x] **Step 5: Run prompt and generator tests**

```bash
pnpm --filter @specloop/api exec vitest run src/modules/spec-structure/prompt.test.ts src/modules/spec-structure/generator.test.ts
```

Expected: PASS; an incomplete adapter response is rejected, while a complete
response containing honest placeholders is accepted.

- [ ] **Step 6: Checkpoint commit, only with explicit authorization**

```bash
git add apps/api/src/modules/spec-structure/prompt.ts apps/api/src/modules/spec-structure/prompt.test.ts apps/api/src/modules/spec-structure/generator.test.ts
git commit -m "feat(api): require complete step 2 decomposition"
```

---

### Task 3: Correct deterministic warnings and evidence semantics

**Files:**

- Modify: `apps/api/src/modules/spec-structure/status-rules.ts`
- Modify: `apps/api/src/modules/spec-structure/status-rules.test.ts`
- Modify: `apps/api/src/modules/spec-structure/in-memory-store.ts`
- Modify: `apps/api/src/modules/spec-structure/in-memory-store.test.ts`

**Rule-node contract:**

```ts
type RuleNode = {
  projectId: string;
  clientRef: string;
  type: SpecNodeType;
  status: PersistedNodeStatus;
  sourceRefs: readonly string[];
};
```

`DecompositionNode` statuses are a subset of `PersistedNodeStatus`, so generated
output and persisted graph nodes can both satisfy this shape.

- [x] **Step 1: Replace the test-local required list with the shared list**

Add tests proving:

```ts
it("warns when EVIDENCE is absent even when optional RISK exists", () => {
  const graph = graphWithRequiredTypesExcept("EVIDENCE", { includeRisk: true });
  const warnings = calculateDeterministicWarnings(graph);
  expect(warnings).toContainEqual(
    expect.objectContaining({ code: "MISSING", targetType: "EVIDENCE" })
  );
  expect(warnings).not.toContainEqual(
    expect.objectContaining({ code: "MISSING", targetType: "RISK" })
  );
});

it("does not treat a Step 2 evidence requirement as verified claim support", () => {
  const warnings = calculateDeterministicWarnings(
    graphWithClaimAndEvidenceRequirement({ relation: "SUPPORTED_BY" })
  );
  expect(warnings).toContainEqual(
    expect.objectContaining({ code: "UNSUPPORTED", targetClientRef: "claim-1" })
  );
});
```

Also retain tests for ambiguity preservation, ordered-pair conflict detection,
and warning priority.

- [x] **Step 2: Run the rule tests and observe both regressions**

```bash
pnpm --filter @specloop/api exec vitest run src/modules/spec-structure/status-rules.test.ts
```

Expected: FAIL because the current rule requires `RISK`, omits `EVIDENCE`, and
accepts any `SUPPORTED_BY` relation as support.

- [x] **Step 3: Implement shared required types and verified-support logic**

Import `STEP2_REQUIRED_NODE_TYPES`, remove the local list, and use this helper:

```ts
function relationProvidesSupport(
  relation: RuleGraph["relations"][number],
  nodeByRef: ReadonlyMap<string, RuleNode>
): boolean {
  if (relation.type === "TESTED_BY") return true;
  if (relation.type !== "SUPPORTED_BY") return false;

  const target = nodeByRef.get(relation.targetClientRef);
  return (
    target?.type === "EVIDENCE" &&
    target.sourceRefs.length > 0 &&
    (target.status === "USER_CONFIRMED" || target.status === "SYSTEM_VERIFIED")
  );
}
```

Use it only for outgoing relations from the claim. A bare Step 2 evidence
requirement remains an `UNSUPPORTED` warning. A planned `TESTED_BY` relation may
clear that warning because it explicitly records how the claim will be tested.

- [x] **Step 4: Pass status and sourceRefs from the store to the rule engine**

Change the persisted relation graph projection to:

```ts
nodes: view.nodes.map((node) => ({
  projectId: node.projectId,
  clientRef: node.clientRef,
  type: node.type,
  status: node.status,
  sourceRefs: node.sourceRefs,
})),
```

Add a store test proving that creating `SUPPORTED_BY` to an unverified evidence
requirement does not silently move a claim from `UNSUPPORTED` to `PROPOSED`.

- [x] **Step 5: Run rule and store tests**

```bash
pnpm --filter @specloop/api exec vitest run src/modules/spec-structure/status-rules.test.ts src/modules/spec-structure/in-memory-store.test.ts
```

Expected: PASS with missing evidence, optional risk, support, conflict, status,
and history behavior all covered.

- [ ] **Step 6: Checkpoint commit, only with explicit authorization**

```bash
git add apps/api/src/modules/spec-structure/status-rules.ts apps/api/src/modules/spec-structure/status-rules.test.ts apps/api/src/modules/spec-structure/in-memory-store.ts apps/api/src/modules/spec-structure/in-memory-store.test.ts
git commit -m "fix(api): align step 2 integrity rules with assignment"
```

---

### Task 4: Make edit lifecycle errors explicit and regeneration atomic

**Files:**

- Modify: `apps/api/src/modules/spec-structure/errors.ts`
- Modify: `apps/api/src/modules/spec-structure/in-memory-store.ts`
- Modify: `apps/api/src/modules/spec-structure/in-memory-store.test.ts`
- Modify: `apps/api/src/routers/decomposition.ts`
- Modify: `apps/api/src/routers/decomposition.test.ts`
- Modify: `apps/api/src/modules/spec-structure/spec-structure-module.test.ts`

**New error:**

```ts
export class SpecGraphConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecGraphConflictError";
  }
}
```

- [x] **Step 1: Add failing lifecycle tests**

Cover these cases:

1. self-relation throws `SpecGraphConflictError`;
2. duplicate relation throws `SpecGraphConflictError`;
3. unknown graph/node/relation remains `NOT_FOUND`;
4. malformed input remains `BAD_REQUEST`;
5. user status transitions append `USER` authority history;
6. failed regeneration leaves the previous graph unchanged;
7. successful regeneration replaces the whole graph and its generation history,
   with no mixture of old and new nodes.

Router assertions for conflicts must use:

```ts
await expect(caller.createRelation(input)).rejects.toMatchObject({
  code: "CONFLICT",
});
```

- [x] **Step 2: Run the store, module, and router tests**

```bash
pnpm --filter @specloop/api exec vitest run src/modules/spec-structure/in-memory-store.test.ts src/modules/spec-structure/spec-structure-module.test.ts src/routers/decomposition.test.ts
```

Expected: FAIL because edit conflicts currently map to `BAD_REQUEST`, and atomic
replacement is not yet asserted.

- [x] **Step 3: Separate malformed edits from lifecycle conflicts**

Throw `SpecGraphConflictError` for self-relations and exact duplicate relations.
Keep Zod parse failures and invalid status transitions as
`SpecGraphEditValidationError`.

Map the new domain error in the router:

```ts
if (error instanceof SpecGraphConflictError) {
  throw new TRPCError({
    code: "CONFLICT",
    message: error.message,
    cause: error,
  });
}
```

Do not alter the tRPC router instance, middleware, or context construction.

- [x] **Step 4: Preserve atomic generation ordering**

In `SpecStructureModule.generate`, keep this sequence:

1. read latest confirmed interpretation;
2. generate and validate the complete output in memory;
3. apply deterministic rules;
4. call `saveGeneratedGraph` once;
5. return the newly persisted graph.

Do not clear or mutate the old graph before generation and validation succeed.
The module test must spy on `saveGeneratedGraph` and assert it is not called when
the generator rejects output.

- [x] **Step 5: Re-run targeted tests**

```bash
pnpm --filter @specloop/api exec vitest run src/modules/spec-structure/in-memory-store.test.ts src/modules/spec-structure/spec-structure-module.test.ts src/routers/decomposition.test.ts
```

Expected: PASS with tRPC codes `BAD_REQUEST`, `PRECONDITION_FAILED`, `NOT_FOUND`,
`CONFLICT`, and `INTERNAL_SERVER_ERROR` covered.

- [ ] **Step 6: Checkpoint commit, only with explicit authorization**

```bash
git add apps/api/src/modules/spec-structure/errors.ts apps/api/src/modules/spec-structure/in-memory-store.ts apps/api/src/modules/spec-structure/in-memory-store.test.ts apps/api/src/modules/spec-structure/spec-structure-module.test.ts apps/api/src/routers/decomposition.ts apps/api/src/routers/decomposition.test.ts
git commit -m "fix(api): enforce step 2 graph lifecycle invariants"
```

---

### Task 5: Prove the Step 1 to Step 2 vertical slice

**Files:**

- Modify: `apps/api/src/integration/step1-step2.test.ts`
- Modify: `apps/api/src/modules/spec-structure/decomposition-service.test.ts`
- Modify: `apps/api/src/modules/spec-structure/interpretation-reader-adapter.test.ts`

- [x] **Step 1: Replace the two-node integration output with the shared complete fixture**

Import `decompositionOutputFixture` from `@specloop/schemas/fixtures`, then copy
it with the integration project's runtime ID:

```ts
function completeOutput(projectId: string): DecompositionOutput {
  return {
    ...decompositionOutputFixture,
    projectId,
    nodes: decompositionOutputFixture.nodes.map((node) => ({
      ...node,
      projectId,
    })),
    relations: decompositionOutputFixture.relations.map((relation) => ({
      ...relation,
      projectId,
    })),
  };
}
```

This preserves one canonical content fixture while satisfying project ownership
validation for the project created inside the integration test.

- [x] **Step 2: Add the gate and full-coverage assertions**

```ts
await expect(
  unconfirmedCaller.decomposition.generate({ projectId })
).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

const graph = await confirmedCaller.decomposition.generate({ projectId });
expect(
  STEP2_REQUIRED_NODE_TYPES.every((type) =>
    graph.nodes.some((node) => node.type === type)
  )
).toBe(true);
expect(graph.nodes.some((node) => node.type === "EVIDENCE")).toBe(true);
```

Then edit a node, confirm it, create and delete a relation, and assert every
returned graph passes `SpecGraphViewSchema.parse`.

Use the two existing fixture refs so the lifecycle test is deterministic:

```ts
const related = await caller.decomposition.createRelation({
  projectId: project.id,
  sourceClientRef: "contribution-1",
  targetClientRef: "problem-1",
  type: "ADDRESSES",
});
const created = related.relations.find(
  (relation) =>
    relation.type === "ADDRESSES" &&
    related.nodes.find((node) => node.id === relation.sourceNodeId)
      ?.clientRef === "contribution-1"
);
expect(created).toBeDefined();

const afterDelete = await caller.decomposition.deleteRelation({
  projectId: project.id,
  relationId: created!.id,
});
expect(afterDelete.relations).not.toContainEqual(
  expect.objectContaining({ id: created!.id })
);
```

- [x] **Step 3: Add authority assertions**

```ts
const generatedHistory = graph.statusHistory.filter(
  (entry) => entry.fromStatus === null
);
expect(generatedHistory.every((entry) => entry.authority === "AI")).toBe(true);

const confirmed = await caller.decomposition.changeStatus({
  projectId,
  clientRef: "problem-1",
  toStatus: "USER_CONFIRMED",
  reason: "Confirmed after review.",
});
expect(confirmed.statusHistory.at(-1)).toMatchObject({
  toStatus: "USER_CONFIRMED",
  actor: "USER",
  authority: "USER",
});
```

- [x] **Step 4: Run the integration and adapter tests**

```bash
pnpm --filter @specloop/api exec vitest run src/integration/step1-step2.test.ts src/modules/spec-structure/decomposition-service.test.ts src/modules/spec-structure/interpretation-reader-adapter.test.ts
```

Expected: PASS; unconfirmed interpretation is blocked and the confirmed path
returns a schema-valid, complete, editable graph.

- [ ] **Step 5: Checkpoint commit, only with explicit authorization**

```bash
git add apps/api/src/integration/step1-step2.test.ts apps/api/src/modules/spec-structure/decomposition-service.test.ts apps/api/src/modules/spec-structure/interpretation-reader-adapter.test.ts
git commit -m "test(api): cover complete step 2 vertical slice"
```

---

### Task 6: Add pure coverage, filter, ordering, and readiness models

**Files:**

- Modify: `apps/web/src/components/workflow/workflow-model.ts`
- Modify: `apps/web/src/components/workflow/workflow-model.test.ts`

**Interfaces:**

```ts
export type Step2CoverageItem = {
  type: Step2RequiredNodeType;
  count: number;
  state: "PRESENT" | "MISSING";
};

export type Step2NodeFilters = {
  type: SpecNodeType | "ALL";
  status: PersistedNodeStatus | "ALL";
};

export type Step2Readiness = {
  ready: boolean;
  unresolvedRequiredTypes: Step2RequiredNodeType[];
  unresolvedNodeRefs: string[];
  unsupportedClaimCount: number;
};
```

- [x] **Step 1: Add failing tests for coverage**

```ts
expect(buildStep2Coverage(completeGraph)).toEqual(
  STEP2_REQUIRED_NODE_TYPES.map((type) => ({
    type,
    count: completeGraph.nodes.filter((node) => node.type === type).length,
    state: "PRESENT",
  }))
);
```

Add a graph with `RISK` but no `EVIDENCE`; assert evidence is `MISSING` and risk
does not appear in the coverage strip.

- [x] **Step 2: Add failing tests for filter and stable ordering**

The ordered groups are the eight required types in assignment order, followed by
all optional types in `SpecNodeTypeSchema.options` order. Within a type, preserve
the graph node order. Test `ALL`, exact type, exact status, and combined filters.

- [x] **Step 3: Add failing tests for readiness**

Readiness is false when any required type is absent, or any node has one of:
`NEEDS_REVIEW`, `MISSING`, `AMBIGUOUS`, `UNSUPPORTED`, `CONFLICT`. Rejected nodes
remain visible but do not make the graph ready. At least one non-rejected card
must exist for every required type.

```ts
const unresolvedStatuses = new Set<PersistedNodeStatus>([
  "NEEDS_REVIEW",
  "MISSING",
  "AMBIGUOUS",
  "UNSUPPORTED",
  "CONFLICT",
]);
```

- [x] **Step 4: Run the model tests and observe missing functions**

```bash
pnpm --filter @specloop/web exec vitest run src/components/workflow/workflow-model.test.ts
```

Expected: FAIL because the new models are not exported.

- [x] **Step 5: Implement the pure functions**

```ts
export function buildStep2Coverage(graph: SpecGraphView): Step2CoverageItem[] {
  return STEP2_REQUIRED_NODE_TYPES.map((type) => {
    const count = graph.nodes.filter(
      (node) => node.type === type && node.status !== "USER_REJECTED"
    ).length;
    return { type, count, state: count > 0 ? "PRESENT" : "MISSING" };
  });
}
```

Implement stable filtering without mutating its input:

```ts
export function filterAndSortNodeReviewRows(
  rows: readonly NodeReviewRow[],
  filters: Step2NodeFilters
): NodeReviewRow[] {
  const typeOrder = new Map(
    [
      ...STEP2_REQUIRED_NODE_TYPES,
      ...SpecNodeTypeSchema.options.filter(
        (type) =>
          !STEP2_REQUIRED_NODE_TYPES.includes(type as Step2RequiredNodeType)
      ),
    ].map((type, index) => [type, index])
  );

  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => filters.type === "ALL" || row.type === filters.type)
    .filter(
      ({ row }) => filters.status === "ALL" || row.status === filters.status
    )
    .sort(
      (left, right) =>
        (typeOrder.get(left.row.type) ?? Number.MAX_SAFE_INTEGER) -
          (typeOrder.get(right.row.type) ?? Number.MAX_SAFE_INTEGER) ||
        left.index - right.index
    )
    .map(({ row }) => row);
}
```

Derive readiness only from the graph:

```ts
export function calculateStep2Readiness(graph: SpecGraphView): Step2Readiness {
  const coverage = buildStep2Coverage(graph);
  const unresolvedNodeRefs = graph.nodes
    .filter((node) => unresolvedStatuses.has(node.status))
    .map((node) => node.clientRef);
  const unresolvedRequiredTypes = coverage
    .filter((item) => item.state === "MISSING")
    .map((item) => item.type);
  const unsupportedClaimCount = graph.nodes.filter(
    (node) => node.type === "CLAIM" && node.status === "UNSUPPORTED"
  ).length;

  return {
    ready:
      unresolvedRequiredTypes.length === 0 && unresolvedNodeRefs.length === 0,
    unresolvedRequiredTypes,
    unresolvedNodeRefs,
    unsupportedClaimCount,
  };
}
```

Both functions return serializable values; React state is not consulted.

- [x] **Step 6: Run web model tests and typecheck**

```bash
pnpm --filter @specloop/web exec vitest run src/components/workflow/workflow-model.test.ts
pnpm --filter @specloop/web typecheck
```

Expected: PASS.

- [ ] **Step 7: Checkpoint commit, only with explicit authorization**

```bash
git add apps/web/src/components/workflow/workflow-model.ts apps/web/src/components/workflow/workflow-model.test.ts
git commit -m "feat(web): derive step 2 coverage and readiness"
```

---

### Task 7: Replace the incomplete local fixture and complete status styling

**Files:**

- Modify: `apps/web/src/components/workflow/local-fixtures.ts`
- Modify: `apps/web/src/components/workflow/workflow-model.test.ts`
- Modify: `apps/web/src/components/workflow/section-card.tsx`

- [x] **Step 1: Add a failing local-fixture contract test**

```ts
const fixture = cloneLocalGraph();
expect(SpecGraphViewSchema.parse(fixture)).toEqual(fixture);
expect(
  STEP2_REQUIRED_NODE_TYPES.every((type) =>
    fixture.nodes.some((node) => node.type === type)
  )
).toBe(true);
```

Also assert it contains at least one editable relation, one warning, and status
history entries with `AI`, `USER`, and `SYSTEM` authority so all UI regions can
be inspected without a backend.

- [x] **Step 2: Run the model test and observe the four-node fixture failure**

```bash
pnpm --filter @specloop/web exec vitest run src/components/workflow/workflow-model.test.ts
```

Expected: FAIL because the current local graph omits required types.

- [x] **Step 3: Expand `LOCAL_STEP2_GRAPH`**

Create at least these client refs with realistic, explicitly provisional text:

| clientRef         | type                | initial status   |
| ----------------- | ------------------- | ---------------- |
| `problem-1`       | `PROBLEM`           | `USER_CONFIRMED` |
| `question-1`      | `RESEARCH_QUESTION` | `PROPOSED`       |
| `gap-1`           | `GAP`               | `AMBIGUOUS`      |
| `contribution-1`  | `CONTRIBUTION`      | `NEEDS_REVIEW`   |
| `claim-1`         | `CLAIM`             | `UNSUPPORTED`    |
| `evidence-1`      | `EVIDENCE`          | `PROPOSED`       |
| `constraint-1`    | `CONSTRAINT`        | `PROPOSED`       |
| `open-question-1` | `OPEN_QUESTION`     | `MISSING`        |
| `risk-1`          | `RISK`              | `PROPOSED`       |

The evidence card must have `sourceRefs: []` and content phrased as an evidence
requirement. Include no title, DOI, citation, result, or novelty conclusion.

- [x] **Step 4: Add all persisted statuses to `StatusPill` styling**

Ensure the style map explicitly covers `CONFLICT`, `USER_REJECTED`, and
`SUPERSEDED` as well as all existing values. Type the map with:

```ts
const statusStyles = {
  // every PersistedNodeStatus key appears exactly once
} satisfies Record<PersistedNodeStatus, string>;
```

- [x] **Step 5: Re-run web model test and typecheck**

```bash
pnpm --filter @specloop/web exec vitest run src/components/workflow/workflow-model.test.ts
pnpm --filter @specloop/web typecheck
```

Expected: PASS, with TypeScript proving exhaustive status styling.

- [ ] **Step 6: Checkpoint commit, only with explicit authorization**

```bash
git add apps/web/src/components/workflow/local-fixtures.ts apps/web/src/components/workflow/workflow-model.test.ts apps/web/src/components/workflow/section-card.tsx
git commit -m "fix(web): complete step 2 review fixture"
```

---

### Task 8: Recompose Step 2 into the assignment-aligned review screen

**Files:**

- Create: `apps/web/src/components/workflow/step2/step2-overview.tsx`
- Create: `apps/web/src/components/workflow/step2/node-review-list.tsx`
- Create: `apps/web/src/components/workflow/step2/node-review-card.tsx`
- Create: `apps/web/src/components/workflow/step2/warnings-panel.tsx`
- Create: `apps/web/src/components/workflow/step2/relations-editor.tsx`
- Create: `apps/web/src/components/workflow/step2/status-history-panel.tsx`
- Create: `apps/web/src/components/workflow/step2/step2-handoff.tsx`
- Modify: `apps/web/src/components/workflow/step2-workspace.tsx`

**Ownership:**

| Component            | Responsibility                                                                        |
| -------------------- | ------------------------------------------------------------------------------------- |
| `Step2Overview`      | boundary notice, four summary metrics, eight-type coverage strip, type/status filters |
| `NodeReviewList`     | filtered empty state and responsive card grid                                         |
| `NodeReviewCard`     | content display/edit, reason, source count, confirm/reject actions                    |
| `WarningsPanel`      | explainable code, target, reason, suggested action                                    |
| `RelationsEditor`    | create/delete relation controls and local validation messages                         |
| `StatusHistoryPanel` | chronological actor/authority/status trail                                            |
| `Step2Handoff`       | readiness blockers or enabled transition to Step 3                                    |
| `Step2Workspace`     | tRPC/local-fixture data ownership and mutation orchestration only                     |

- [x] **Step 1: Define narrow props before moving JSX**

```ts
export type NodeReviewCardProps = {
  row: NodeReviewRow;
  busy: boolean;
  onSave: (input: {
    clientRef: string;
    title: string;
    content: string;
    reason: string | null;
  }) => void;
  onConfirm: (clientRef: string, reason: string) => void;
  onReject: (clientRef: string, reason: string) => void;
};

export type Step2OverviewProps = {
  graph: SpecGraphView;
  filters: Step2NodeFilters;
  onFiltersChange: (filters: Step2NodeFilters) => void;
};
```

Callbacks receive domain inputs, not tRPC mutation objects. Child components do
not import `trpc` and do not own server state.

- [x] **Step 2: Implement the top-of-page information order**

Render, in order:

1. heading `2. Structured decomposition`;
2. boundary alert stating that this screen structures the confirmed idea and
   does not claim literature-backed evidence or novelty;
3. metrics for typed nodes, unresolved cards, warnings, relations;
4. eight required-type coverage chips with count and missing state;
5. accessible type and status filters.

The local development badge remains visible only when fixture mode is active.

- [x] **Step 3: Implement the responsive review-card region**

Use one column on small screens and two columns from `lg`. Every card must show
type, current status, title, content, reason when present, and source count.
Editing keeps the existing title/content validation. Confirm and reject require
a non-empty reason and call only the supplied callbacks.

Keep statuses visible after user actions; do not remove rejected cards from the
review list. The coverage and readiness models decide whether a rejected card
satisfies a required type.

- [x] **Step 4: Implement warnings, relations, and history below cards**

Warnings must show all four codes and their `suggestedAction`. Relation creation
must prevent empty endpoints and surface router `BAD_REQUEST`, `NOT_FOUND`, or
`CONFLICT` messages in the relations section. History displays newest first but
does not mutate the graph array:

```ts
const newestFirst = [...graph.statusHistory].sort((a, b) =>
  b.occurredAt.localeCompare(a.occurredAt)
);
```

- [x] **Step 5: Implement conditional handoff**

When `readiness.ready` is false, render each missing required type and unresolved
card reference. When true, render the existing navigation action to Step 3.
Label it as continuing to literature/evidence work; do not imply that Step 2 has
already verified evidence.

- [x] **Step 6: Reduce `Step2Workspace` to orchestration**

The workspace retains:

- fixture/API query selection;
- mutation definitions and cache replacement;
- selected filters and operation-specific pending/error state;
- callback adaptation for child components;
- composition of the focused sections.

Remove presentation helpers that moved to children. Preserve the existing route
and project/fixture query semantics.

- [x] **Step 7: Run web verification**

```bash
pnpm --filter @specloop/web test
pnpm --filter @specloop/web typecheck
pnpm --filter @specloop/web build
```

Expected: PASS. The build must contain the existing decomposition route and no
new client/server boundary error.

- [ ] **Step 8: Checkpoint commit, only with explicit authorization**

```bash
git add apps/web/src/components/workflow/step2 apps/web/src/components/workflow/step2-workspace.tsx
git commit -m "feat(web): align step 2 review workspace with assignment"
```

---

### Task 9: Browser smoke test and evidence-based progress update

**Files:**

- Modify: `.agents/agent-docs/implementation-progress.md`
- Modify: `.agents/agent-docs/step-2-implementation-plan.md`

- [x] **Step 1: Start the existing development processes**

Use only scripts already present in the workspace. If the API and web apps need
separate terminals, run their existing `dev` scripts. Do not invent a combined
script if one is absent.

Observed: the worktree web app was started with the existing web dev script on
port 3010. The API-backed dev process was not started because this worktree has
no `apps/api/.env` and the API requires `OPENAI_API_KEY`.

- [x] **Step 2: Open the fixture route and verify the complete screen**

Open:

```text
http://localhost:3000/projects/new?fixture=1
```

Navigate to Step 2 and verify:

1. heading and boundary notice are visible;
2. all eight required coverage chips are present;
3. the nine-card fixture includes optional risk and required evidence;
4. evidence text is a requirement, not a fabricated source/result;
5. type and status filters update the visible cards;
6. edit, confirm, and reject update status/history in fixture mode;
7. relation create/delete works and self/duplicate errors remain local;
8. warnings show reason and suggested action;
9. readiness blockers are explicit;
10. at 390px width, no horizontal page overflow occurs and actions remain usable.

Capture screenshots only as observed evidence; do not add generated mockups as
proof of implementation.

- [ ] **Step 3: Exercise the API-backed route when the local stack is available**

Verify the same actions against a confirmed project. Also verify an unconfirmed
project receives the confirmation precondition message. If required external
configuration is absent, record that API-backed browser verification was not run
and rely only on completed automated integration tests.

- [ ] **Step 4: Run full workspace verification**

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm format:check
git diff --check
```

Expected: every command PASS. Do not report lint success because current lint
scripts are placeholders rather than an implemented lint check.

- [x] **Step 5: Update progress using observed results only**

In `implementation-progress.md`:

- link this plan and the approved design;
- change Step 2 acceptance items only when their named test/build/browser check
  has actually passed;
- record exact commands and observed outcomes;
- keep unavailable browser/API checks marked unverified;
- do not mark literature, database persistence, or later workflow steps complete.

- [ ] **Step 6: Mark this plan complete only after all required evidence exists**

Check completed boxes in this file as work lands. Leave any unrun browser check
unchecked with a one-line reason. Completion requires the full automated command
set plus the fixture browser smoke test.

- [ ] **Step 7: Final checkpoint commit, only with explicit authorization**

```bash
git add .agents/agent-docs/implementation-progress.md .agents/agent-docs/step-2-implementation-plan.md
git commit -m "docs: record step 2 verification evidence"
```

## Final acceptance checklist

- [x] Generation is blocked until the latest interpretation is user-confirmed.
- [x] Every accepted generated graph contains all eight required assignment types.
- [x] Missing information appears as a reviewable `MISSING`/`AMBIGUOUS` card,
      never invented content.
- [x] Optional `RISK` does not replace required `EVIDENCE`.
- [x] A Step 2 evidence requirement does not count as verified claim support.
- [x] Users can edit cards, confirm/reject them, and create/delete valid relations.
- [x] Warning reasons, suggested actions, status authority, and history are visible.
- [x] Coverage, filters, and readiness make review completeness explicit.
- [x] Fixture and API paths use the same graph contract and core UI behavior.
- [ ] Targeted tests, full tests, typecheck, build, formatting, and diff checks pass.
- [x] Fixture browser smoke passes on desktop and 390px viewport.
- [x] Progress documentation contains only observed implementation evidence.
