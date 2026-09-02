import {
  InterpretationDecisionSchema,
  InterpretationOutputSchema,
  InterpretationRecordSchema,
  type InterpretationDecision,
  type InterpretationOutput,
  type InterpretationRecord,
} from "@specloop/schemas";
import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "../../db/client.js";
import {
  interpretationDecisions,
  interpretations,
  projects,
} from "../../db/schema.js";

export class InterpretationLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterpretationLifecycleError";
  }
}

export interface ReviseInterpretationCommand {
  projectId: string;
  sourceInterpretationId: string;
  action: "EDIT" | "OTHER";
  output: InterpretationOutput;
  actorId: string;
}

export interface ConfirmInterpretationCommand {
  projectId: string;
  interpretationId: string;
  actorId: string;
}

export interface InterpretationRepository {
  saveInitialProposal(
    record: InterpretationRecord
  ): Promise<InterpretationRecord>;
  saveRegeneratedProposal(
    record: InterpretationRecord,
    actorId: string
  ): Promise<InterpretationRecord>;
  revise(command: ReviseInterpretationCommand): Promise<InterpretationRecord>;
  confirm(command: ConfirmInterpretationCommand): Promise<InterpretationRecord>;
  getById(
    projectId: string,
    interpretationId: string
  ): Promise<InterpretationRecord | null>;
  getLatestByProject(projectId: string): Promise<InterpretationRecord | null>;
  getConfirmedByProject(
    projectId: string
  ): Promise<InterpretationRecord | null>;
  listDecisions(projectId: string): Promise<InterpretationDecision[]>;
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

function parseInterpretationRow(row: typeof interpretations.$inferSelect): InterpretationRecord {
  return InterpretationRecordSchema.parse(JSON.parse(row.data as string));
}

function parseDecisionRow(row: typeof interpretationDecisions.$inferSelect): InterpretationDecision {
  return InterpretationDecisionSchema.parse(JSON.parse(row.data as string));
}

export class InMemoryInterpretationRepository implements InterpretationRepository {
  async saveInitialProposal(
    record: InterpretationRecord
  ): Promise<InterpretationRecord> {
    const parsed = InterpretationRecordSchema.parse(record);
    if (parsed.status !== "PROPOSED" || parsed.confirmedAt !== null) {
      throw new InterpretationLifecycleError(
        "A generated interpretation must begin as PROPOSED."
      );
    }
    ensureProjectExists(parsed.projectId);
    const db = getDb();
    const existing = db.select().from(interpretations).where(eq(interpretations.projectId, parsed.projectId)).all();
    if (existing.length > 0) {
      throw new InterpretationLifecycleError(
        "An existing interpretation must be revised or regenerated explicitly."
      );
    }
    return this.persist(parsed);
  }

  async saveRegeneratedProposal(
    record: InterpretationRecord,
    actorId: string
  ): Promise<InterpretationRecord> {
    const parsed = InterpretationRecordSchema.parse(record);
    if (parsed.status !== "PROPOSED" || parsed.confirmedAt !== null) {
      throw new InterpretationLifecycleError(
        "A regenerated interpretation must begin as PROPOSED."
      );
    }
    const db = getDb();
    const existing = db.select().from(interpretations).where(eq(interpretations.projectId, parsed.projectId)).all();
    if (existing.length === 0) {
      throw new InterpretationLifecycleError(
        "Regenerate requires an existing interpretation."
      );
    }

    this.supersedeActive(parsed.projectId);
    const saved = await this.persist(parsed);
    this.recordDecision({
      projectId: parsed.projectId,
      interpretationId: parsed.interpretationId,
      action: "REGENERATE",
      content: null,
      actorId,
    });
    return saved;
  }

  async revise(
    command: ReviseInterpretationCommand
  ): Promise<InterpretationRecord> {
    const source = this.requireRecord(
      command.projectId,
      command.sourceInterpretationId
    );
    if (source.status === "SUPERSEDED") {
      throw new InterpretationLifecycleError(
        "A superseded interpretation cannot be revised."
      );
    }

    const output = InterpretationOutputSchema.parse(command.output);
    this.supersedeActive(command.projectId);
    const revised = await this.persist({
      ...source,
      interpretationId: crypto.randomUUID(),
      output,
      status: "PROPOSED",
      createdAt: new Date().toISOString(),
      confirmedAt: null,
    });
    this.recordDecision({
      projectId: command.projectId,
      interpretationId: revised.interpretationId,
      action: command.action,
      content: output.simpleInterpretation,
      actorId: command.actorId,
    });
    return revised;
  }

  async confirm(
    command: ConfirmInterpretationCommand
  ): Promise<InterpretationRecord> {
    const selected = this.requireRecord(
      command.projectId,
      command.interpretationId
    );
    if (selected.status !== "PROPOSED") {
      throw new InterpretationLifecycleError(
        "Only a proposed interpretation can be confirmed."
      );
    }

    this.supersedeActive(command.projectId, selected.interpretationId);
    const confirmed = await this.persist({
      ...selected,
      status: "USER_CONFIRMED",
      confirmedAt: new Date().toISOString(),
    });
    this.recordDecision({
      projectId: command.projectId,
      interpretationId: selected.interpretationId,
      action: "CONFIRM",
      content: null,
      actorId: command.actorId,
    });
    return confirmed;
  }

