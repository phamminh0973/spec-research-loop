/**
 * Contract tests for AIT-01 idea interpretation (TT-US02-01).
 *
 * Covers the classes of case listed in `docs/04-ai-system-design.md` §18
 * "Contract tests": valid JSON with every required field, malformed JSON,
 * missing field, and the bounded-repair/terminal-error path from §13. Uses a
 * fake OpenAI-shaped client — no network call, no `OPENAI_API_KEY` needed —
 * so these run in any environment, including CI without provider
 * credentials (see `../llm/client.ts`).
 */

import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import {
  generateInterpretation,
  InterpretationGenerationError,
} from "./service.js";

const PROJECT_ID = "123e4567-e89b-12d3-a456-426614174000";

const VALID_INPUT = {
  projectId: PROJECT_ID,
  rawIdea:
    "We want to study whether retrieval-augmented prompting improves " +
    "factual accuracy of small language models on closed-domain QA.",
  domain: "NLP",
  resourceConstraints: ["single GPU", "4 week timeline"],
};

const VALID_OUTPUT = {
  simpleInterpretation:
    "You want to check if giving a small model extra retrieved text helps it answer questions more correctly.",
  technicalInterpretation:
    "The project evaluates retrieval-augmented generation for improving factual accuracy of small LLMs on closed-domain QA.",
  assumptions: ["A suitable closed-domain QA dataset is available."],
  objectives: ["Measure factual-accuracy delta with vs without retrieval."],
  ambiguities: ["'Small language model' size range is not specified."],
};

/** Build a fake OpenAI client whose `chat.completions.create` returns the given contents in order (one per call). */
function fakeClient(
  responses: Array<{ content?: string } | { throws: Error }>,
): OpenAI {
  const create = vi.fn();
  for (const response of responses) {
    if ("throws" in response) {
      create.mockRejectedValueOnce(response.throws);
    } else {
      create.mockResolvedValueOnce({
        choices: [{ message: { content: response.content } }],
      });
    }
  }
  return { chat: { completions: { create } } } as unknown as OpenAI;
}

describe("generateInterpretation", () => {
  it("returns a PROPOSED record on valid first-attempt JSON", async () => {
    const client = fakeClient([{ content: JSON.stringify(VALID_OUTPUT) }]);

    const record = await generateInterpretation(VALID_INPUT, {
      client,
      model: "test-model",
    });

    expect(record.status).toBe("PROPOSED");
    expect(record.promptId).toBe("PT-01");
    expect(record.retryCount).toBe(0);
    expect(record.output.simpleInterpretation).toBe(
      VALID_OUTPUT.simpleInterpretation,
    );
    expect(record.output.assumptions).toEqual(VALID_OUTPUT.assumptions);
  });

  it("repairs once after malformed JSON, then succeeds", async () => {
    const client = fakeClient([
      { content: "not json at all" },
      { content: JSON.stringify(VALID_OUTPUT) },
    ]);

    const record = await generateInterpretation(VALID_INPUT, {
      client,
      model: "test-model",
    });

    expect(record.retryCount).toBe(1);
    expect(record.status).toBe("PROPOSED");
  });

  it("repairs once after a schema violation (missing field), then succeeds", async () => {
    const { objectives: _omit, ...missingField } = VALID_OUTPUT;
    const client = fakeClient([
      { content: JSON.stringify(missingField) },
      { content: JSON.stringify(VALID_OUTPUT) },
    ]);

    const record = await generateInterpretation(VALID_INPUT, {
      client,
      model: "test-model",
    });

    expect(record.retryCount).toBe(1);
    expect(record.output.objectives).toEqual(VALID_OUTPUT.objectives);
  });

  it("throws a terminal InterpretationGenerationError when still invalid after the repair budget", async () => {
    const client = fakeClient([
      { content: "not json" },
      { content: "still not json" },
    ]);

    await expect(
      generateInterpretation(VALID_INPUT, { client, model: "test-model" }),
    ).rejects.toBeInstanceOf(InterpretationGenerationError);
  });

  it("treats a provider error as a bounded, retryable failure, not an infinite retry", async () => {
    const client = fakeClient([
      { throws: new Error("upstream 503") },
      { throws: new Error("upstream 503") },
    ]);

    const error = await generateInterpretation(VALID_INPUT, {
      client,
      model: "test-model",
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(InterpretationGenerationError);
    expect((error as InterpretationGenerationError).retryCount).toBe(1);
  });

  it("never assigns USER_CONFIRMED — status is always PROPOSED on success", async () => {
    const client = fakeClient([{ content: JSON.stringify(VALID_OUTPUT) }]);

    const record = await generateInterpretation(VALID_INPUT, {
      client,
      model: "test-model",
    });

    expect(record.status).not.toBe("USER_CONFIRMED");
  });

  it("rejects an invalid InterpretIdeaInput before ever calling the provider", async () => {
    const create = vi.fn();
    const client = { chat: { completions: { create } } } as unknown as OpenAI;

    await expect(
      generateInterpretation(
        { ...VALID_INPUT, rawIdea: "too short" },
        { client, model: "test-model" },
      ),
    ).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
  });
});
