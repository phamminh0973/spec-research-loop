import { z } from "zod";

import { IsoTimestampSchema, UuidSchema } from "./common";

/** One page's extracted text, 1-based page number to match `EvidenceSpan.page`. */
export const ExtractedPdfPageSchema = z.object({
  page: z.number().int().positive(),
  text: z.string(),
});
export type ExtractedPdfPage = z.infer<typeof ExtractedPdfPageSchema>;

/**
 * Full stored record for an uploaded source PDF, including every page's
 * extracted text — this is the internal store shape, never returned
 * directly over the wire (see `SourcePdfMetaSchema` for the public one).
 */
export const SourcePdfRecordSchema = z.object({
  sourceId: UuidSchema,
  projectId: UuidSchema,
  fileName: z.string().trim().min(1).max(255),
  pageCount: z.number().int().nonnegative(),
  byteSize: z.number().int().nonnegative(),
  pages: z.array(ExtractedPdfPageSchema),
  uploadedAt: IsoTimestampSchema,
});
export type SourcePdfRecord = z.infer<typeof SourcePdfRecordSchema>;

/** Public-facing metadata about an uploaded PDF — no page text (that's fetched per-page via `getPageText`). */
export const SourcePdfMetaSchema = z.object({
  sourceId: UuidSchema,
  projectId: UuidSchema,
  fileName: z.string(),
  pageCount: z.number().int().nonnegative(),
  byteSize: z.number().int().nonnegative(),
  uploadedAt: IsoTimestampSchema,
});
export type SourcePdfMeta = z.infer<typeof SourcePdfMetaSchema>;

export const UploadSourcePdfInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema,
  fileName: z.string().trim().min(1).max(255),
  /** Base64-encoded PDF bytes. See service for the enforced byte-size cap. */
  base64Content: z.string().min(1),
});
export type UploadSourcePdfInput = z.infer<typeof UploadSourcePdfInputSchema>;

export const GetSourcePdfMetaInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema,
});
export type GetSourcePdfMetaInput = z.infer<typeof GetSourcePdfMetaInputSchema>;

export const GetSourcePdfPageInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema,
  page: z.number().int().positive(),
});
export type GetSourcePdfPageInput = z.infer<typeof GetSourcePdfPageInputSchema>;

export const GetSourcePdfPageOutputSchema = z.object({
  page: z.number().int().positive(),
  text: z.string(),
});
export type GetSourcePdfPageOutput = z.infer<typeof GetSourcePdfPageOutputSchema>;

/**
 * Create an EXACT evidence span by quoting text the user read on a given
 * page, instead of asking them to type character offsets by hand. The
 * server locates the quote verbatim in that page's extracted text and
 * computes the offsets — an offset the user can no longer get wrong, and
 * a span that is, by construction, byte-identical to the source (the
 * property the Evidence Judge and `runIntegrityChecks` both rely on).
 */
export const CreateEvidenceSpanFromPdfInputSchema = z.object({
  projectId: UuidSchema,
  sourceId: UuidSchema,
  page: z.number().int().positive(),
  quote: z.string().trim().min(1).max(10_000),
});
export type CreateEvidenceSpanFromPdfInput = z.infer<
  typeof CreateEvidenceSpanFromPdfInputSchema
>;