  async getById(
    projectId: string,
    interpretationId: string
  ): Promise<InterpretationRecord | null> {
    const db = getDb();
    const row = db
      .select()
      .from(interpretations)
      .where(and(eq(interpretations.projectId, projectId), eq(interpretations.id, interpretationId)))
      .get();
    return row ? this.cloneRecord(parseInterpretationRow(row)) : null;
  }

  async getLatestByProject(
    projectId: string
  ): Promise<InterpretationRecord | null> {
    const db = getDb();
    // Prefer active (not superseded) ordered by createdAt desc
    const active = db
      .select()
      .from(interpretations)
      .where(and(eq(interpretations.projectId, projectId), sql`${interpretations.status} != 'SUPERSEDED'`))
      .orderBy(desc(interpretations.createdAt))
      .get();
    if (active) return this.cloneRecord(parseInterpretationRow(active));
    const fallback = db
      .select()
      .from(interpretations)
      .where(eq(interpretations.projectId, projectId))
      .orderBy(desc(interpretations.createdAt))
      .get();
    return fallback ? this.cloneRecord(parseInterpretationRow(fallback)) : null;
  }

  async getConfirmedByProject(
    projectId: string
  ): Promise<InterpretationRecord | null> {
    const db = getDb();
    const row = db
      .select()
      .from(interpretations)
      .where(and(eq(interpretations.projectId, projectId), eq(interpretations.status, "USER_CONFIRMED")))
      .orderBy(desc(interpretations.createdAt))
      .get();
    return row ? this.cloneRecord(parseInterpretationRow(row)) : null;
  }

  async listDecisions(projectId: string): Promise<InterpretationDecision[]> {
    const db = getDb();
    const rows = db.select().from(interpretationDecisions).where(eq(interpretationDecisions.projectId, projectId)).all();
    return rows.map(parseDecisionRow).map((d) => structuredClone(d));
  }

  private requireRecord(
    projectId: string,
    interpretationId: string
  ): InterpretationRecord {
    const db = getDb();
    const row = db
      .select()
      .from(interpretations)
      .where(and(eq(interpretations.projectId, projectId), eq(interpretations.id, interpretationId)))
      .get();
    if (!row) {
      throw new InterpretationLifecycleError(
        `Interpretation ${interpretationId} was not found in project ${projectId}.`
      );
    }
    return parseInterpretationRow(row);
  }

  private supersedeActive(projectId: string, exceptId?: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    // Single UPDATE per spec: status='SUPERSEDED' WHERE projectId=? AND id != ? AND status != 'SUPERSEDED'
    // Also patch JSON data to keep it consistent.
    if (exceptId) {
      db.update(interpretations)
        .set({
          status: "SUPERSEDED",
          data: sql`json_set(${interpretations.data}, '$.status', 'SUPERSEDED', '$.confirmedAt', null)`,
          updatedAt: now,
        })
        .where(
          and(
            eq(interpretations.projectId, projectId),
            sql`${interpretations.id} != ${exceptId}`,
            sql`${interpretations.status} != 'SUPERSEDED'`
          )
        )
        .run();
    } else {
      db.update(interpretations)
        .set({
          status: "SUPERSEDED",
          data: sql`json_set(${interpretations.data}, '$.status', 'SUPERSEDED', '$.confirmedAt', null)`,
          updatedAt: now,
        })
        .where(
          and(
            eq(interpretations.projectId, projectId),
            sql`${interpretations.status} != 'SUPERSEDED'`
          )
        )
        .run();
    }
  }

  private async persist(record: InterpretationRecord): Promise<InterpretationRecord> {
    const parsed = InterpretationRecordSchema.parse(record);
    ensureProjectExists(parsed.projectId);
    const db = getDb();
    db.insert(interpretations)
      .values({
        id: parsed.interpretationId,
        projectId: parsed.projectId,
        status: parsed.status,
        data: JSON.stringify(parsed),
        createdAt: parsed.createdAt,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: [interpretations.id],
        set: {
          projectId: parsed.projectId,
          status: parsed.status,
          data: JSON.stringify(parsed),
          updatedAt: new Date().toISOString(),
        },
      })
      .run();
    return this.cloneRecord(parsed);
  }

  private recordDecision(
    input: Omit<InterpretationDecision, "id" | "createdAt">
  ): void {
    const decision = InterpretationDecisionSchema.parse({
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    const db = getDb();
    db.insert(interpretationDecisions)
      .values({
        id: decision.id,
        projectId: decision.projectId,
        interpretationId: decision.interpretationId,
        data: JSON.stringify(decision),
        createdAt: decision.createdAt,
      })
      .run();
  }

  private cloneRecord(record: InterpretationRecord): InterpretationRecord {
    return InterpretationRecordSchema.parse(structuredClone(record));
  }
}

export const interpretationRepository = new InMemoryInterpretationRepository();
