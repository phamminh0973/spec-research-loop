/**
 * PDF ingestion service.
 *
 * Closes the gap between "Sinh viên xây dựng... giúp trích xuất thông tin
 * từ paper" and the previous state of the codebase, where `SourceDocument`
 * only ever held arXiv abstract metadata — no paper full text ever reached
 * the system, so every `EvidenceSpan` had to be typed by hand (page +
 * character offsets), with nothing to check them against.
 *
 * This module:
 *   1. accepts an uploaded PDF for an existing `SourceDocument`,
 *   2. extracts real per-page text (`../../pdf/extract.ts`, backed by
 *      `pdf-parse`),
 *   3. lets the user create an `EXACT` evidence span by pasting a quote and
 *      a page number — the server *locates* the quote in the extracted
 *      text and computes the offsets itself, rather than trusting
 *      hand-typed numbers. A quote that cannot be found verbatim is
 *      rejected outright, so an `EXACT` span from this flow is guaranteed
 *      byte-identical to the source by construction.
 *
 * Span creation itself is delegated to `evidence/service.ts#createSpan` —
 * this module only adds the PDF-specific step of turning a quote into
 * verified offsets; it does not duplicate span validation/integrity logic.
 */

import {
  ExtractedPdfPageSchema,
  SourcePdfMetaSchema,
  SourcePdfRecordSchema,
  type SourcePdfMeta,
  type SourcePdfRecord,
} from "@specloop/schemas";
import { extractPdfPages } from "../../pdf/extract.js";
import { savePdfFile } from "../../pdf/storage.js";
import { parseOrThrow, sourcePdfsByProject, sourcesByProject } from "../../store/project-store.js";

export class PdfIngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfIngestionError";
  }
}

/** Generous for a research paper, bounded to keep base64-over-tRPC payloads sane for a P0 build. */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

function toMeta(record: SourcePdfRecord): SourcePdfMeta {
  return parseOrThrow(
    SourcePdfMetaSchema,
    {
      sourceId: record.sourceId,
      projectId: record.projectId,
      fileName: record.fileName,
      pageCount: record.pageCount,
      byteSize: record.byteSize,
      uploadedAt: record.uploadedAt,
    },
    "SourcePdfMeta",
  );
}

export async function uploadSourcePdf(params: {
  projectId: string;
  sourceId: string;
  fileName: string;
  base64Content: string;
}): Promise<SourcePdfMeta> {
  const { projectId, sourceId, fileName, base64Content } = params;

  const sources = sourcesByProject.get(projectId) ?? [];
  if (!sources.some((s) => s.id === sourceId)) {
    throw new PdfIngestionError(`Source ${sourceId} not found in project ${projectId}.`);
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64Content, "base64");
  } catch {
    throw new PdfIngestionError("base64Content is not valid base64.");
  }
  if (bytes.length === 0) {
    throw new PdfIngestionError("Uploaded PDF is empty.");
  }
  if (bytes.length > MAX_PDF_BYTES) {
    throw new PdfIngestionError(
      `PDF exceeds the ${Math.floor(MAX_PDF_BYTES / (1024 * 1024))}MB limit for this build.`,
    );
  }
  // Reject non-PDF uploads by magic bytes before spending time parsing them.
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new PdfIngestionError("File does not look like a PDF (missing %PDF- header).");
  }

  const extracted = await extractPdfPages(bytes);
  const pages = extracted.map((p) => parseOrThrow(ExtractedPdfPageSchema, p, "ExtractedPdfPage"));
  if (pages.length === 0) {
    throw new PdfIngestionError(
      "No extractable text found in this PDF — it may be a scanned image with no text layer.",
    );
  }

  await savePdfFile(sourceId, bytes);

  const record: SourcePdfRecord = parseOrThrow(
    SourcePdfRecordSchema,
    {
      sourceId,
      projectId,
      fileName,
      pageCount: pages.length,
      byteSize: bytes.length,
      pages,
      uploadedAt: new Date().toISOString(),
    },
    "SourcePdfRecord",
  );

  const existing = sourcePdfsByProject.get(projectId) ?? {};
  sourcePdfsByProject.set(projectId, { ...existing, [sourceId]: record });

  return toMeta(record);
}

export function getSourcePdfMeta(params: {
  projectId: string;
  sourceId: string;
}): SourcePdfMeta | null {
  const record = sourcePdfsByProject.get(params.projectId)?.[params.sourceId];
  return record ? toMeta(record) : null;
}

export function getPageText(params: { projectId: string; sourceId: string; page: number }): string {
  const record = sourcePdfsByProject.get(params.projectId)?.[params.sourceId];
  if (!record) {
    throw new PdfIngestionError(`No PDF uploaded for source ${params.sourceId}.`);
  }
  const found = record.pages.find((p) => p.page === params.page);
  if (!found) {
    throw new PdfIngestionError(
      `Page ${params.page} does not exist (this PDF has ${record.pageCount} pages).`,
    );
  }
  return found.text;
}

/**
 * Locate an exact substring on a page. Pure and exported separately so it
 * is unit-testable without a real PDF or the store.
 */
export function locateQuoteOnPage(
  pageText: string,
  quote: string,
): { startOffset: number; endOffset: number } | null {
  const index = pageText.indexOf(quote);
  if (index === -1) return null;
  return { startOffset: index, endOffset: index + quote.length };
}

/**
 * Resolve a quote to verified `{ page, startOffset, endOffset, exactText }`
 * ready to hand to `evidence/service.ts#createSpan`. Does not create the
 * span itself — kept as a pure lookup step so the router can compose it
 * with the existing evidence-creation flow instead of this module
 * reimplementing it.
 */
export function resolveQuoteToSpanInput(params: {
  projectId: string;
  sourceId: string;
  page: number;
  quote: string;
}): { page: number; startOffset: number; endOffset: number; exactText: string } {
  const pageText = getPageText(params);
  const located = locateQuoteOnPage(pageText, params.quote);
  if (!located) {
    throw new PdfIngestionError(
      `Could not find that exact quote on page ${params.page}. Check wording, spacing, and line breaks against the extracted page text (pdfIngestion.getPageText).`,
    );
  }
  return {
    page: params.page,
    startOffset: located.startOffset,
    endOffset: located.endOffset,
    exactText: params.quote,
  };
}
