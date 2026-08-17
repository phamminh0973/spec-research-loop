import {
  DecomposeIdeaInputSchema,
  STEP2_REQUIRED_NODE_TYPES,
} from "@specloop/schemas";
import { describe, expect, it } from "vitest";

import { confirmedInterpretationFixture } from "@specloop/schemas/fixtures";
import { buildDecompositionMessages, decompositionPrompt } from "./prompt.js";

const input = DecomposeIdeaInputSchema.parse({
  projectId: confirmedInterpretationFixture.projectId,
  confirmedInterpretation: confirmedInterpretationFixture,
  confirmedDecisions: confirmedInterpretationFixture.confirmedDecisions,
  constraints: confirmedInterpretationFixture.constraints,
});

describe("PT-02 decomposition prompt", () => {
  it("requires every assignment Step 2 type", () => {
    for (const type of STEP2_REQUIRED_NODE_TYPES) {
      expect(decompositionPrompt.system).toContain(type);
    }
    expect(decompositionPrompt.system).toContain(
      "at least one node for every required type"
    );
  });

  it("defines evidence as a requirement and forbids fabricated research", () => {
    expect(decompositionPrompt.system).toContain("evidence needed");
    expect(decompositionPrompt.system).toContain("must not invent papers");
    expect(decompositionPrompt.system).toContain("RISK is optional");
  });

  it("keeps the confirmed interpretation in the untrusted input block", () => {
    const messages = buildDecompositionMessages(input);

    expect(messages.untrusted[0]?.label).toContain("Confirmed interpretation");
    expect(messages.untrusted[0]?.text).toContain(input.projectId);
    expect(messages.system).toBe(decompositionPrompt.system);
  });
});
