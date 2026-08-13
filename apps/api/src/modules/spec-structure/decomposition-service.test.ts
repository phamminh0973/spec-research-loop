import { describe, expect, it } from "vitest";

import type {
  ConfirmedInterpretationSnapshot,
  DecompositionOutput,
} from "@specloop/schemas";
import { DecompositionService } from "./decomposition-service.js";
import {
  ConfirmationRequiredError,
  DecompositionValidationError,
} from "./errors.js";
import type {
  ConfirmedInterpretationReader,
  DecompositionGenerator,
  SpecGraphRepository,
} from "./ports.js";

const projectId = "00000000-0000-4000-8000-000000000001";

const confirmedInterpretationFixture: ConfirmedInterpretationSnapshot = {
  interpretationId: "00000000-0000-4000-8000-000000000002",
  projectId,
  simpleInterpretation: "A confirmed interpretation for a gate test.",
  technicalInterpretation: "A confirmed interpretation for a gate test.",
  assumptions: [],
  objectives: ["Test the confirmation gate."],
  ambiguities: [],
  confirmedDecisions: [{ kind: "CONFIRM" }],
  constraints: [],
  status: "USER_CONFIRMED",
  confirmedAt: "2026-08-11T00:00:00Z",
};

function makeService(
  interpretation: ConfirmedInterpretationSnapshot | null,
  events: string[],
  generated: unknown = { projectId, nodes: [], relations: [], warnings: [] },
  savedGraphs: DecompositionOutput[] = []
) {
  const reader: ConfirmedInterpretationReader = {
    async getConfirmedByProject() {
      events.push("reader");
      return interpretation;
    },
  };
  const generator: DecompositionGenerator = {
    async generate() {
      events.push("generator");
      return generated;
    },
  };
  const repository: SpecGraphRepository = {
    async saveGeneratedGraph(graph) {
      events.push("repository");
      savedGraphs.push(graph);
    },
  };

  return new DecompositionService({ reader, generator, repository });
}

describe("DecompositionService confirmation gate", () => {
  it("rejects a project with no confirmed interpretation before dependencies run", async () => {
    const events: string[] = [];
    const service = makeService(null, events);

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      ConfirmationRequiredError
    );
    expect(events).toEqual(["reader"]);
  });

  it("rejects a non-confirmed interpretation before dependencies run", async () => {
    const events: string[] = [];
    const proposedInterpretation = {
      ...confirmedInterpretationFixture,
      status: "PROPOSED",
    } as unknown as ConfirmedInterpretationSnapshot;
    const service = makeService(proposedInterpretation, events);

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      ConfirmationRequiredError
    );
    expect(events).toEqual(["reader"]);
  });

  it("parses generator output before saving it", async () => {
    const events: string[] = [];
    const service = makeService(confirmedInterpretationFixture, events, {});

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      DecompositionValidationError
    );
    expect(events).toEqual(["reader", "generator"]);
  });

  it("rejects an incomplete ambiguity warning before saving", async () => {
    const events: string[] = [];
    const incompleteWarning = {
      projectId,
      nodes: [],
      relations: [],
      warnings: [
        {
          code: "AMBIGUOUS",
          targetClientRef: "problem-1",
          targetType: "PROBLEM",
          reason: "",
          suggestedAction: "Clarify the problem scope.",
        },
      ],
    };
    const service = makeService(
      confirmedInterpretationFixture,
      events,
      incompleteWarning
    );

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      DecompositionValidationError
    );
    expect(events).toEqual(["reader", "generator"]);
  });

  it("rejects invalid graph references without saving", async () => {
    const events: string[] = [];
    const invalidGraph = {
      projectId,
      nodes: [
        {
          projectId,
          clientRef: "problem-1",
          type: "PROBLEM",
          title: "Problem",
          content: "A problem.",
          status: "PROPOSED",
          sourceRefs: [],
        },
      ],
      relations: [
        {
          projectId,
          sourceClientRef: "problem-1",
          targetClientRef: "missing-node",
          type: "ADDRESSES",
        },
      ],
      warnings: [],
    };
    const service = makeService(
      confirmedInterpretationFixture,
      events,
      invalidGraph
    );

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      DecompositionValidationError
    );
    expect(events).toEqual(["reader", "generator"]);
  });

  it("rejects self-relations without saving", async () => {
    const events: string[] = [];
    const selfRelationGraph = {
      projectId,
      nodes: [
        {
          projectId,
          clientRef: "problem-1",
          type: "PROBLEM",
          title: "Problem",
          content: "A problem.",
          status: "PROPOSED",
          sourceRefs: [],
        },
      ],
      relations: [
        {
          projectId,
          sourceClientRef: "problem-1",
          targetClientRef: "problem-1",
          type: "ADDRESSES",
        },
      ],
      warnings: [],
    };
    const service = makeService(
      confirmedInterpretationFixture,
      events,
      selfRelationGraph
    );

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      DecompositionValidationError
    );
    expect(events).toEqual(["reader", "generator"]);
  });

  it("rejects a cross-project relation without saving", async () => {
    const events: string[] = [];
    const otherProjectId = "00000000-0000-4000-8000-000000000099";
    const crossProjectGraph = {
      projectId,
      nodes: [
        {
          projectId,
          clientRef: "problem-1",
          type: "PROBLEM",
          title: "Problem",
          content: "A problem.",
          status: "PROPOSED",
          sourceRefs: [],
        },
        {
          projectId,
          clientRef: "question-1",
          type: "RESEARCH_QUESTION",
          title: "Question",
          content: "A question.",
          status: "PROPOSED",
          sourceRefs: [],
        },
      ],
      relations: [
        {
          projectId: otherProjectId,
          sourceClientRef: "problem-1",
          targetClientRef: "question-1",
          type: "ADDRESSES",
        },
      ],
      warnings: [],
    };
    const service = makeService(
      confirmedInterpretationFixture,
      events,
      crossProjectGraph
    );

    await expect(service.generate(projectId)).rejects.toBeInstanceOf(
      DecompositionValidationError
    );
    expect(events).toEqual(["reader", "generator"]);
  });

  it("saves a valid graph only after the reader and generator", async () => {
    const events: string[] = [];
    const savedGraphs: DecompositionOutput[] = [];
    const validGraph = {
      projectId,
      nodes: [
        {
          projectId,
          clientRef: "problem-1",
          type: "PROBLEM",
          title: "Problem",
          content: "A problem.",
          status: "PROPOSED",
          sourceRefs: [],
        },
      ],
      relations: [],
      warnings: [],
    };
    const service = makeService(
      confirmedInterpretationFixture,
      events,
      validGraph,
      savedGraphs
    );

    const reviewed = await service.generate(projectId);

    expect(reviewed).toMatchObject({ projectId });
    expect(
      reviewed.warnings.some(
        (warning) =>
          warning.code === "MISSING" &&
          warning.targetType === "RESEARCH_QUESTION"
      )
    ).toBe(true);
    expect(savedGraphs).toEqual([reviewed]);
    expect(events).toEqual(["reader", "generator", "repository"]);
  });
});
