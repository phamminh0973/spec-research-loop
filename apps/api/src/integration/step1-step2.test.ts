import type {
  InterpretationOutput,
  InterpretationRecord,
  InterpretIdeaInput,
} from "@specloop/schemas";
import { describe, expect, it } from "vitest";

import {
  InMemoryInterpretationRepository,
  createInterpretationModule,
} from "../interpretation/index.js";
import { Step1ConfirmedInterpretationReader } from "../modules/spec-structure/interpretation-reader-adapter.js";
import { createSpecStructureModule } from "../modules/spec-structure/spec-structure-module.js";
import {
  DeterministicDecompositionGenerator,
  InMemorySpecGraphRepository,
} from "../modules/spec-structure/testing-adapters.js";
import { appRouter } from "../routers/index.js";
import { getProjectById } from "../routers/projects.js";
import { createContextInner, type ApiContext } from "../trpc/context.js";

const USER_ID = "123e4567-e89b-42d3-a456-426614174099";

const OUTPUT: InterpretationOutput = {
  simpleInterpretation: "Study whether retrieval improves factual answers.",
  technicalInterpretation:
    "Evaluate retrieval-augmented generation on factual closed-domain QA.",
  assumptions: ["A QA dataset is available."],
  objectives: ["Measure factual accuracy."],
  ambiguities: ["Model size is unspecified."],
};

function generatedInterpretation(
  input: InterpretIdeaInput
): InterpretationRecord {
  return {
    interpretationId: crypto.randomUUID(),
    projectId: input.projectId,
    output: OUTPUT,
    status: "PROPOSED",
    promptId: "PT-01",
    promptVersion: "1.0.0",
    schemaVersion: "1.0.0",
    provider: "openai-compatible",
    model: "test-model",
    retryCount: 0,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };
}

describe("Step 1 to Step 2 integration", () => {
  it("enforces BR-01 before confirm, unlocks the exact confirmed version, and blocks again after regenerate", async () => {
    const interpretations = new InMemoryInterpretationRepository();
    const interpretation = createInterpretationModule({
      repository: interpretations,
      generator: async (input) => generatedInterpretation(input),
    });
    const reader = new Step1ConfirmedInterpretationReader(
      interpretations,
      getProjectById
    );
    const graphStore = new InMemorySpecGraphRepository();
    const specStructure = createSpecStructureModule({
      reader,
      generator: new DeterministicDecompositionGenerator((input) => ({
        projectId: input.projectId,
        nodes: [
          {
            projectId: input.projectId,
            clientRef: "problem-1",
            type: "PROBLEM",
            title: "Retrieval uncertainty",
            content: "The effect of retrieval remains to be tested.",
            status: "PROPOSED",
            sourceRefs: [],
          },
          {
            projectId: input.projectId,
            clientRef: "question-1",
            type: "RESEARCH_QUESTION",
            title: "Does retrieval improve factual accuracy?",
            content: "Measure the factual-accuracy delta with retrieval.",
            status: "PROPOSED",
            sourceRefs: [],
          },
        ],
        relations: [],
        warnings: [],
      })),
      store: graphStore,
    });
    const context = createContextInner({
      user: { id: USER_ID, displayName: "Integration User" },
      interpretation,
      specStructure,
      llm: {} as ApiContext["llm"],
      llmConfig: {} as ApiContext["llmConfig"],
    });
    const caller = appRouter.createCaller(context);
    const project = await caller.projects.create({
      title: "Retrieval study",
      domain: "NLP",
      rawIdea:
        "Study whether retrieval-augmented prompting improves factual closed-domain question answering.",
      resourceConstraints: ["single GPU"],
    });
    const proposed = await caller.interpretation.generate({
      projectId: project.id,
    });

    await expect(
      caller.decomposition.generate({ projectId: project.id })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });

    await caller.interpretation.confirm({
      projectId: project.id,
      interpretationId: proposed.interpretationId,
    });
    const graph = await caller.decomposition.generate({
      projectId: project.id,
    });
    expect(graph.nodes.map((node) => node.type)).toEqual([
      "PROBLEM",
      "RESEARCH_QUESTION",
    ]);

    await caller.interpretation.regenerate({ projectId: project.id });
    await expect(
      caller.decomposition.generate({ projectId: project.id })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
