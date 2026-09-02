import { z } from "zod";

export const UuidSchema = z.string().uuid();
export type Uuid = z.infer<typeof UuidSchema>;

export const IsoTimestampSchema = z
  .string()
  .datetime({ offset: true })
  .describe("ISO 8601 timestamp with offset, e.g. 2026-08-08T07:00:00Z");
export type IsoTimestamp = z.infer<typeof IsoTimestampSchema>;

export const NonEmptyTextSchema = z.string().trim().min(1);
