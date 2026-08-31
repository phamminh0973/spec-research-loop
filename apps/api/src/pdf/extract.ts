/**
 * PDF text extraction.
 *
 * Thin wrapper around `pdf-parse` v2's `PDFParse.getText()`. Verified
 * against a hand-built two-page PDF during development — `getText()`
 * returns `{ pages: [{ num, text }], text, total }`, `num` is already
 * 1-based, matching `EvidenceSpan.page` in `@specloop/schemas`.
 */

import { PDFParse } from "pdf-parse";

export interface ExtractedPage {
  /** 1-based page number. */
  page: number;
  text: string;
}

export class PdfExtractionError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PdfExtractionError";
  }
}

/** Extract per-page text from PDF bytes. Throws `PdfExtractionError` on a corrupt/unparseable file. */
export async function extractPdfPages(bytes: Uint8Array): Promise<ExtractedPage[]> {
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.pages.map((p) => ({ page: p.num, text: p.text }));
  } catch (err) {
    throw new PdfExtractionError(
      `Failed to parse PDF: ${(err as Error).message}`,
      { cause: err },
    );
  } finally {
    await parser.destroy();
  }
}
