/**
 * Contract tests for the shared structured-output helper (AI design §4/§16).
 *
 * Focus is the bounded repair path: a schema violation or a reference-allowlist
 * violation must trigger one repair attempt whose feedback names the concrete
 * problem, so the model can fix it instead of guessing. Uses a fake
 * OpenAI-shaped client — no network call, no `OPENAI_API_KEY` needed.
 */

import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { structuredCall } from "./structured-call.js";

const CLAIM_SCHEMA = z.object({
  claims: z.array(
    z.object({
      type: z.enum(["EMPIRICAL", "METHODOLOGICAL", "THEORETICAL", "NEGATIVE"]),
      text: z.string().min(1).max(2_000),
      evidenceRefs: z.array(z.string().uuid()).default([]),
    }),
  ),
});

const SOURCE_ID = "11111111-1111-4111-8111-111111111111";

const VALID_OUTPUT = {
  claims: [
    {
      type: "EMPIRICAL",
      text: "Claim-level evidence feedback lowers unsupported-claim rate.",
      evidenceRefs: [SOURCE_ID],
    },
  ],
};

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

function calls(client: OpenAI): Array<{ content: string }> {
  const create = (client.chat.completions.create as ReturnType<typeof vi.fn>);
  return create.mock.calls.map((call) => {
    const messages = call[0]?.messages as Array<{ role: string; content: string }>;
    const last = messages[messages.length - 1];
    return { content: last?.content ?? "" };
  });
}

/** The repair attempt is the second completion call; return its last message. */
function repairCall(client: OpenAI): { content: string } {
  return calls(client)[1]!;
}

describe("structuredCall repair feedback", () => {
  it("accepts valid first-attempt output without a repair", async () => {
    const onRepair = vi.fn();
    const client = fakeClient([{ content: JSON.stringify(VALID_OUTPUT) }]);

    const output = await structuredCall({
      client,
      model: "test-model",
      systemPrompt: "system",
      userPrompt: "task",
      outputSchema: CLAIM_SCHEMA,
      schemaName: "test_schema",
      allowedIds: new Set([SOURCE_ID]),
      extractReferencedIds: (out) => out.claims.flatMap((c) => c.evidenceRefs),
      onRepair,
    });

    expect(output.claims).toHaveLength(1);
    expect(onRepair).not.toHaveBeenCalled();
  });

  it("repairs once after a schema violation and names the failing field", async () => {
    const client = fakeClient([
      {
        content: JSON.stringify({
          claims: [{ type: "EMPIRICAL", text: "", evidenceRefs: [] }],
        }),
      },
      { content: JSON.stringify(VALID_OUTPUT) },
    ]);

    const output = await structuredCall({
      client,
      model: "test-model",
      systemPrompt: "system",
      userPrompt: "task",
      outputSchema: CLAIM_SCHEMA,
      schemaName: "test_schema",
    });

    expect(output.claims).toHaveLength(1);
    expect(repairCall(client).content).toContain("claims.0.text");
    expect(repairCall(client).content).toContain("expected string to have");
  });

  it("repairs once after an allowlist violation, naming the invalid ID", async () => {
    const fabricated = "22222222-2222-4222-8222-222222222222";
    const client = fakeClient([
      {
        content: JSON.stringify({
          claims: [
            { type: "EMPIRICAL", text: "A claim.", evidenceRefs: [fabricated] },
          ],
        }),
      },
      { content: JSON.stringify(VALID_OUTPUT) },
    ]);

    const output = await structuredCall({
      client,
      model: "test-model",
      systemPrompt: "system",
      userPrompt: "task",
      outputSchema: CLAIM_SCHEMA,
      schemaName: "test_schema",
      allowedIds: new Set([SOURCE_ID]),
      extractReferencedIds: (out) => out.claims.flatMap((c) => c.evidenceRefs),
    });

    expect(output.claims[0]!.evidenceRefs).toEqual([SOURCE_ID]);
    expect(repairCall(client).content).toContain(fabricated);
    expect(repairCall(client).content).toContain(SOURCE_ID);
  });

  it("throws a terminal error when the allowlist violation persists after repair", async () => {
    const fabricated = "22222222-2222-4222-8222-222222222222";
    const badOutput = {
      claims: [{ type: "EMPIRICAL", text: "A claim.", evidenceRefs: [fabricated] }],
    };
    const client = fakeClient([
      { content: JSON.stringify(badOutput) },
      { content: JSON.stringify(badOutput) },
    ]);

    await expect(
      structuredCall({
        client,
        model: "test-model",
        systemPrompt: "system",
        userPrompt: "task",
        outputSchema: CLAIM_SCHEMA,
        schemaName: "test_schema",
        allowedIds: new Set([SOURCE_ID]),
        extractReferencedIds: (out) => out.claims.flatMap((c) => c.evidenceRefs),
      }),
    ).rejects.toThrow("still rejected after one repair attempt");
  });

  it("records a repair via onRepair and reports the first-failure reason in the final error", async () => {
    const onRepair = vi.fn();
    const client = fakeClient([
      { content: "not json at all" },
      { content: "still not json" },
    ]);

    const error = await structuredCall({
      client,
      model: "test-model",
      systemPrompt: "system",
      userPrompt: "task",
      outputSchema: CLAIM_SCHEMA,
      schemaName: "test_schema",
      onRepair,
    }).catch((e: unknown) => e);

    expect(onRepair).toHaveBeenCalledTimes(1);
    expect((error as Error).message).toContain("First failure:");
  });
});
