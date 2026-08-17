/**
 * Deterministic adapters used by automated tests and explicit local fixtures.
 * The runtime graph store lives in `in-memory-store.ts` and is composed by the
 * API context; this file keeps deterministic generator/reader fixtures only.
 */

import {
  ConfirmedInterpretationSnapshotSchema,
  DecomposeIdeaInputSchema,
  DecompositionOutputSchema,
  type ConfirmedInterpretationSnapshot,
  type DecomposeIdeaInput,
  type DecompositionOutput,
} from "@specloop/schemas";

import type {
  ConfirmedInterpretationReader,
  DecompositionGenerator,
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

export { InMemorySpecGraphStore as InMemorySpecGraphRepository } from "./in-memory-store.js";
