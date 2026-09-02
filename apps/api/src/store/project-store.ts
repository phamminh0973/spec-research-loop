import { TRPCError } from "@trpc/server";
import { UuidSchema } from "@specloop/schemas";
import { getDb } from "../db/client.js";
import {
  atomicClaims,
  contributions,
  evidenceRequirements,
  evidenceSpans,
  experimentPlans,
  findingResolutions,
  gapProposals,
  interpretationDecisions,
  interpretations,
  judgePanels,
  projects,
  researchSpecs,
  sources,
  specGraphs,
} from "../db/schema.js";

export function parseOrThrow<T>(
  schema: { parse: (v: unknown) => T },
  value: unknown,
  label: string,
): T {
  try {
    return schema.parse(value);
  } catch (err) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Invalid ${label} record in store: ${(err as Error).message}`,
    });
  }
}

export function assertUuid(id: string, label = "id"): void {
  UuidSchema.parse(id);
  void label;
}

export function resetProjectStore(): void {
  const db = getDb();
  db.delete(findingResolutions).run();
  db.delete(researchSpecs).run();
  db.delete(judgePanels).run();
  db.delete(experimentPlans).run();
  db.delete(evidenceRequirements).run();
  db.delete(contributions).run();
  db.delete(atomicClaims).run();
  db.delete(gapProposals).run();
  db.delete(evidenceSpans).run();
  db.delete(sources).run();
  db.delete(specGraphs).run();
  db.delete(interpretationDecisions).run();
  db.delete(interpretations).run();
  db.delete(projects).run();
}
