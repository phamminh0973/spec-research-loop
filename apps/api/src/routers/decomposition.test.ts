import { describe, expect, it } from "vitest";

import type { ApiContext } from "../trpc/context.js";
import { appRouter } from "./index.js";
import {
  DeterministicConfirmedInterpretationReader,
  DeterministicDecompositionGenerator,
  InMemorySpecGraphRepository,
} from "../modules/spec-structure/testing-adapters.js";
import { createSpecStructureModule } from "../modules/spec-structure/spec-structure-module.js";

const projectId = "00000000-0000-4000-8000-000000000001";

const interpretation = {
  interpretationId: "00000000-0000-4000-8000-000000000002",
  projectId,
  simpleInterpretation: "A confirmed interpretation for router tests.",
  technicalInterpretation: "A confirmed interpretation for router tests.",
  assumptions: [],
  objectives: ["Exercise the typed API."],
  ambiguities: [],
  confirmedDecisions: [{ kind: "CONFIRM" as const }],
  constraints: [],
  status: "USER_CONFIRMED" as const,
  confirmedAt: "2026-08-11T00:00:00Z",
};

const generated = {
  projectId,
  nodes: [
    {
      projectId,
      clientRef: "problem-1",
      type: "PROBLEM" as const,
      title: "Problem",
      content: "A bounded problem.",
      status: "PROPOSED" as const,
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "question-1",
      type: "RESEARCH_QUESTION" as const,
      title: "Question",
      content: "A bounded question.",
      status: "PROPOSED" as const,
      sourceRefs: [],
    },
  ],
  relations: [],
  warnings: [],
};

function contextWithModule(
  specStructure: ApiContext["specStructure"]
): ApiContext {
  return {
    requestId: "00000000-0000-4000-8000-000000000010",
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      displayName: "Router Test User",
    },
    llm: {} as ApiContext["llm"],
    llmConfig: {} as ApiContext["llmConfig"],
    specStructure,
  };
}

function makeCaller(withConfirmation = true) {
  const store = new InMemorySpecGraphRepository();
  const specStructure = createSpecStructureModule({
    reader: new DeterministicConfirmedInterpretationReader(
      withConfirmation ? [interpretation] : []
    ),
    generator: new DeterministicDecompositionGenerator(() => generated),
    store,
  });

  return {
    caller: appRouter.createCaller(contextWithModule(specStructure)),
    store,
  };
}

describe("decomposition tRPC router", () => {
  it("fails closed when Step 2 dependencies are absent", async () => {
    const caller = appRouter.createCaller(contextWithModule(undefined));

    await expect(
      caller.decomposition.byProject({ projectId })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("maps invalid procedure input to BAD_REQUEST", async () => {
    const { caller } = makeCaller();

    await expect(
      caller.decomposition.byProject({ projectId: "not-a-uuid" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("maps an absent confirmation to PRECONDITION_FAILED", async () => {
    const { caller } = makeCaller(false);

    await expect(
      caller.decomposition.generate({ projectId })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });

  it("maps missing graphs/nodes to NOT_FOUND and invalid edits to BAD_REQUEST", async () => {
    const { caller } = makeCaller();

    await expect(
      caller.decomposition.updateNode({
        projectId,
        clientRef: "problem-1",
        title: "Problem",
        content: "No graph exists yet.",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await caller.decomposition.generate({ projectId });

    await expect(
      caller.decomposition.createRelation({
        projectId,
        sourceClientRef: "problem-1",
        targetClientRef: "missing-1",
        type: "ADDRESSES",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    await expect(
      caller.decomposition.createRelation({
        projectId,
        sourceClientRef: "problem-1",
        targetClientRef: "problem-1",
        type: "ADDRESSES",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("round-trips generate, read and node edit through the typed caller", async () => {
    const { caller } = makeCaller();

    const generatedView = await caller.decomposition.generate({ projectId });
    expect(generatedView.nodes).toHaveLength(2);

    await expect(
      caller.decomposition.byProject({ projectId })
    ).resolves.toEqual(generatedView);

    const editedView = await caller.decomposition.updateNode({
      projectId,
      clientRef: "problem-1",
      title: "Edited problem",
      content: "A user-edited problem.",
      reason: "Clarified by the user.",
    });
    expect(
      editedView.nodes.find((node) => node.clientRef === "problem-1")
    ).toMatchObject({
      title: "Edited problem",
      content: "A user-edited problem.",
      reason: "Clarified by the user.",
    });
    await expect(
      caller.decomposition.byProject({ projectId })
    ).resolves.toEqual(editedView);
  });

  it("round-trips relation creation/deletion and user status history", async () => {
    const { caller } = makeCaller();
    await caller.decomposition.generate({ projectId });

    const withRelation = await caller.decomposition.createRelation({
      projectId,
      sourceClientRef: "problem-1",
      targetClientRef: "question-1",
      type: "ADDRESSES",
    });
    expect(withRelation.relations).toHaveLength(1);

    const confirmed = await caller.decomposition.changeStatus({
      projectId,
      clientRef: "problem-1",
      toStatus: "USER_CONFIRMED",
      reason: "The user confirmed the problem card.",
    });
    expect(
      confirmed.nodes.find((node) => node.clientRef === "problem-1")
    ).toMatchObject({ status: "USER_CONFIRMED" });
    expect(confirmed.statusHistory).toHaveLength(3);
    expect(confirmed.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: "USER",
          authority: "USER",
          toStatus: "USER_CONFIRMED",
        }),
      ])
    );

    const deleted = await caller.decomposition.deleteRelation({
      projectId,
      relationId: withRelation.relations[0]!.id,
    });
    expect(deleted.relations).toEqual([]);
    expect(deleted.statusHistory).toEqual(confirmed.statusHistory);
  });

  it("does not write after an invalid relation action", async () => {
    const { caller } = makeCaller();
    const initial = await caller.decomposition.generate({ projectId });

    await expect(
      caller.decomposition.createRelation({
        projectId,
        sourceClientRef: "problem-1",
        targetClientRef: "problem-1",
        type: "ADDRESSES",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    await expect(
      caller.decomposition.byProject({ projectId })
    ).resolves.toEqual(initial);
  });
});
