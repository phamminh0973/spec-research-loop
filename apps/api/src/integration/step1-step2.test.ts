import type {
  DecompositionOutput,
  InterpretationOutput,
  InterpretationRecord,
  InterpretIdeaInput,
} from "@specloop/schemas";
import {
  SpecGraphViewSchema,
  STEP2_REQUIRED_NODE_TYPES,
} from "@specloop/schemas";
import { decompositionOutputFixture } from "@specloop/schemas/fixtures";
import { describe, expect, it } from "vitest";
import { Step1ConfirmedInterpretationReader } from "../modules/decomposition/interpretation-reader-adapter.js";
import { createSpecStructureModule } from "../modules/decomposition/module.js";
import {
  DeterministicDecompositionGenerator,
  InMemorySpecGraphRepository,
} from "../modules/decomposition/testing-adapters.js";
import {
  createInterpretationModule,
  InMemoryInterpretationRepository,
} from "../modules/interpretation/index.js";
import { appRouter } from "../routers/index.js";
import { getProjectById } from "../routers/projects.js";
import { type ApiContext, createContextInner } from "../trpc/context.js";

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

function completeOutput(projectId: string): DecompositionOutput {
  return {
    ...decompositionOutputFixture,
    projectId,
    nodes: decompositionOutputFixture.nodes.map((node) => ({
      ...node,
      projectId,
      sourceRefs: [...node.sourceRefs],
    })),
    relations: decompositionOutputFixture.relations.map((relation) => ({
      ...relation,
      projectId,
    })),
    warnings: [...decompositionOutputFixture.warnings],
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
      generator: new DeterministicDecompositionGenerator((input) =>
        completeOutput(input.projectId)
      ),
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
    expect(
      STEP2_REQUIRED_NODE_TYPES.every((type) =>
        graph.nodes.some((node) => node.type === type)
      )
    ).toBe(true);
    expect(graph.nodes.some((node) => node.type === "EVIDENCE")).toBe(true);
    expect(graph.nodes.find((node) => node.type === "EVIDENCE")).toMatchObject({
      sourceRefs: [],
    });
    expect(() => SpecGraphViewSchema.parse(graph)).not.toThrow();

    const edited = await caller.decomposition.updateNode({
      projectId: project.id,
      clientRef: "problem-1",
      title: "Edited retrieval problem",
      content: "The user clarified the retrieval problem.",
      reason: "Clarified during Step 2 review.",
    });
    expect(
      edited.nodes.find((node) => node.clientRef === "problem-1")
    ).toMatchObject({
      title: "Edited retrieval problem",
      status: "PROPOSED",
    });

    const confirmed = await caller.decomposition.changeStatus({
      projectId: project.id,
      clientRef: "problem-1",
      toStatus: "USER_CONFIRMED",
      reason: "Confirmed after reviewing the decomposition.",
    });
    expect(confirmed.statusHistory.at(-1)).toMatchObject({
      toStatus: "USER_CONFIRMED",
      actor: "USER",
      authority: "USER",
    });

    const withRelation = await caller.decomposition.createRelation({
      projectId: project.id,
      sourceClientRef: "contribution-1",
      targetClientRef: "problem-1",
      type: "ADDRESSES",
    });
    const createdRelation = withRelation.relations.find((relation) => {
      const source = withRelation.nodes.find(
        (node) => node.id === relation.sourceNodeId
      );
      const target = withRelation.nodes.find(
        (node) => node.id === relation.targetNodeId
      );
      return (
        source?.clientRef === "contribution-1" &&
        target?.clientRef === "problem-1" &&
        relation.type === "ADDRESSES"
      );
    });
    expect(createdRelation).toBeDefined();

    const withoutRelation = await caller.decomposition.deleteRelation({
      projectId: project.id,
      relationId: createdRelation!.id,
    });
    expect(withoutRelation.relations).not.toContainEqual(
      expect.objectContaining({ id: createdRelation?.id })
    );
    for (const candidate of [
      edited,
      confirmed,
      withRelation,
      withoutRelation,
    ]) {
      expect(() => SpecGraphViewSchema.parse(candidate)).not.toThrow();
    }

    await caller.interpretation.regenerate({ projectId: project.id });
    await expect(
      caller.decomposition.generate({ projectId: project.id })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
