import {
  AiGeneratedNodeStatusSchema,
  DecompositionOutputSchema,
  NodeStatusHistorySchema,
  SpecGraphViewSchema,
  SpecNodeSchema,
  SpecRelationSchema,
  type DecompositionOutput,
  type PersistedNodeStatus,
  type SpecGraphView,
} from "@specloop/schemas";
import { and, desc, eq, sql } from "drizzle-orm";

import {
  SpecGraphEditValidationError,
  SpecGraphConflictError,
  SpecGraphNotFoundError,
  SpecNodeNotFoundError,
  SpecRelationNotFoundError,
} from "./errors.js";
import type {
  ChangeStatusCommand,
  CreateRelationCommand,
  DeleteRelationCommand,
  SpecGraphStore,
  UpdateNodeCommand,
} from "./ports.js";
import { calculateDeterministicWarnings } from "./status-rules.js";
import { getDb } from "../../db/client.js";
import { interpretations, projects, specGraphs } from "../../db/schema.js";

function isAiGeneratedStatus(
  status: PersistedNodeStatus
): status is ReturnType<typeof AiGeneratedNodeStatusSchema.parse> {
  return AiGeneratedNodeStatusSchema.safeParse(status).success;
}

function warningPriority(
  code: "MISSING" | "AMBIGUOUS" | "UNSUPPORTED" | "CONFLICT"
) {
  switch (code) {
    case "CONFLICT":
      return 4;
    case "AMBIGUOUS":
      return 3;
    case "UNSUPPORTED":
      return 2;
    case "MISSING":
      return 1;
  }
}

