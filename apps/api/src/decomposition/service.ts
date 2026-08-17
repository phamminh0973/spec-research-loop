import {
  DecomposeIdeaInputSchema,
  DecompositionOutputSchema,
  type DecompositionOutput,
} from "@specloop/schemas";

import {
  ConfirmationRequiredError,
  DecompositionValidationError,
} from "./errors.js";
import type { DecompositionServiceDependencies } from "./ports.js";
import { applyDeterministicRules } from "./status-rules.js";

export class DecompositionService {
  constructor(
    private readonly dependencies: DecompositionServiceDependencies
  ) {}

  async generate(projectId: string): Promise<DecompositionOutput> {
    const interpretation =
      await this.dependencies.reader.getConfirmedByProject(projectId);

    if (
      !interpretation ||
      interpretation.status !== "USER_CONFIRMED" ||
      interpretation.projectId !== projectId
    ) {
      throw new ConfirmationRequiredError(projectId);
    }

    const input = DecomposeIdeaInputSchema.parse({
      projectId,
      confirmedInterpretation: interpretation,
      confirmedDecisions: interpretation.confirmedDecisions,
      constraints: interpretation.constraints,
    });

    const generated = await this.dependencies.generator.generate(input);

    let parsed: DecompositionOutput;
    try {
      parsed = DecompositionOutputSchema.parse(generated);
    } catch (error) {
      throw new DecompositionValidationError(
        "The decomposition generator returned an invalid graph.",
        { cause: error }
      );
    }

    if (parsed.projectId !== projectId) {
      throw new DecompositionValidationError(
        "The decomposition graph belongs to a different project."
      );
    }

    const reviewed = applyDeterministicRules(parsed);
    await this.dependencies.repository.saveGeneratedGraph(reviewed);
    return reviewed;
  }
}
