/**
 * TEST/LOCAL-DEVELOPMENT ONLY: these deterministic adapters are injected by
 * automated tests and must not be composed into the production HTTP process.
 */

import {
  ConfirmedInterpretationSnapshotSchema,
  DecomposeIdeaInputSchema,
  DecompositionOutputSchema,
  NodeStatusHistorySchema,
  SpecGraphViewSchema,
  SpecNodeSchema,
  SpecRelationSchema,
  type ConfirmedInterpretationSnapshot,
  type DecomposeIdeaInput,
  type DecompositionOutput,
} from "@specloop/schemas";

import {
  SpecGraphEditValidationError,
  SpecGraphNotFoundError,
  SpecNodeNotFoundError,
  SpecRelationNotFoundError,
} from "./errors.js";
import type {
  ChangeStatusCommand,
  ConfirmedInterpretationReader,
  CreateRelationCommand,
  DecompositionGenerator,
  DeleteRelationCommand,
  SpecGraphStore,
  UpdateNodeCommand,
} from "./ports.js";

export class DeterministicConfirmedInterpretationReader implements ConfirmedInterpretationReader {
  private readonly snapshots: readonly ConfirmedInterpretationSnapshot[];

  constructor(snapshots: readonly ConfirmedInterpretationSnapshot[]) {
    this.snapshots = snapshots.map((snapshot) =>
      ConfirmedInterpretationSnapshotSchema.parse(snapshot)
    );
  }

  async getConfirmedByProject(
    projectId: string
  ): Promise<ConfirmedInterpretationSnapshot | null> {
    const snapshot = this.snapshots.find(
      (candidate) =>
        candidate.projectId === projectId &&
        candidate.status === "USER_CONFIRMED"
    );
    return snapshot ? structuredClone(snapshot) : null;
  }
}

export class DeterministicDecompositionGenerator implements DecompositionGenerator {
  constructor(
    private readonly factory: (input: DecomposeIdeaInput) => DecompositionOutput
  ) {}

  async generate(input: DecomposeIdeaInput): Promise<unknown> {
    const parsedInput = DecomposeIdeaInputSchema.parse(input);
    return DecompositionOutputSchema.parse(this.factory(parsedInput));
  }
}

export class InMemorySpecGraphRepository implements SpecGraphStore {
  private readonly graphs = new Map<
    string,
    ReturnType<typeof SpecGraphViewSchema.parse>
  >();

  async saveGeneratedGraph(graph: DecompositionOutput): Promise<void> {
    const parsed = DecompositionOutputSchema.parse(graph);
    const now = new Date().toISOString();
    const nodeIds = new Map<string, string>();

    const nodes = parsed.nodes.map((node) => {
      const id = crypto.randomUUID();
      nodeIds.set(node.clientRef, id);
      return SpecNodeSchema.parse({
        id,
        projectId: parsed.projectId,
        clientRef: node.clientRef,
        type: node.type,
        title: node.title,
        content: node.content,
        status: node.status,
        sourceRefs: node.sourceRefs,
        ...(node.reason === undefined ? {} : { reason: node.reason }),
        createdAt: now,
        updatedAt: now,
      });
    });

    const relations = parsed.relations.map((relation) => {
      const sourceNodeId = nodeIds.get(relation.sourceClientRef);
      const targetNodeId = nodeIds.get(relation.targetClientRef);
      if (!sourceNodeId || !targetNodeId) {
        throw new SpecGraphEditValidationError(
          "A generated relation references a node outside the project graph."
        );
      }

      return SpecRelationSchema.parse({
        id: crypto.randomUUID(),
        projectId: parsed.projectId,
        sourceNodeId,
        targetNodeId,
        type: relation.type,
        createdAt: now,
      });
    });

    const view = SpecGraphViewSchema.parse({
      projectId: parsed.projectId,
      nodes,
      relations,
      warnings: parsed.warnings,
      statusHistory: [],
    });

    this.graphs.set(parsed.projectId, view);
  }

  async getByProject(
    projectId: string
  ): Promise<ReturnType<typeof SpecGraphViewSchema.parse> | null> {
    const view = this.graphs.get(projectId);
    return view ? this.clone(view) : null;
  }

