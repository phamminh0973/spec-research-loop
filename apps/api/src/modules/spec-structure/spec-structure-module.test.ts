import { describe, expect, it } from "vitest";

import {
  DeterministicConfirmedInterpretationReader,
  DeterministicDecompositionGenerator,
  InMemorySpecGraphRepository,
} from "./testing-adapters.js";
import { createSpecStructureModule } from "./spec-structure-module.js";

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
});
