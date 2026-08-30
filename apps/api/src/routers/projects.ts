/**
 * Projects router (skeleton).
 *
 * The full project lifecycle is delivered through US-01…US-06 in the backlog.
 * This router exposes the minimum typed surface so the web app can prove
 * end-to-end type safety against the backend today:
 *
 *   - `projects.list`  → paginated list of project summaries
 *   - `projects.create`→ create a new project from a raw idea
 *
 * Persistence is intentionally in-memory in P0; the PostgreSQL repository is
 * introduced when the project module is implemented.
 */

import {
  CreateProjectInputSchema,
  ListProjectsInputSchema,
  ListProjectsOutputSchema,
  ProjectSummarySchema,
  UuidSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { PersistedMap } from "../db/persisted-map.js";
import { protectedProcedure, publicProcedure, router } from "../trpc/trpc.js";

export interface ProjectRecord {
  id: string;
  title: string;
  domain: string | null;
  rawIdea: string;
  resourceConstraints: string[];
  createdAt: string;
  updatedAt: string;
}

const projects = new PersistedMap<ProjectRecord>({ storeKey: "projectsById" });

/** For `db/hydrate.ts` — hydrates the same way every other store does. */
export async function hydrateProjectsStore(): Promise<void> {
  await projects.hydrate();
}

/**
 * Look up a project's raw idea/constraints for other modules (e.g. the
 * interpretation service, which needs `rawIdea` per AIT-01's input
 * contract). Returns `undefined` rather than throwing so callers can decide
 * their own not-found handling.
 */
export function getProjectById(id: string): ProjectRecord | undefined {
  return projects.get(id);
}

function toSummary(record: ProjectRecord) {
  return ProjectSummarySchema.parse({
    id: record.id,
    title: record.title,
    domain: record.domain,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export const projectsRouter = router({
  list: publicProcedure
    .input(ListProjectsInputSchema)
    .output(ListProjectsOutputSchema)
    .query(({ input }) => {
      const all = Array.from(projects.values()).sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
      const startIndex = input.cursor
        ? all.findIndex((p) => p.id === input.cursor) + 1
        : 0;
      const page = all.slice(startIndex, startIndex + input.limit);
      const nextCursor =
        startIndex + input.limit < all.length
          ? (page[page.length - 1]?.id ?? null)
          : null;
      return {
        items: page.map(toSummary),
        nextCursor,
      };
    }),

  create: protectedProcedure
    .input(CreateProjectInputSchema)
    .output(ProjectSummarySchema)
    .mutation(({ input }) => {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      UuidSchema.parse(id);
      const record: ProjectRecord = {
        id,
        title: input.title,
        domain: input.domain ?? null,
        rawIdea: input.rawIdea,
        resourceConstraints: input.resourceConstraints,
        createdAt: now,
        updatedAt: now,
      };
      projects.set(id, record);
      return toSummary(record);
    }),

  byId: publicProcedure
    .input(z.object({ id: UuidSchema }))
    .output(ProjectSummarySchema.nullable())
    .query(({ input }) => {
      const record = projects.get(input.id);
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.id} not found.`,
        });
      }
      return toSummary(record);
    }),
});