function ensureProjectExists(projectId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(projects)
    .values({
      id: projectId,
      title: "Test Project",
      domain: null,
      rawIdea: "placeholder",
      resourceConstraints: "[]",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .run();
}

function parseGraphRow(row: typeof specGraphs.$inferSelect): SpecGraphView {
  return SpecGraphViewSchema.parse(JSON.parse(row.data as string));
}

/**
 * P0 process-scoped graph repository. It is intentionally small and
 * replaceable: the module boundary is production-safe, while PostgreSQL
 * remains a later persistence adapter rather than being silently presented
 * as implemented. Backing data lives in SQLite via Drizzle.
 */
export class InMemorySpecGraphStore implements SpecGraphStore {
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

    const statusHistory = nodes.map((node) =>
      NodeStatusHistorySchema.parse({
        id: crypto.randomUUID(),
        projectId: parsed.projectId,
        nodeId: node.id,
        fromStatus: null,
        toStatus: node.status,
        actor: "AI",
        authority: "AI",
        reason: node.reason ?? "Generated as a proposed decomposition card.",
        occurredAt: now,
      })
    );

    const view = SpecGraphViewSchema.parse({
      projectId: parsed.projectId,
      nodes,
      relations,
      warnings: parsed.warnings,
      statusHistory,
    });

    ensureProjectExists(parsed.projectId);
    // Keep FK to interpretations — set interpretationId to latest confirmed interpretation via subquery
    const db = getDb();
    const latestConfirmed = db
      .select({ id: interpretations.id })
      .from(interpretations)
      .where(and(eq(interpretations.projectId, parsed.projectId), eq(interpretations.status, "USER_CONFIRMED")))
      .orderBy(desc(interpretations.createdAt))
      .get();

    const interpretationId = latestConfirmed?.id ?? null;

    db.insert(specGraphs)
      .values({
        projectId: parsed.projectId,
        interpretationId,
        data: JSON.stringify(view),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [specGraphs.projectId],
        set: {
          interpretationId,
          data: JSON.stringify(view),
          updatedAt: now,
        },
      })
      .run();
  }

  async getByProject(projectId: string): Promise<SpecGraphView | null> {
    const db = getDb();
    const row = db.select().from(specGraphs).where(eq(specGraphs.projectId, projectId)).get();
    return row ? this.clone(parseGraphRow(row)) : null;
  }

  async updateNode(command: UpdateNodeCommand): Promise<SpecGraphView> {
    const view = this.requireGraph(command.projectId);
    const nodeIndex = view.nodes.findIndex(
      (node) => node.clientRef === command.clientRef
    );
    if (nodeIndex < 0) throw new SpecNodeNotFoundError(command.clientRef);

    const current = view.nodes[nodeIndex];
    if (!current) throw new SpecNodeNotFoundError(command.clientRef);
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

    let parsedNode: SpecGraphView["nodes"][number];
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

  async createRelation(command: CreateRelationCommand): Promise<SpecGraphView> {
    const view = this.requireGraph(command.projectId);
    const source = view.nodes.find(
      (node) => node.clientRef === command.sourceClientRef
    );
    const target = view.nodes.find(
      (node) => node.clientRef === command.targetClientRef
    );
    if (!source) throw new SpecNodeNotFoundError(command.sourceClientRef);
    if (!target) throw new SpecNodeNotFoundError(command.targetClientRef);
    if (source.id === target.id) {
      throw new SpecGraphConflictError("Self-relations are not allowed.");
    }

    const duplicate = view.relations.some(
      (relation) =>
        relation.sourceNodeId === source.id &&
        relation.targetNodeId === target.id &&
        relation.type === command.type
    );
    if (duplicate) {
      throw new SpecGraphConflictError(
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

  async deleteRelation(command: DeleteRelationCommand): Promise<SpecGraphView> {
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

  async changeStatus(command: ChangeStatusCommand): Promise<SpecGraphView> {
    const view = this.requireGraph(command.projectId);
    const nodeIndex = view.nodes.findIndex(
      (node) => node.clientRef === command.clientRef
    );
    if (nodeIndex < 0) throw new SpecNodeNotFoundError(command.clientRef);

    const current = view.nodes[nodeIndex];
    if (!current) throw new SpecNodeNotFoundError(command.clientRef);
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

  private requireGraph(projectId: string): SpecGraphView {
    const db = getDb();
    const row = db.select().from(specGraphs).where(eq(specGraphs.projectId, projectId)).get();
    if (!row) throw new SpecGraphNotFoundError(projectId);
    return this.clone(parseGraphRow(row));
  }

  private commit(view: SpecGraphView): SpecGraphView {
    const now = new Date().toISOString();
    const nodeById = new Map(view.nodes.map((node) => [node.id, node]));
    const relationGraph = {
      projectId: view.projectId,
      nodes: view.nodes.map((node) => ({
        projectId: node.projectId,
        clientRef: node.clientRef,
        type: node.type,
        status: node.status,
        sourceRefs: node.sourceRefs,
      })),
      relations: view.relations.flatMap((relation) => {
        const source = nodeById.get(relation.sourceNodeId);
        const target = nodeById.get(relation.targetNodeId);
        return source && target
          ? [
              {
                projectId: relation.projectId,
                sourceClientRef: source.clientRef,
                targetClientRef: target.clientRef,
                type: relation.type,
              },
            ]
          : [];
      }),
    };
    const warnings = calculateDeterministicWarnings(relationGraph, {
      existingWarnings: view.warnings,
      preserveCodes: ["AMBIGUOUS"],
    });
    const warningByRef = new Map<string, (typeof warnings)[number]>();
    for (const warning of warnings) {
      if (!warning.targetClientRef) continue;
      const current = warningByRef.get(warning.targetClientRef);
      if (
        !current ||
        warningPriority(warning.code) > warningPriority(current.code)
      ) {
        warningByRef.set(warning.targetClientRef, warning);
      }
    }

    const statusHistory = [...view.statusHistory];
    const nodes = view.nodes.map((node) => {
      if (!isAiGeneratedStatus(node.status)) return node;
      const warning = warningByRef.get(node.clientRef);
      const nextStatus = warning?.code ?? "PROPOSED";
      if (nextStatus === node.status) {
        if (!warning || node.reason === warning.reason) return node;
        return SpecNodeSchema.parse({
          ...node,
          reason: warning.reason,
          updatedAt: now,
        });
      }

      statusHistory.push(
        NodeStatusHistorySchema.parse({
          id: crypto.randomUUID(),
          projectId: node.projectId,
          nodeId: node.id,
          fromStatus: node.status,
          toStatus: nextStatus,
          actor: "SYSTEM",
          authority: "SYSTEM",
          reason:
            warning?.reason ??
            "The graph changed and the previous deterministic finding no longer applies.",
          occurredAt: now,
        })
      );

      const { reason: _reason, ...withoutReason } = node;
      return SpecNodeSchema.parse({
        ...withoutReason,
        status: nextStatus,
        ...(warning ? { reason: warning.reason } : {}),
        updatedAt: now,
      });
    });

    const parsed = SpecGraphViewSchema.parse({
      ...view,
      nodes,
      warnings,
      statusHistory,
    });
    const db = getDb();
    // Upsert with latest interpretationId
    const latestConfirmed = db
      .select({ id: interpretations.id })
      .from(interpretations)
      .where(and(eq(interpretations.projectId, parsed.projectId), eq(interpretations.status, "USER_CONFIRMED")))
      .orderBy(desc(interpretations.createdAt))
      .get();
    const interpretationId = (latestConfirmed as any)?.id ?? null;
    db.insert(specGraphs)
      .values({
        projectId: parsed.projectId,
        interpretationId,
        data: JSON.stringify(parsed),
        createdAt: new Date().toISOString(),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [specGraphs.projectId],
        set: {
          interpretationId,
          data: JSON.stringify(parsed),
          updatedAt: now,
        },
      })
      .run();
    return this.clone(parsed);
  }

  private clone(view: SpecGraphView): SpecGraphView {
    return SpecGraphViewSchema.parse(structuredClone(view));
  }
}


