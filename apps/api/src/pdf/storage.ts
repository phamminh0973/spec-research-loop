/**
 * Local filesystem storage for uploaded source PDFs, rooted at
 * `env.STORAGE_PATH` (see `.env.example`). P0 scope: a single-node local
 * disk is sufficient; swapping this for S3/GCS later only touches this
 * file, since every caller only ever imports `savePdfFile`/`readPdfFile`.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../env.js";

function pdfFilePath(sourceId: string): string {
  // sourceId is always a UUID validated by the schema layer before this is
  // called, so it is safe to use directly in a path with no traversal risk.
  return path.join(env.STORAGE_PATH, "pdfs", `${sourceId}.pdf`);
}

export async function savePdfFile(sourceId: string, bytes: Buffer): Promise<string> {
  const filePath = pdfFilePath(sourceId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return filePath;
}

export async function readPdfFile(sourceId: string): Promise<Buffer> {
  return readFile(pdfFilePath(sourceId));
}
