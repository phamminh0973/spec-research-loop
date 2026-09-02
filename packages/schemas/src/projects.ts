import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";

export const ProjectSummarySchema = z.object({
  id: UuidSchema,
  title: z.string().min(1).max(200),
  domain: z.string().max(100).nullable(),
  createdAt: IsoTimestampSchema,
  updatedAt: IsoTimestampSchema,
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const CreateProjectInputSchema = z.object({
  title: z.string().min(1).max(200),
  domain: z.string().max(100).optional(),
  rawIdea: z.string().min(10).max(20_000),
  resourceConstraints: z.array(z.string().min(1).max(200)).max(20).default([]),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

export const ListProjectsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: UuidSchema.optional(),
});
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export const ListProjectsOutputSchema = z.object({
  items: z.array(ProjectSummarySchema),
  nextCursor: UuidSchema.nullable(),
});
export type ListProjectsOutput = z.infer<typeof ListProjectsOutputSchema>;
