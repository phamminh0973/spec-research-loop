import type { InterpretationRecord } from "@specloop/schemas";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryInterpretationRepository } from "../interpretation/repository.js";
import { Step1ConfirmedInterpretationReader } from "./interpretation-reader-adapter.js";
import { resetProjectStore } from "../store/project-store.js";

const PROJECT_ID = "123e4567-e89b-42d3-a456-426614174000";
const ACTOR_ID = "123e4567-e89b-42d3-a456-426614174099";

function proposal(id: string): InterpretationRecord {
  return {
    interpretationId: id,
    projectId: PROJECT_ID,
    output: {
      simpleInterpretation: "Study whether retrieval improves factual answers.",
      technicalInterpretation:
        "Evaluate retrieval-augmented generation on factual closed-domain QA.",
      assumptions: ["A QA dataset is available."],
      objectives: ["Measure factual accuracy."],
      ambiguities: ["Model size is unspecified."],
    },
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

function makeReader(repository: InMemoryInterpretationRepository) {
  return new Step1ConfirmedInterpretationReader(repository, (projectId) =>
    projectId === PROJECT_ID
      ? { id: PROJECT_ID, resourceConstraints: ["single GPU"] }
      : undefined
  );
}

describe("Step1ConfirmedInterpretationReader", () => {
  beforeEach(() => resetProjectStore());

  it("returns null for missing and proposed interpretations", async () => {
    const repository = new InMemoryInterpretationRepository();
    const reader = makeReader(repository);

    await expect(reader.getConfirmedByProject(PROJECT_ID)).resolves.toBeNull();
    await repository.saveInitialProposal(
      proposal("123e4567-e89b-42d3-a456-426614174001")
    );
    await expect(reader.getConfirmedByProject(PROJECT_ID)).resolves.toBeNull();
  });

  it("maps the exact active confirmed Step 1 record and project constraints", async () => {
    const repository = new InMemoryInterpretationRepository();
    const record = proposal("123e4567-e89b-42d3-a456-426614174001");
    await repository.saveInitialProposal(record);
    await repository.confirm({
      projectId: PROJECT_ID,
      interpretationId: record.interpretationId,
      actorId: ACTOR_ID,
    });

    await expect(
      makeReader(repository).getConfirmedByProject(PROJECT_ID)
    ).resolves.toMatchObject({
      interpretationId: record.interpretationId,
      projectId: PROJECT_ID,
      simpleInterpretation: record.output.simpleInterpretation,
      technicalInterpretation: record.output.technicalInterpretation,
      status: "USER_CONFIRMED",
      constraints: ["single GPU"],
      confirmedDecisions: [{ kind: "CONFIRM" }],
    });
  });

  it("returns null after regeneration supersedes the confirmed version", async () => {
    const repository = new InMemoryInterpretationRepository();
    const first = proposal("123e4567-e89b-42d3-a456-426614174001");
    await repository.saveInitialProposal(first);
    await repository.confirm({
      projectId: PROJECT_ID,
      interpretationId: first.interpretationId,
      actorId: ACTOR_ID,
    });
    await repository.saveRegeneratedProposal(
      proposal("123e4567-e89b-42d3-a456-426614174002"),
      ACTOR_ID
    );

    await expect(
      makeReader(repository).getConfirmedByProject(PROJECT_ID)
    ).resolves.toBeNull();
  });

  it("does not return a record when the project boundary cannot resolve ownership", async () => {
    const repository = new InMemoryInterpretationRepository();
    const record = proposal("123e4567-e89b-42d3-a456-426614174001");
    await repository.saveInitialProposal(record);
    await repository.confirm({
      projectId: PROJECT_ID,
      interpretationId: record.interpretationId,
      actorId: ACTOR_ID,
    });
    const reader = new Step1ConfirmedInterpretationReader(
      repository,
      () => undefined
    );

    await expect(reader.getConfirmedByProject(PROJECT_ID)).resolves.toBeNull();
  });
});