  async updateNode(
    command: UpdateNodeCommand
  ): Promise<ReturnType<typeof SpecGraphViewSchema.parse>> {
    const view = this.requireGraph(command.projectId);
    const nodeIndex = view.nodes.findIndex(
      (node) => node.clientRef === command.clientRef
    );
    if (nodeIndex < 0) {
      throw new SpecNodeNotFoundError(command.clientRef);
    }

    const current = view.nodes[nodeIndex];
    if (!current) {
      throw new SpecNodeNotFoundError(command.clientRef);
    }
    const now = new Date().toISOString();
    const { reason: currentReason, ...nodeWithoutReason } = current;
    const candidateNode =
      command.reason === null
        ? {
            ...nodeWithoutReason,
            title: command.title,
            content: command.content,
            updatedAt: now,
          }
        : {
            ...current,
            title: command.title,
            content: command.content,
            updatedAt: now,
            ...(command.reason === undefined
              ? currentReason === undefined
                ? {}
                : { reason: currentReason }
              : { reason: command.reason }),
          };

    let parsedNode: ReturnType<typeof SpecNodeSchema.parse>;
    try {
      parsedNode = SpecNodeSchema.parse(candidateNode);
    } catch (error) {
      throw new SpecGraphEditValidationError("The edited node is invalid.", {
        cause: error,
      });
    }

    const nodes = [...view.nodes];
    nodes[nodeIndex] = parsedNode;
    return this.commit({ ...view, nodes });
  }

  async createRelation(
    command: CreateRelationCommand
  ): Promise<ReturnType<typeof SpecGraphViewSchema.parse>> {
    const view = this.requireGraph(command.projectId);
    const source = view.nodes.find(
      (node) => node.clientRef === command.sourceClientRef
    );
    const target = view.nodes.find(
      (node) => node.clientRef === command.targetClientRef
    );
    if (!source) {
      throw new SpecNodeNotFoundError(command.sourceClientRef);
    }
    if (!target) {
      throw new SpecNodeNotFoundError(command.targetClientRef);
    }
    if (source.id === target.id) {
      throw new SpecGraphEditValidationError("Self-relations are not allowed.");
    }

    const duplicate = view.relations.some(
      (relation) =>
        relation.sourceNodeId === source.id &&
        relation.targetNodeId === target.id &&
        relation.type === command.type
    );
    if (duplicate) {
      throw new SpecGraphEditValidationError(
        "The requested relation already exists."
      );
    }

    const relation = SpecRelationSchema.parse({
      id: crypto.randomUUID(),
      projectId: command.projectId,
      sourceNodeId: source.id,
      targetNodeId: target.id,
      type: command.type,
      createdAt: new Date().toISOString(),
    });

    return this.commit({ ...view, relations: [...view.relations, relation] });
  }

  async deleteRelation(
    command: DeleteRelationCommand
  ): Promise<ReturnType<typeof SpecGraphViewSchema.parse>> {
    const view = this.requireGraph(command.projectId);
    const relationIndex = view.relations.findIndex(
      (relation) => relation.id === command.relationId
    );
    if (relationIndex < 0) {
      throw new SpecRelationNotFoundError(command.relationId);
    }

    const relations = [...view.relations];
    relations.splice(relationIndex, 1);
    return this.commit({ ...view, relations });
  }

  async changeStatus(
    command: ChangeStatusCommand
  ): Promise<ReturnType<typeof SpecGraphViewSchema.parse>> {
    const view = this.requireGraph(command.projectId);
    const nodeIndex = view.nodes.findIndex(
      (node) => node.clientRef === command.clientRef
    );
    if (nodeIndex < 0) {
      throw new SpecNodeNotFoundError(command.clientRef);
    }

    const current = view.nodes[nodeIndex];
    if (!current) {
      throw new SpecNodeNotFoundError(command.clientRef);
    }
    const occurredAt = new Date().toISOString();
    let history;
    try {
      history = NodeStatusHistorySchema.parse({
        id: crypto.randomUUID(),
        projectId: command.projectId,
        nodeId: current.id,
        fromStatus: current.status,
        toStatus: command.toStatus,
        actor: "USER",
        authority: "USER",
        reason: command.reason,
        occurredAt,
      });
    } catch (error) {
      throw new SpecGraphEditValidationError(
        "The requested status transition is invalid.",
        { cause: error }
      );
    }

    const nodes = [...view.nodes];
    nodes[nodeIndex] = SpecNodeSchema.parse({
      ...current,
      status: command.toStatus,
      updatedAt: occurredAt,
    });
    return this.commit({
      ...view,
      nodes,
      statusHistory: [...view.statusHistory, history],
    });
  }

  private requireGraph(
    projectId: string
  ): ReturnType<typeof SpecGraphViewSchema.parse> {
    const view = this.graphs.get(projectId);
    if (!view) {
      throw new SpecGraphNotFoundError(projectId);
    }
    return this.clone(view);
  }

  private commit(
    view: ReturnType<typeof SpecGraphViewSchema.parse>
  ): ReturnType<typeof SpecGraphViewSchema.parse> {
    const parsed = SpecGraphViewSchema.parse(view);
    this.graphs.set(parsed.projectId, parsed);
    return this.clone(parsed);
  }

  private clone(
    view: ReturnType<typeof SpecGraphViewSchema.parse>
  ): ReturnType<typeof SpecGraphViewSchema.parse> {
    return SpecGraphViewSchema.parse(structuredClone(view));
  }
}
