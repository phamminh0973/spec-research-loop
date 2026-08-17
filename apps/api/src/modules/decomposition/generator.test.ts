import { describe, expect, it } from "vitest";

import type OpenAI from "openai";
import type { DecomposeIdeaInput } from "@specloop/schemas";
import { decompositionOutputFixture } from "@specloop/schemas/fixtures";
import { LlmDecompositionGenerator } from "./generator.js";

const projectId = "00000000-0000-4000-8000-000000000001";

const input: DecomposeIdeaInput = {
  projectId,
  confirmedInterpretation: {
    interpretationId: "00000000-0000-4000-8000-000000000002",
    projectId,
    simpleInterpretation: "A confirmed research idea.",
    technicalInterpretation: "A confirmed technical research idea.",
    assumptions: [],
    objectives: ["Produce a testable structure."],
    ambiguities: [],
    confirmedDecisions: [{ kind: "CONFIRM" }],
    constraints: ["Use one GPU."],
    status: "USER_CONFIRMED",
    confirmedAt: "2026-08-11T00:00:00Z",
  },
  confirmedDecisions: [{ kind: "CONFIRM" }],
  constraints: ["Use one GPU."],
};

function fakeClient(payload: unknown) {
  return {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: JSON.stringify(payload) } }],
        }),
      },
    },
  } as unknown as OpenAI;
}

describe("LlmDecompositionGenerator", () => {
  it("produces schema-validated proposed nodes from confirmed interpretation only", async () => {
    const generator = new LlmDecompositionGenerator({
      client: fakeClient({
        ...decompositionOutputFixture,
        projectId,
        nodes: decompositionOutputFixture.nodes.map((node) => ({
          ...node,
          projectId,
        })),
        relations: decompositionOutputFixture.relations.map((relation) => ({
          ...relation,
          projectId,
        })),
      }),
      model: "test-model",
    });

    await expect(generator.generate(input)).resolves.toMatchObject({
      projectId,
      nodes: expect.arrayContaining([
        expect.objectContaining({ type: "PROBLEM", status: "PROPOSED" }),
        expect.objectContaining({ type: "EVIDENCE" }),
      ]),
    });
  });

  it("rejects a provider graph that omits a required Step 2 type", async () => {
    const generator = new LlmDecompositionGenerator({
      client: fakeClient({
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
        ],
        relations: [],
        warnings: [],
      }),
      model: "test-model",
    });

    await expect(generator.generate(input)).rejects.toThrow(
      "Generated decomposition omitted required types"
    );
  });

  it("rejects provider output that does not match the decomposition contract", async () => {
    const generator = new LlmDecompositionGenerator({
      client: fakeClient({ projectId, nodes: [], relations: [] }),
      model: "test-model",
    });

    await expect(generator.generate(input)).rejects.toThrow();
  });
});
