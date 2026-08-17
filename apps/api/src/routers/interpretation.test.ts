import type {
  InterpretationOutput,
  InterpretationRecord,
  InterpretIdeaInput,
} from "@specloop/schemas";
import { describe, expect, it } from "vitest";

import {
  InMemoryInterpretationRepository,
  createInterpretationModule,
} from "../modules/interpretation/index.js";
import type { ApiContext } from "../trpc/context.js";
import { appRouter } from "./index.js";

const PROJECT_ID = "123e4567-e89b-42d3-a456-426614174000";
const USER_ID = "123e4567-e89b-42d3-a456-426614174099";
const UNKNOWN_PROJECT_ID = "123e4567-e89b-42d3-a456-426614174010";

const OUTPUT: InterpretationOutput = {
  simpleInterpretation: "Study whether retrieval improves factual answers.",
  technicalInterpretation:
    "Evaluate retrieval-augmented generation on factual closed-domain QA.",
  assumptions: ["A QA dataset is available."],
  objectives: ["Measure factual accuracy."],
  ambiguities: ["Model size is unspecified."],
};

function generatedRecord(input: InterpretIdeaInput): InterpretationRecord {
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

function makeContext(): ApiContext {
  const repository = new InMemoryInterpretationRepository();
  return {
    requestId: crypto.randomUUID(),
    user: { id: USER_ID, displayName: "Interpretation Test User" },
    llm: {} as ApiContext["llm"],
    llmConfig: {} as ApiContext["llmConfig"],
    interpretation: createInterpretationModule({
      repository,
      generator: async (input) => generatedRecord(input),
    }),
  };
}

async function createProject(
  caller: ReturnType<typeof appRouter.createCaller>
) {
  return caller.projects.create({
    title: "Retrieval study",
    domain: "NLP",
    rawIdea:
      "Study whether retrieval-augmented prompting improves factual closed-domain question answering.",
    resourceConstraints: ["single GPU"],
  });
}

describe("interpretation tRPC router", () => {
  it("persists generation and exposes the latest proposal", async () => {
    const caller = appRouter.createCaller(makeContext());
    const project = await createProject(caller);

    const generated = await caller.interpretation.generate({
      projectId: project.id,
    });

    expect(generated.status).toBe("PROPOSED");
    await expect(
      caller.interpretation.latest({ projectId: project.id })
    ).resolves.toEqual(generated);
  });

  it("round-trips Edit, Other and decision history as new proposed versions", async () => {
    const caller = appRouter.createCaller(makeContext());
    const project = await createProject(caller);
    const initial = await caller.interpretation.generate({
      projectId: project.id,
    });

    const edited = await caller.interpretation.revise({
      projectId: project.id,
      interpretationId: initial.interpretationId,
      action: "EDIT",
      output: { ...OUTPUT, simpleInterpretation: "Edited by the user." },
    });
    const other = await caller.interpretation.revise({
      projectId: project.id,
      interpretationId: edited.interpretationId,
      action: "OTHER",
      output: {
        ...OUTPUT,
        simpleInterpretation: "User supplied another interpretation.",
      },
    });

    expect(edited.status).toBe("PROPOSED");
    expect(other.status).toBe("PROPOSED");
    await expect(
      caller.interpretation.decisions({ projectId: project.id })
    ).resolves.toMatchObject([
      { action: "EDIT", interpretationId: edited.interpretationId },
      { action: "OTHER", interpretationId: other.interpretationId },
    ]);
  });

  it("regenerate leaves the project unconfirmed until the exact replacement is confirmed", async () => {
    const caller = appRouter.createCaller(makeContext());
    const project = await createProject(caller);
    const initial = await caller.interpretation.generate({
      projectId: project.id,
    });

    const regenerated = await caller.interpretation.regenerate({
      projectId: project.id,
    });

    expect(regenerated.interpretationId).not.toBe(initial.interpretationId);
    expect(regenerated.status).toBe("PROPOSED");
    const confirmed = await caller.interpretation.confirm({
      projectId: project.id,
      interpretationId: regenerated.interpretationId,
    });
    expect(confirmed.status).toBe("USER_CONFIRMED");
  });

  it("maps absent dependencies and stale-version confirmation to explicit errors", async () => {
    const missingContext = makeContext();
    missingContext.interpretation = undefined;
    const missingCaller = appRouter.createCaller(missingContext);
    const missingProject = await createProject(missingCaller);
    await expect(
      missingCaller.interpretation.generate({ projectId: missingProject.id })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    const caller = appRouter.createCaller(makeContext());
    const project = await createProject(caller);
    const initial = await caller.interpretation.generate({
      projectId: project.id,
    });
    await caller.interpretation.regenerate({ projectId: project.id });
    await expect(
      caller.interpretation.confirm({
        projectId: project.id,
        interpretationId: initial.interpretationId,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("maps every read and lifecycle action for an unknown project to NOT_FOUND", async () => {
    const caller = appRouter.createCaller(makeContext());

    await expect(
      caller.interpretation.latest({ projectId: UNKNOWN_PROJECT_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.interpretation.decisions({ projectId: UNKNOWN_PROJECT_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.interpretation.regenerate({ projectId: UNKNOWN_PROJECT_ID })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.interpretation.confirm({
        projectId: UNKNOWN_PROJECT_ID,
        interpretationId: crypto.randomUUID(),
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      caller.interpretation.revise({
        projectId: UNKNOWN_PROJECT_ID,
        interpretationId: crypto.randomUUID(),
        action: "EDIT",
        output: OUTPUT,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
