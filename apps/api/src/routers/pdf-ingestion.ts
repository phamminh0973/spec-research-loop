/**
 * PDF ingestion router.
 *
 * `createSpanFromQuote` composes this module's quote-location step with
 * `evidence.createSpan`'s existing validation/integrity logic rather than
 * duplicating it — this router never constructs an `EvidenceSpan` itself.
 */

import {
  CreateEvidenceSpanFromPdfInputSchema,
  EvidenceSpanSchema,
  GetSourcePdfMetaInputSchema,
  GetSourcePdfPageInputSchema,
  GetSourcePdfPageOutputSchema,
  SourcePdfMetaSchema,
  UploadSourcePdfInputSchema,
} from "@specloop/schemas";
import { TRPCError } from "@trpc/server";
import { createSpan } from "../modules/evidence/service.js";
import {
  PdfIngestionError,
  getPageText,
  getSourcePdfMeta,
  resolveQuoteToSpanInput,
  uploadSourcePdf,
} from "../modules/pdf-ingestion/service.js";
import { publicProcedure, router } from "../trpc/trpc.js";

function toTrpcError(err: unknown): TRPCError {
  if (err instanceof PdfIngestionError) {
    const code = err.message.includes("not found") ? "NOT_FOUND" : "BAD_REQUEST";
    return new TRPCError({ code, message: err.message });
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: `PDF ingestion failed: ${(err as Error).message}`,
  });
}

export const pdfIngestionRouter = router({
  /** Upload a PDF for an existing source and extract its per-page text. */
  upload: publicProcedure
    .input(UploadSourcePdfInputSchema)
    .output(SourcePdfMetaSchema)
    .mutation(async ({ input }) => {
      try {
        return await uploadSourcePdf(input);
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  /** Metadata about an uploaded PDF (page count, size), or null if none uploaded yet. */
  getMeta: publicProcedure
    .input(GetSourcePdfMetaInputSchema)
    .output(SourcePdfMetaSchema.nullable())
    .query(({ input }) => getSourcePdfMeta(input)),

  /** Raw extracted text of one page — lets the user read the page before quoting it as evidence. */
  getPageText: publicProcedure
    .input(GetSourcePdfPageInputSchema)
    .output(GetSourcePdfPageOutputSchema)
    .query(({ input }) => {
      try {
        return { page: input.page, text: getPageText(input) };
      } catch (err) {
        throw toTrpcError(err);
      }
    }),

  /**
   * Create an EXACT evidence span from a pasted quote + page number. The
   * server locates the quote in the extracted page text and computes the
   * offsets; the user never types offsets by hand.
   */
  createSpanFromQuote: publicProcedure
    .input(CreateEvidenceSpanFromPdfInputSchema)
    .output(EvidenceSpanSchema)
    .mutation(({ input }) => {
      try {
        const resolved = resolveQuoteToSpanInput(input);
        return createSpan({
          projectId: input.projectId,
          sourceId: input.sourceId,
          page: resolved.page,
          startOffset: resolved.startOffset,
          endOffset: resolved.endOffset,
          exactText: resolved.exactText,
          entryType: "EXACT",
        });
      } catch (err) {
        if (err instanceof PdfIngestionError) throw toTrpcError(err);
        const msg = (err as Error).message;
        if (msg.includes("not found")) {
          throw new TRPCError({ code: "NOT_FOUND", message: msg });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
      }
    }),
});
