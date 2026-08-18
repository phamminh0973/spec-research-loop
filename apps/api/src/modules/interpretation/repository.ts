import {
  InterpretationDecisionSchema,
  InterpretationOutputSchema,
  InterpretationRecordSchema,
  type InterpretationDecision,
  type InterpretationOutput,
  type InterpretationRecord,
} from "@specloop/schemas";

import {
  interpretationDecisionsByProject,
  interpretationsByProject,
} from "../../store/project-store.js";

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
    if (this.projectRecords(parsed.projectId).size > 0) {
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
    if (this.projectRecords(parsed.projectId).size === 0) {
      throw new InterpretationLifecycleError(
        "Regenerate requires an existing interpretation."
      );
    }

    this.supersedeActive(parsed.projectId);
    const saved = this.persist(parsed);
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
    const revised = this.persist({
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
    const confirmed = this.persist({
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
    const record = this.projectRecords(projectId).get(interpretationId);
    return record ? this.cloneRecord(record) : null;
  }

  async getLatestByProject(
    projectId: string
  ): Promise<InterpretationRecord | null> {
    const records = [...this.projectRecords(projectId).values()];
    const active = records.filter((record) => record.status !== "SUPERSEDED");
    const latest = (active.length > 0 ? active : records).at(-1);
    return latest ? this.cloneRecord(latest) : null;
  }

  async getConfirmedByProject(
    projectId: string
  ): Promise<InterpretationRecord | null> {
    const record = [...this.projectRecords(projectId).values()].find(
      (candidate) => candidate.status === "USER_CONFIRMED"
    );
    return record ? this.cloneRecord(record) : null;
  }

  async listDecisions(projectId: string): Promise<InterpretationDecision[]> {
    return structuredClone(interpretationDecisionsByProject.get(projectId) ?? []);
  }

  private projectRecords(projectId: string): Map<string, InterpretationRecord> {
    const existing = interpretationsByProject.get(projectId);
    if (existing) return existing;
    const created = new Map<string, InterpretationRecord>();
    interpretationsByProject.set(projectId, created);
    return created;
  }

  private requireRecord(
    projectId: string,
    interpretationId: string
  ): InterpretationRecord {
    const record = this.projectRecords(projectId).get(interpretationId);
    if (!record) {
      throw new InterpretationLifecycleError(
        `Interpretation ${interpretationId} was not found in project ${projectId}.`
      );
    }
    return record;
  }

  private supersedeActive(projectId: string, exceptId?: string): void {
    const records = this.projectRecords(projectId);
    for (const [id, record] of records) {
      if (id === exceptId || record.status === "SUPERSEDED") continue;
      records.set(
        id,
        InterpretationRecordSchema.parse({
          ...record,
          status: "SUPERSEDED",
          confirmedAt: null,
        })
      );
    }
  }

  private persist(record: InterpretationRecord): InterpretationRecord {
    const parsed = InterpretationRecordSchema.parse(record);
    this.projectRecords(parsed.projectId).set(parsed.interpretationId, parsed);
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
    const projectDecisions =
      interpretationDecisionsByProject.get(input.projectId) ?? [];
    interpretationDecisionsByProject.set(input.projectId, [
      ...projectDecisions,
      decision,
    ]);
  }

  private cloneRecord(record: InterpretationRecord): InterpretationRecord {
    return InterpretationRecordSchema.parse(structuredClone(record));
  }
}

export const interpretationRepository = new InMemoryInterpretationRepository();
