import {
  DecomposeIdeaInputSchema,
  DecompositionOutputSchema,
  STEP2_REQUIRED_NODE_TYPES,
  type DecomposeIdeaInput,
  type DecompositionOutput,
} from "@specloop/schemas";
import type OpenAI from "openai";

import { getLlmClient, getLlmConfig } from "../../llm/index.js";
import { structuredCall } from "../../llm/structured-call.js";
import { DecompositionValidationError } from "./errors.js";
import { buildDecompositionMessages } from "./prompt.js";
import type { DecompositionGenerator } from "./ports.js";

export interface LlmDecompositionGeneratorDependencies {
  /** Optional injection point for tests or an alternate OpenAI-compatible client. */
  client?: OpenAI;
  /** Optional per-task model override. */
  model?: string;
}

/**
 * Production AIT-02 adapter. It validates the Step 2 input before the call
 * and delegates output parsing to the shared structured-output gateway.
 */
export class LlmDecompositionGenerator implements DecompositionGenerator {
  constructor(
    private readonly dependencies: LlmDecompositionGeneratorDependencies = {}
  ) {}

  async generate(input: DecomposeIdeaInput): Promise<DecompositionOutput> {
    const parsedInput = DecomposeIdeaInputSchema.parse(input);
    const messages = buildDecompositionMessages(parsedInput);
    const client = this.dependencies.client ?? getLlmClient();
    const model = this.dependencies.model ?? getLlmConfig().defaultModel;

    const output = await structuredCall({
      client,
      model,
      systemPrompt: messages.system,
      userPrompt: messages.user,
      untrusted: messages.untrusted,
      outputSchema: DecompositionOutputSchema,
      maxTokens: 4_000,
    });

    const missingTypes = STEP2_REQUIRED_NODE_TYPES.filter(
      (type) => !output.nodes.some((node) => node.type === type)
    );
    if (missingTypes.length > 0) {
      throw new DecompositionValidationError(
        `Generated decomposition omitted required types: ${missingTypes.join(", ")}.`
      );
    }

    return output;
  }
}
