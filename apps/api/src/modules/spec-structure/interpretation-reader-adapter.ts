import {
  ConfirmedInterpretationSnapshotSchema,
  type ConfirmedDecision,
  type ConfirmedInterpretationSnapshot,
} from "@specloop/schemas";

import type { InterpretationRepository } from "../../interpretation/repository.js";
import type { ConfirmedInterpretationReader } from "./ports.js";

export interface Step1ProjectBoundary {
  id: string;
  resourceConstraints: string[];
}

export type Step1ProjectReader = (
  projectId: string
) => Step1ProjectBoundary | undefined;

export class Step1ConfirmedInterpretationReader implements ConfirmedInterpretationReader {
  constructor(
    private readonly repository: InterpretationRepository,
    private readonly projectReader: Step1ProjectReader
  ) {}

  async getConfirmedByProject(
    projectId: string
  ): Promise<ConfirmedInterpretationSnapshot | null> {
    const project = this.projectReader(projectId);
    if (!project || project.id !== projectId) return null;

    const record = await this.repository.getConfirmedByProject(projectId);
    if (
      !record ||
      record.projectId !== projectId ||
      record.status !== "USER_CONFIRMED" ||
      record.confirmedAt === null
    ) {
      return null;
    }

    const decisions = await this.repository.listDecisions(projectId);
    const confirmedDecisions: ConfirmedDecision[] = [];
    for (const decision of decisions) {
      if (decision.action === "REGENERATE") continue;
      if (decision.action === "CONFIRM") {
        confirmedDecisions.push({ kind: "CONFIRM" });
        continue;
      }
      if (decision.content !== null) {
        confirmedDecisions.push({
          kind: decision.action,
          content: decision.content,
        });
      }
    }

    return ConfirmedInterpretationSnapshotSchema.parse({
      interpretationId: record.interpretationId,
      projectId,
      simpleInterpretation: record.output.simpleInterpretation,
      technicalInterpretation: record.output.technicalInterpretation,
      assumptions: record.output.assumptions,
      objectives: record.output.objectives,
      ambiguities: record.output.ambiguities,
      confirmedDecisions,
      constraints: project.resourceConstraints,
      status: "USER_CONFIRMED",
      confirmedAt: record.confirmedAt,
    });
  }
}
