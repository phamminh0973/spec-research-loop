import { beforeEach, describe, expect, it } from "vitest";

import {
  DeterministicConfirmedInterpretationReader,
  DeterministicDecompositionGenerator,
  InMemorySpecGraphRepository,
} from "./testing-adapters.js";
import { createSpecStructureModule } from "./module.js";
import { resetProjectStore } from "../../store/project-store.js";

const projectId = "00000000-0000-4000-8000-000000000001";

const interpretation = {
  interpretationId: "00000000-0000-4000-8000-000000000002",
  projectId,
  simpleInterpretation: "A confirmed interpretation for module tests.",
  technicalInterpretation: "A confirmed interpretation for module tests.",
  assumptions: [],
  objectives: ["Exercise module composition."],
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
  ],
  relations: [],
  warnings: [],
};

describe("SpecStructureModule", () => {
  beforeEach(() => resetProjectStore());

  it("composes the domain service from injected reader, generator and store", async () => {
    const store = new InMemorySpecGraphRepository();
    const module = createSpecStructureModule({
      reader: new DeterministicConfirmedInterpretationReader([interpretation]),
      generator: new DeterministicDecompositionGenerator(() => generated),
      store,
    });

    const generatedView = await module.generate(projectId);

    expect(generatedView).toMatchObject({ projectId });
    expect(generatedView.nodes[0]).toMatchObject({
      clientRef: "problem-1",
      status: "PROPOSED",
    });
    await expect(module.byProject(projectId)).resolves.toEqual(generatedView);
  });

  it("does not replace the previous graph when generation fails", async () => {
    const store = new InMemorySpecGraphRepository();
    let shouldFail = false;
    const module = createSpecStructureModule({
      reader: new DeterministicConfirmedInterpretationReader([interpretation]),
      generator: {
        async generate() {
          if (shouldFail) throw new Error("provider unavailable");
          return generated;
        },
      },
      store,
    });

    const before = await module.generate(projectId);
    shouldFail = true;

    await expect(module.generate(projectId)).rejects.toThrow(
      "provider unavailable"
    );
    await expect(module.byProject(projectId)).resolves.toEqual(before);
  });

  it("replaces the complete graph only after a successful regeneration", async () => {
    const store = new InMemorySpecGraphRepository();
    let next = generated;
    const module = createSpecStructureModule({
      reader: new DeterministicConfirmedInterpretationReader([interpretation]),
      generator: {
        async generate() {
          return next;
        },
      },
      store,
    });

    await module.generate(projectId);
    next = {
      ...generated,
      nodes: [
        {
          ...generated.nodes[0]!,
          clientRef: "replacement-1",
          title: "Replacement problem",
        },
      ],
    };

    const replacement = await module.generate(projectId);
    expect(replacement.nodes.map((node) => node.clientRef)).toEqual([
      "replacement-1",
    ]);
  });
});
