import { UuidSchema } from "@specloop/schemas";
import { describe, expect, it } from "vitest";
import { appRouter } from "../routers/index.js";
import type { ApiContext } from "./context.js";
import { createContextInner } from "./context.js";

const projectId = "00000000-0000-4000-8000-000000000001";

function testContext() {
  return createContextInner({
    llm: {} as ApiContext["llm"],
    llmConfig: {
      apiKey: "test-key",
      baseURL: undefined,
      defaultModel: "test-model",
      organization: undefined,
      timeoutMs: 1_000,
      maxRetries: 1,
    },
  });
}

describe("API context", () => {
  it("composes the Step 2 module for the production context by default", () => {
    const context = testContext();

    expect(context.specStructure).toBeDefined();
  });

  it("uses a schema-valid demo user id for lifecycle actor metadata", () => {
    const context = testContext();

    expect(() => UuidSchema.parse(context.user.id)).not.toThrow();
  });

  it("routes the default Step 2 read through the composed module", async () => {
    const caller = appRouter.createCaller(testContext());

    await expect(caller.decomposition.byProject({ projectId })).resolves.toBe(
      null
    );
  });
});
