import { beforeEach, describe, expect, it } from "vitest";

import type { SourceDocument } from "@specloop/schemas";
import { extractPdfPages } from "../../pdf/extract.js";
import {
  resetProjectStore,
  sourcesByProject,
} from "../../store/project-store.js";
import {
  MAX_PDF_BYTES,
  PdfIngestionError,
  getPageText,
  getSourcePdfMeta,
  locateQuoteOnPage,
  resolveQuoteToSpanInput,
  uploadSourcePdf,
} from "./service.js";

const PROJECT_ID = "00000000-0000-4000-8000-0000000000aa";
const SOURCE_ID = "00000000-0000-4000-8000-0000000000bb";

/**
 * Hand-builds a minimal, spec-valid multi-page PDF with known text content
 * (uncompressed content streams, standard xref table). This is a REAL PDF
 * — `extractPdfPages` below runs the real `pdf-parse` library against
 * these bytes, not a mock. Mirrors the Python script used during
 * development to first validate `pdf-parse`'s behavior in this sandbox.
 */
function buildTestPdf(pagesText: string[][]): Buffer {
  const objects: Buffer[] = [];
  objects.push(Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"));

  const nPages = pagesText.length;
  const kids = Array.from({ length: nPages }, (_, i) => `${3 + i} 0 R`).join(" ");
  objects.push(Buffer.from(`<< /Type /Pages /Kids [${kids}] /Count ${nPages} >>`));

  const contentObjStart = 3 + nPages;
  const fontObjIndex = contentObjStart + nPages; // 1-based object number of the font
  for (let i = 0; i < nPages; i++) {
    objects.push(
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 ${fontObjIndex} 0 R >> >> /MediaBox [0 0 612 792] /Contents ${contentObjStart + i} 0 R >>`,
      ),
    );
  }

  for (const lines of pagesText) {
    let ops = "BT /F1 12 Tf 72 720 Td 14 TL\n";
    for (const line of lines) {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      ops += `(${escaped}) Tj T*\n`;
    }
    ops += "ET";
    const streamBytes = Buffer.from(ops, "latin1");
    objects.push(
      Buffer.concat([
        Buffer.from(`<< /Length ${streamBytes.length} >>\nstream\n`),
        streamBytes,
        Buffer.from("\nendstream"),
      ]),
    );
  }

  objects.push(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));

  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n")];
  let offset = parts[0]!.length;
  const offsets: number[] = [];
  objects.forEach((obj, idx) => {
    offsets.push(offset);
    const header = Buffer.from(`${idx + 1} 0 obj\n`);
    const footer = Buffer.from("\nendobj\n");
    const full = Buffer.concat([header, obj, footer]);
    parts.push(full);
    offset += full.length;
  });

  const xrefOffset = offset;
  const n = objects.length + 1;
  let xref = `xref\n0 ${n}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(Buffer.from(xref), Buffer.from(trailer));

  return Buffer.concat(parts);
}

function seedSource(): SourceDocument {
  const source: SourceDocument = {
    id: SOURCE_ID,
    projectId: PROJECT_ID,
    externalId: "arxiv:1234.5678",
    provenanceTier: "API",
    title: "A Test Paper",
    authors: ["A. Author"],
    published: "2026-01-01T00:00:00.000Z",
    url: null,
    doi: null,
    primaryCategory: "cs.AI",
    abstract: "",
    analysis: null,
    selected: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  sourcesByProject.set(PROJECT_ID, [source]);
  return source;
}

beforeEach(() => {
  resetProjectStore();
});

describe("extractPdfPages (real pdf-parse, no mocking)", () => {
  it("extracts the exact text of each page from a real PDF", async () => {
    const pdf = buildTestPdf([
      ["Prompt thu cong co the khong on dinh."],
      ["Ket qua tren validation cho thay giam 20 phan tram unsupported claims."],
    ]);

    const pages = await extractPdfPages(new Uint8Array(pdf));

    expect(pages).toHaveLength(2);
    expect(pages[0]?.page).toBe(1);
    expect(pages[0]?.text).toContain("Prompt thu cong co the khong on dinh.");
    expect(pages[1]?.page).toBe(2);
    expect(pages[1]?.text).toContain("giam 20 phan tram unsupported claims.");
  });
});

describe("locateQuoteOnPage", () => {
  it("returns the exact character offsets of a verbatim substring", () => {
    const text = "Kết quả trên validation cho thấy giảm 20%.";
    const result = locateQuoteOnPage(text, "giảm 20%");
    expect(result).not.toBeNull();
    expect(text.slice(result!.startOffset, result!.endOffset)).toBe("giảm 20%");
  });

  it("returns null when the quote is not found verbatim", () => {
    const result = locateQuoteOnPage("Kết quả trên validation.", "giảm 20%");
    expect(result).toBeNull();
  });

  it("is case- and whitespace-sensitive by design (EXACT means exact)", () => {
    expect(locateQuoteOnPage("Result shows a 20% reduction.", "RESULT")).toBeNull();
    expect(locateQuoteOnPage("Result  shows", "Result shows")).toBeNull(); // double space vs single
  });
});

describe("uploadSourcePdf (real PDF end to end)", () => {
  it("rejects an upload for a source that does not exist in the project", async () => {
    const pdf = buildTestPdf([["hello"]]);
    await expect(
      uploadSourcePdf({
        projectId: PROJECT_ID,
        sourceId: SOURCE_ID,
        fileName: "paper.pdf",
        base64Content: pdf.toString("base64"),
      }),
    ).rejects.toThrow(PdfIngestionError);
  });

  it("rejects a file that is not a PDF (magic-byte check)", async () => {
    seedSource();
    await expect(
      uploadSourcePdf({
        projectId: PROJECT_ID,
        sourceId: SOURCE_ID,
        fileName: "not-a-pdf.txt",
        base64Content: Buffer.from("just some text, not a pdf").toString("base64"),
      }),
    ).rejects.toThrow(/does not look like a PDF/);
  });

  it("rejects a PDF larger than the configured byte limit", async () => {
    seedSource();
    // Build a base64 payload whose decoded size exceeds MAX_PDF_BYTES without
    // actually allocating and parsing a huge real PDF.
    const oversized = Buffer.concat([
      Buffer.from("%PDF-1.4\n"),
      Buffer.alloc(MAX_PDF_BYTES + 1, 0x41),
    ]);
    await expect(
      uploadSourcePdf({
        projectId: PROJECT_ID,
        sourceId: SOURCE_ID,
        fileName: "huge.pdf",
        base64Content: oversized.toString("base64"),
      }),
    ).rejects.toThrow(/exceeds the/);
  });

  it("stores extracted pages and returns byte-accurate metadata (no page text in the response)", async () => {
    seedSource();
    const pdf = buildTestPdf([
      ["Prompt thu cong co the khong on dinh."],
      ["Ket qua tren validation cho thay giam 20 phan tram."],
      ["Third page content here."],
    ]);

    const meta = await uploadSourcePdf({
      projectId: PROJECT_ID,
      sourceId: SOURCE_ID,
      fileName: "paper.pdf",
      base64Content: pdf.toString("base64"),
    });

    expect(meta.pageCount).toBe(3);
    expect(meta.byteSize).toBe(pdf.length);
    expect(meta.fileName).toBe("paper.pdf");
    expect((meta as unknown as { pages?: unknown }).pages).toBeUndefined();

    const fetchedMeta = getSourcePdfMeta({ projectId: PROJECT_ID, sourceId: SOURCE_ID });
    expect(fetchedMeta).toEqual(meta);

    const page2 = getPageText({ projectId: PROJECT_ID, sourceId: SOURCE_ID, page: 2 });
    expect(page2).toContain("Ket qua tren validation");
  });

  it("throws when requesting a page number beyond the document", async () => {
    seedSource();
    const pdf = buildTestPdf([["only page"]]);
    await uploadSourcePdf({
      projectId: PROJECT_ID,
      sourceId: SOURCE_ID,
      fileName: "paper.pdf",
      base64Content: pdf.toString("base64"),
    });

    expect(() => getPageText({ projectId: PROJECT_ID, sourceId: SOURCE_ID, page: 5 })).toThrow(
      PdfIngestionError,
    );
  });
});

describe("resolveQuoteToSpanInput (quote → verified offsets, end to end on a real PDF)", () => {
  it("resolves a verbatim quote to the correct page and offsets", async () => {
    seedSource();
    const pdf = buildTestPdf([
      ["Ket qua tren validation cho thay giam 20 phan tram unsupported claims."],
    ]);
    await uploadSourcePdf({
      projectId: PROJECT_ID,
      sourceId: SOURCE_ID,
      fileName: "paper.pdf",
      base64Content: pdf.toString("base64"),
    });

    const resolved = resolveQuoteToSpanInput({
      projectId: PROJECT_ID,
      sourceId: SOURCE_ID,
      page: 1,
      quote: "giam 20 phan tram unsupported claims",
    });

    expect(resolved.page).toBe(1);
    expect(resolved.exactText).toBe("giam 20 phan tram unsupported claims");
    const pageText = getPageText({ projectId: PROJECT_ID, sourceId: SOURCE_ID, page: 1 });
    expect(pageText.slice(resolved.startOffset, resolved.endOffset)).toBe(
      "giam 20 phan tram unsupported claims",
    );
  });

  it("throws a clear, actionable error when the quote cannot be found on that page", async () => {
    seedSource();
    const pdf = buildTestPdf([["Actual page text."]]);
    await uploadSourcePdf({
      projectId: PROJECT_ID,
      sourceId: SOURCE_ID,
      fileName: "paper.pdf",
      base64Content: pdf.toString("base64"),
    });

    expect(() =>
      resolveQuoteToSpanInput({
        projectId: PROJECT_ID,
        sourceId: SOURCE_ID,
        page: 1,
        quote: "text that was never on this page",
      }),
    ).toThrow(/Could not find that exact quote/);
  });
});
