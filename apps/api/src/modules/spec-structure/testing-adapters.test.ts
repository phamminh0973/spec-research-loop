import { describe, expect, it } from "vitest";

import type {
  ConfirmedInterpretationSnapshot,
  DecompositionOutput,
} from "@specloop/schemas";
import {
  DeterministicConfirmedInterpretationReader,
  DeterministicDecompositionGenerator,
  InMemorySpecGraphRepository,
} from "./testing-adapters.js";

const projectId = "00000000-0000-4000-8000-000000000001";
const otherProjectId = "00000000-0000-4000-8000-000000000099";

const interpretation: ConfirmedInterpretationSnapshot = {
  interpretationId: "00000000-0000-4000-8000-000000000002",
  projectId,
  simpleInterpretation: "A confirmed interpretation for adapter tests.",
  technicalInterpretation: "A confirmed interpretation for adapter tests.",
  assumptions: [],
  objectives: ["Exercise deterministic adapters."],
  ambiguities: [],
  confirmedDecisions: [{ kind: "CONFIRM" }],
  constraints: [],
  status: "USER_CONFIRMED",
  confirmedAt: "2026-08-11T00:00:00Z",
};

const graph: DecompositionOutput = {
  projectId,
  nodes: [
    {
      projectId,
      clientRef: "problem-1",
      type: "PROBLEM",
      title: "Problem",
      content: "A bounded problem.",
      status: "PROPOSED",
      sourceRefs: [],
    },
    {
      projectId,
      clientRef: "question-1",
      type: "RESEARCH_QUESTION",
      title: "Question",
      content: "A bounded question.",
      status: "PROPOSED",
      sourceRefs: [],
    },
  ],
  relations: [],
  warnings: [],
};

describe("deterministic Step 2 adapters", () => {
  it("reads only the requested confirmed project and returns deterministic output", async () => {
    const reader = new DeterministicConfirmedInterpretationReader([
      interpretation,
    ]);
    const generator = new DeterministicDecompositionGenerator(() => graph);

    await expect(reader.getConfirmedByProject(projectId)).resolves.toEqual(
      interpretation
    );
    await expect(
      reader.getConfirmedByProject(otherProjectId)
    ).resolves.toBeNull();
    await expect(
      generator.generate({
        projectId,
        confirmedInterpretation: interpretation,
        confirmedDecisions: interpretation.confirmedDecisions,
        constraints: interpretation.constraints,
      })
    ).resolves.toEqual(graph);
  });

  it("converts a generated graph into an editable persisted view", async () => {
    const repository = new InMemorySpecGraphRepository();

    await repository.saveGeneratedGraph(graph);
    const view = await repository.getByProject(projectId);

    expect(view).not.toBeNull();
    if (!view) throw new Error("Expected a persisted graph.");
    expect(view?.nodes).toHaveLength(2);
    expect(view?.nodes[0]).toMatchObject({
      projectId,
      clientRef: "problem-1",
      status: "PROPOSED",
    });
    expect(view?.nodes[0]?.id).toEqual(expect.any(String));
    expect(view.statusHistory).toHaveLength(view.nodes.length);
    expect(view.statusHistory[0]).toMatchObject({
      actor: "AI",
      authority: "AI",
      fromStatus: null,
    });
  });

  it("rejects cross-project generated data before storing it", async () => {
    const repository = new InMemorySpecGraphRepository();
    const invalidGraph = {
      ...graph,
      nodes: graph.nodes.map((node, index) =>
        index === 0 ? { ...node, projectId: otherProjectId } : node
      ),
    };

    await expect(repository.saveGeneratedGraph(invalidGraph)).rejects.toThrow();
    await expect(repository.getByProject(projectId)).resolves.toBeNull();
  });

  it("enforces relation endpoints and records user status history atomically", async () => {
    const repository = new InMemorySpecGraphRepository();
    await repository.saveGeneratedGraph(graph);

    await expect(
      repository.createRelation({
        projectId,
        sourceClientRef: "problem-1",
        targetClientRef: "missing-1",
        type: "ADDRESSES",
      })
    ).rejects.toThrow();
    await expect(
      repository.createRelation({
        projectId,
        sourceClientRef: "problem-1",
        targetClientRef: "problem-1",
        type: "ADDRESSES",
      })
    ).rejects.toThrow();

    const withRelation = await repository.createRelation({
      projectId,
      sourceClientRef: "problem-1",
      targetClientRef: "question-1",
      type: "ADDRESSES",
    });
    expect(withRelation.relations).toHaveLength(1);

    const changed = await repository.changeStatus({
      projectId,
      clientRef: "problem-1",
      toStatus: "USER_CONFIRMED",
      reason: "The user confirmed the problem card.",
    });
    expect(
      changed.nodes.find((node) => node.clientRef === "problem-1")
    ).toMatchObject({ status: "USER_CONFIRMED" });
    expect(changed.statusHistory).toHaveLength(3);
    expect(changed.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
      actor: "USER",
      authority: "USER",
      toStatus: "USER_CONFIRMED",
        }),
      ])
    );
  });
});
