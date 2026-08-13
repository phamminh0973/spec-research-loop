import type {
  InterpretationDecision,
  InterpretationRecord,
  InterpretIdeaInput,
} from "@specloop/schemas";

import type {
  InterpretationRepository,
  ReviseInterpretationCommand,
} from "./repository.js";

export interface InterpretationModule {
  generate(input: InterpretIdeaInput): Promise<InterpretationRecord>;
  regenerate(
    input: InterpretIdeaInput,
    actorId: string
  ): Promise<InterpretationRecord>;
  latest(projectId: string): Promise<InterpretationRecord | null>;
  decisions(projectId: string): Promise<InterpretationDecision[]>;
  revise(command: ReviseInterpretationCommand): Promise<InterpretationRecord>;
  confirm(
    projectId: string,
    interpretationId: string,
    actorId: string
  ): Promise<InterpretationRecord>;
}

export interface InterpretationModuleDependencies {
  repository: InterpretationRepository;
  generator(input: InterpretIdeaInput): Promise<InterpretationRecord>;
}

export function createInterpretationModule(
  dependencies: InterpretationModuleDependencies
): InterpretationModule {
  return {
    async generate(input) {
      const generated = await dependencies.generator(input);
      return dependencies.repository.saveInitialProposal(generated);
    },

    async regenerate(input, actorId) {
      const generated = await dependencies.generator(input);
      return dependencies.repository.saveRegeneratedProposal(
        generated,
        actorId
      );
    },

    latest(projectId) {
      return dependencies.repository.getLatestByProject(projectId);
    },

    decisions(projectId) {
      return dependencies.repository.listDecisions(projectId);
    },

    revise(command) {
      return dependencies.repository.revise(command);
    },

    confirm(projectId, interpretationId, actorId) {
      return dependencies.repository.confirm({
        projectId,
        interpretationId,
        actorId,
      });
    },
  };
}
