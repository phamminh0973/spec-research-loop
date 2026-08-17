import type {
  ConfirmedInterpretationSnapshot,
  DecomposeIdeaInput,
  DecompositionOutput,
  PersistedNodeStatus,
  SpecGraphView,
  SpecRelationType,
} from "@specloop/schemas";

export interface ConfirmedInterpretationReader {
  getConfirmedByProject(
    projectId: string
  ): Promise<ConfirmedInterpretationSnapshot | null>;
}

export interface DecompositionGenerator {
  generate(input: DecomposeIdeaInput): Promise<unknown>;
}

export interface SpecGraphRepository {
  saveGeneratedGraph(graph: DecompositionOutput): Promise<void>;
}

export interface DecompositionServiceDependencies {
  reader: ConfirmedInterpretationReader;
  generator: DecompositionGenerator;
  repository: SpecGraphRepository;
}

export interface UpdateNodeCommand {
  projectId: string;
  clientRef: string;
  title: string;
  content: string;
  reason?: string | null;
}

export interface CreateRelationCommand {
  projectId: string;
  sourceClientRef: string;
  targetClientRef: string;
  type: SpecRelationType;
}

export interface DeleteRelationCommand {
  projectId: string;
  relationId: string;
}

export interface ChangeStatusCommand {
  projectId: string;
  clientRef: string;
  toStatus: Extract<PersistedNodeStatus, "USER_CONFIRMED" | "USER_REJECTED">;
  reason: string;
}

export interface SpecGraphStore extends SpecGraphRepository {
  getByProject(projectId: string): Promise<SpecGraphView | null>;
  updateNode(command: UpdateNodeCommand): Promise<SpecGraphView>;
  createRelation(command: CreateRelationCommand): Promise<SpecGraphView>;
  deleteRelation(command: DeleteRelationCommand): Promise<SpecGraphView>;
  changeStatus(command: ChangeStatusCommand): Promise<SpecGraphView>;
}
