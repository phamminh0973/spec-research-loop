import type { SpecGraphView } from "@specloop/schemas";
import { SpecGraphNotFoundError } from "./errors.js";
import type {
  ChangeStatusCommand,
  ConfirmedInterpretationReader,
  CreateRelationCommand,
  DecompositionGenerator,
  DeleteRelationCommand,
  SpecGraphStore,
  UpdateNodeCommand,
} from "./ports.js";
import { DecompositionService } from "./service.js";

export interface SpecStructureModule {
  generate(projectId: string): Promise<SpecGraphView>;
  byProject(projectId: string): Promise<SpecGraphView | null>;
  updateNode(command: UpdateNodeCommand): Promise<SpecGraphView>;
  createRelation(command: CreateRelationCommand): Promise<SpecGraphView>;
  deleteRelation(command: DeleteRelationCommand): Promise<SpecGraphView>;
  changeStatus(command: ChangeStatusCommand): Promise<SpecGraphView>;
}

export interface SpecStructureModuleDependencies {
  reader: ConfirmedInterpretationReader;
  generator: DecompositionGenerator;
  store: SpecGraphStore;
}

export function createSpecStructureModule(
  dependencies: SpecStructureModuleDependencies
): SpecStructureModule {
  const service = new DecompositionService({
    reader: dependencies.reader,
    generator: dependencies.generator,
    repository: dependencies.store,
  });

  return {
    async generate(projectId) {
      await service.generate(projectId);
      const view = await dependencies.store.getByProject(projectId);
      if (!view) {
        throw new SpecGraphNotFoundError(projectId);
      }
      return view;
    },

    byProject(projectId) {
      return dependencies.store.getByProject(projectId);
    },

    updateNode(command) {
      return dependencies.store.updateNode(command);
    },

    createRelation(command) {
      return dependencies.store.createRelation(command);
    },

    deleteRelation(command) {
      return dependencies.store.deleteRelation(command);
    },

    changeStatus(command) {
      return dependencies.store.changeStatus(command);
    },
  };
}
