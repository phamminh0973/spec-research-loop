import { describe, expect, it } from "vitest";

import type { DecompositionOutput } from "@specloop/schemas";
import { applyDeterministicRules } from "./status-rules.js";
import { InMemorySpecGraphStore } from "./in-memory-store.js";

const projectId = "00000000-0000-4000-8000-000000000001";

function graph(): DecompositionOutput {
  return {
    projectId,
    nodes: [
      {
        projectId,
        clientRef: "claim-1",
        type: "CLAIM",
        title: "Claim",
        content: "A claim that needs a test.",
        status: "PROPOSED",
        sourceRefs: [],
      },
      {
        projectId,
        clientRef: "experiment-1",
        type: "EXPERIMENT",
        title: "Experiment",
        content: "A planned experiment.",
        status: "PROPOSED",
        sourceRefs: [],
      },
    ],
    relations: [],
    warnings: [],
  };
}

describe("InMemorySpecGraphStore", () => {
  it("records AI authority history for generated node statuses", async () => {
    const store = new InMemorySpecGraphStore();
    const reviewed = applyDeterministicRules(graph());

    await store.saveGeneratedGraph(reviewed);
    const view = await store.getByProject(projectId);

    expect(view).not.toBeNull();
    if (!view) throw new Error("Expected a persisted graph.");
    expect(view.statusHistory).toHaveLength(view.nodes.length);
    expect(view.statusHistory[0]).toMatchObject({
      projectId,
      fromStatus: null,
      toStatus: "UNSUPPORTED",
      actor: "AI",
      authority: "AI",
    });
  });

  it("recomputes unsupported warnings and node status after relation edits", async () => {
    const store = new InMemorySpecGraphStore();
    await store.saveGeneratedGraph(applyDeterministicRules(graph()));

    const before = await store.getByProject(projectId);
    expect(before?.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED",
          targetClientRef: "claim-1",
        }),
      ])
    );

    const after = await store.createRelation({
      projectId,
      sourceClientRef: "claim-1",
      targetClientRef: "experiment-1",
      type: "TESTED_BY",
    });

    expect(
      after.warnings.some(
        (warning) =>
          warning.code === "UNSUPPORTED" &&
          warning.targetClientRef === "claim-1"
      )
    ).toBe(false);
    expect(
      after.nodes.find((node) => node.clientRef === "claim-1")
    ).toMatchObject({ status: "PROPOSED" });
    expect(after.statusHistory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: "SYSTEM",
          authority: "SYSTEM",
          toStatus: "PROPOSED",
        }),
      ])
    );
  });
});
