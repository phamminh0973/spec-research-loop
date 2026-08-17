import type {
  InterpretationOutput,
  InterpretationRecord,
} from "@specloop/schemas";
import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryInterpretationRepository } from "./repository.js";
import { resetProjectStore } from "../store/project-store.js";

const PROJECT_ID = "123e4567-e89b-42d3-a456-426614174000";
const ACTOR_ID = "123e4567-e89b-42d3-a456-426614174099";

const OUTPUT: InterpretationOutput = {
  simpleInterpretation: "Study whether retrieval improves factual answers.",
  technicalInterpretation:
    "Evaluate retrieval-augmented generation on factual closed-domain QA.",
  assumptions: ["A QA dataset is available."],
  objectives: ["Measure factual accuracy."],
  ambiguities: ["Model size is unspecified."],
};

function proposal(id: string, output = OUTPUT): InterpretationRecord {
  return {
    interpretationId: id,
    projectId: PROJECT_ID,
    output,
    status: "PROPOSED",
    promptId: "PT-01",
    promptVersion: "1.0.0",
    schemaVersion: "1.0.0",
    provider: "openai-compatible",
    model: "test-model",
    retryCount: 0,
    createdAt: "2026-08-13T01:00:00Z",
    confirmedAt: null,
  };
}

describe("InMemoryInterpretationRepository", () => {
  beforeEach(() => resetProjectStore());

  it("stores an initial proposal without creating a user decision", async () => {
    const repository = new InMemoryInterpretationRepository();
    const first = proposal("123e4567-e89b-42d3-a456-426614174001");

    await repository.saveInitialProposal(first);

    await expect(
      repository.getById(PROJECT_ID, first.interpretationId)
    ).resolves.toEqual(first);
    await expect(repository.listDecisions(PROJECT_ID)).resolves.toEqual([]);
  });

  it("regenerate supersedes the prior active version without confirming the replacement", async () => {
    const repository = new InMemoryInterpretationRepository();
    const first = proposal("123e4567-e89b-42d3-a456-426614174001");
    const replacement = proposal("123e4567-e89b-42d3-a456-426614174002");
    await repository.saveInitialProposal(first);

    await repository.saveRegeneratedProposal(replacement, ACTOR_ID);

    expect(
      (await repository.getById(PROJECT_ID, first.interpretationId))?.status
    ).toBe("SUPERSEDED");
    expect(
      (await repository.getById(PROJECT_ID, replacement.interpretationId))
        ?.status
    ).toBe("PROPOSED");
    await expect(repository.getLatestByProject(PROJECT_ID)).resolves.toEqual(
      replacement
    );
    await expect(
      repository.getConfirmedByProject(PROJECT_ID)
    ).resolves.toBeNull();
    expect((await repository.listDecisions(PROJECT_ID))[0]).toMatchObject({
      interpretationId: replacement.interpretationId,
      action: "REGENERATE",
      actorId: ACTOR_ID,
    });
  });

  it.each(["EDIT", "OTHER"] as const)(
    "%s creates a user-authored proposed version and preserves decision history",
    async (action) => {
      const repository = new InMemoryInterpretationRepository();
      const first = proposal("123e4567-e89b-42d3-a456-426614174001");
      await repository.saveInitialProposal(first);
      const revisedOutput = {
        ...OUTPUT,
        simpleInterpretation: `${action} user interpretation.`,
      };

      const revised = await repository.revise({
        projectId: PROJECT_ID,
        sourceInterpretationId: first.interpretationId,
        action,
        output: revisedOutput,
        actorId: ACTOR_ID,
      });

      expect(revised.interpretationId).not.toBe(first.interpretationId);
      expect(revised.status).toBe("PROPOSED");
      expect(revised.output).toEqual(revisedOutput);
      expect(
        (await repository.getById(PROJECT_ID, first.interpretationId))?.status
      ).toBe("SUPERSEDED");
      expect((await repository.listDecisions(PROJECT_ID))[0]).toMatchObject({
        interpretationId: revised.interpretationId,
        action,
        actorId: ACTOR_ID,
      });
    }
  );

  it("confirms only the exact proposed version and retains an actor-owned decision", async () => {
    const repository = new InMemoryInterpretationRepository();
    const first = proposal("123e4567-e89b-42d3-a456-426614174001");
    await repository.saveInitialProposal(first);

    const confirmed = await repository.confirm({
      projectId: PROJECT_ID,
      interpretationId: first.interpretationId,
      actorId: ACTOR_ID,
    });

    expect(confirmed.status).toBe("USER_CONFIRMED");
    expect(confirmed.confirmedAt).not.toBeNull();
    await expect(repository.getConfirmedByProject(PROJECT_ID)).resolves.toEqual(
      confirmed
    );
    expect((await repository.listDecisions(PROJECT_ID))[0]).toMatchObject({
      interpretationId: first.interpretationId,
      action: "CONFIRM",
      actorId: ACTOR_ID,
    });
  });

  it("rejects confirmation of a superseded version", async () => {
    const repository = new InMemoryInterpretationRepository();
    const first = proposal("123e4567-e89b-42d3-a456-426614174001");
    const replacement = proposal("123e4567-e89b-42d3-a456-426614174002");
    await repository.saveInitialProposal(first);
    await repository.saveRegeneratedProposal(replacement, ACTOR_ID);

    await expect(
      repository.confirm({
        projectId: PROJECT_ID,
        interpretationId: first.interpretationId,
        actorId: ACTOR_ID,
      })
    ).rejects.toThrow("Only a proposed interpretation can be confirmed");
  });
});
