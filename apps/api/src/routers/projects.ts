/**
 * Projects router — now one table per entity with FKs.
 *
 * Each project is stored in the dedicated `projects` table. All access is via
 * Drizzle ORM directly, no generic store. Other tables FK to `projects.id`
 * so each workflow step is linked to its project and, via additional FKs,
 * to the previous step's result.
 */

import {
  CreateProjectInputSchema,
  ListProjectsInputSchema,
  ListProjectsOutputSchema,
  ProjectSummarySchema,
  UuidSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { projects } from "../db/schema.js";
import { parseOrThrow } from "../store/project-store.js";
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

function rowToRecord(row: typeof projects.$inferSelect): ProjectRecord {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    rawIdea: row.rawIdea,
    resourceConstraints: parseOrThrow(
      z.array(z.string()),
      JSON.parse(row.resourceConstraints as string),
      "resourceConstraints"
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getProjectRow(id: string): ProjectRecord | undefined {
  const db = getDb();
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) return undefined;
  return rowToRecord(row);
}

function setProjectRow(record: ProjectRecord): void {
  const db = getDb();
  db.insert(projects)
    .values({
      id: record.id,
      title: record.title,
      domain: record.domain,
      rawIdea: record.rawIdea,
      resourceConstraints: JSON.stringify(record.resourceConstraints),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
    .onConflictDoUpdate({
      target: [projects.id],
      set: {
        title: record.title,
        domain: record.domain,
        rawIdea: record.rawIdea,
        resourceConstraints: JSON.stringify(record.resourceConstraints),
        updatedAt: record.updatedAt,
      },
    })
    .run();
}

/** For `db/hydrate.ts` — no-op now that Drizzle `migrate` handles table creation. */
export async function hydrateProjectsStore(): Promise<void> {
  // Intentionally empty — `getDb()` in `bootstrapPersistence` already ran `migrate`.
}

/**
 * Look up a project's raw idea/constraints for other modules (e.g. the
 * interpretation service, which needs `rawIdea` per AIT-01's input
 * contract). Returns `undefined` rather than throwing so callers can decide
 * their own not-found handling.
 */
export function getProjectById(id: string): ProjectRecord | undefined {
  return getProjectRow(id);
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

function listAllProjects(): ProjectRecord[] {
  const db = getDb();
  const rows = db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt))
    .all();
  return rows.map(rowToRecord);
}

export const projectsRouter = router({
  list: publicProcedure
    .input(ListProjectsInputSchema)
    .output(ListProjectsOutputSchema)
    .query(({ input }) => {
      const all = listAllProjects();
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
      setProjectRow(record);
      return toSummary(record);
    }),

  byId: publicProcedure
    .input(z.object({ id: UuidSchema }))
    .output(ProjectSummarySchema.nullable())
    .query(({ input }) => {
      const record = getProjectRow(input.id);
      if (!record) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Project ${input.id} not found.`,
        });
      }
      return toSummary(record);
    }),
});
