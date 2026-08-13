/**
 * Evidence service.
 *
 * Pure business logic for evidence spans, links, integrity checks and reviews.
 * Mirrors service pattern: validation, deterministic checks, LLM structured calls.
 */

import {
  ClaimEvidenceLinkSchema,
  EvidenceEntryTypeSchema,
  EvidenceReviewOutputSchema,
  EvidenceSpanSchema,
  ProposeEvidenceSpansOutputSchema,
  type ClaimEvidenceLink,
  type EvidenceReviewOutput,
  type EvidenceSpan,
  type ProposeEvidenceSpansOutput,
} from "@specloop/schemas";
import {
  EVIDENCE_SPAN_PROPOSAL_SYSTEM_PROMPT,
  EVIDENCE_REVIEW_SYSTEM_PROMPT,
} from "./prompt.js";
import { structuredCall } from "../llm/structured-call.js";
import {
  claimEvidenceLinksByProject,
  evidenceSpansByProject,
  getOrCreate,
  parseOrThrow,
  sourcesByProject,
} from "../store/project-store.js";

type IntegrityStatus = ClaimEvidenceLink["integrityStatus"];

function computeIntegrity(
  link: { claimNodeId: string; evidenceSpanId: string },
  span: EvidenceSpan | undefined,
): IntegrityStatus {
  if (!span) return "MISSING_SOURCE";
  if (span.entryType === "EXACT") {
    if (span.page == null || span.startOffset == null || span.endOffset == null) {
      return "INVALID_OFFSET";
    }
    if (span.endOffset < span.startOffset) {
      return "INVALID_OFFSET";
    }
    if (span.exactText.length === 0) {
      return "EXACT_TEXT_MISMATCH";
    }
  }
  if (link.evidenceSpanId !== span.id) {
    return "INVALID_LINK";
  }
  return "VALID";
}

export function createSpan(params: {
  projectId: string;
  sourceId: string;
  page?: number | null;
  startOffset?: number | null;
  endOffset?: number | null;
  exactText?: string;
  entryType?: string;
}): EvidenceSpan {
  const { projectId, sourceId, page, startOffset, endOffset, exactText, entryType } = params;

  const sources = sourcesByProject.get(projectId) ?? [];
  if (!sources.some((s) => s.id === sourceId)) {
    throw new Error(`Source ${sourceId} not found in project ${projectId}.`);
  }

  const hasOffsets = page != null && startOffset != null && endOffset != null;
  const inferredType = entryType ?? (hasOffsets ? "EXACT" : "MANUAL");
  const entry = EvidenceEntryTypeSchema.parse(inferredType);

  if (entry === "EXACT" && !hasOffsets) {
    throw new Error("EXACT evidence spans require page, startOffset and endOffset.");
  }
  if (entry === "EXACT" && startOffset != null && endOffset != null && endOffset < startOffset) {
    throw new Error("endOffset must be >= startOffset.");
  }

  const span = parseOrThrow(
    EvidenceSpanSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      sourceId,
      page,
      startOffset,
      endOffset,
      exactText: exactText ?? "",
      entryType: entry,
      createdAt: new Date().toISOString(),
    },
    "EvidenceSpan",
  );
  getOrCreate(evidenceSpansByProject, projectId).push(span);
  return span;
}

export function listSpans(params: {
  projectId: string;
  sourceId?: string;
  limit?: number;
}): { items: EvidenceSpan[] } {
  const { projectId, sourceId, limit = 100 } = params;
  const all = (evidenceSpansByProject.get(projectId) ?? []).filter(
    (s) => !sourceId || s.sourceId === sourceId,
  );
  return { items: all.slice(0, limit) };
}

export async function proposeSpans(params: {
  projectId: string;
  claimText: string;
  client: any;
  model: string;
}): Promise<ProposeEvidenceSpansOutput> {
  const { projectId, claimText, client, model } = params;

  const list = sourcesByProject.get(projectId) ?? [];
  const selected = list.filter((s) => s.selected);
  if (selected.length === 0) {
    throw new Error("Select at least one source into the corpus before proposing evidence spans (AI design §6).");
  }

  const allowedIds = new Set(selected.map((s) => s.id));
  const corpusText = selected
    .map((s) => `Source ${s.id}: ${s.title}\n${s.abstract}`)
    .join("\n\n");

  const output = await structuredCall<ProposeEvidenceSpansOutput>({
    client,
    model,
    systemPrompt: EVIDENCE_SPAN_PROPOSAL_SYSTEM_PROMPT,
    userPrompt:
      "Propose evidence excerpts from the selected corpus below that support the given claim. Only reference the source IDs provided. Use verbatim excerpts; do not rewrite the text.",
    untrusted: [
      { label: "Claim", text: claimText },
      { label: "Selected corpus", text: corpusText },
    ],
    outputSchema: ProposeEvidenceSpansOutputSchema,
    allowedIds,
    extractReferencedIds: (out) => out.proposals.map((p) => p.sourceId),
  });
  return output;
}

export function createLink(params: {
  projectId: string;
  claimNodeId: string;
  evidenceSpanId: string;
}): ClaimEvidenceLink {
  const { projectId, claimNodeId, evidenceSpanId } = params;

  const spans = evidenceSpansByProject.get(projectId) ?? [];
  const span = spans.find((s) => s.id === evidenceSpanId);
  if (!span) {
    throw new Error(`Evidence span ${evidenceSpanId} not found in project ${projectId}.`);
  }

  const now = new Date().toISOString();
  const link: ClaimEvidenceLink = parseOrThrow(
    ClaimEvidenceLinkSchema,
    {
      id: crypto.randomUUID(),
      projectId,
      claimNodeId,
      evidenceSpanId,
      integrityStatus: "VALID",
      review: null,
      createdAt: now,
      updatedAt: now,
    },
    "ClaimEvidenceLink",
  );
  link.integrityStatus = computeIntegrity(link, span);
  getOrCreate(claimEvidenceLinksByProject, projectId).push(link);
  return link;
}

export function listLinks(params: {
  projectId: string;
  claimNodeId?: string;
}): { items: ClaimEvidenceLink[] } {
  const { projectId, claimNodeId } = params;
  const all = (claimEvidenceLinksByProject.get(projectId) ?? []).filter(
    (l) => !claimNodeId || l.claimNodeId === claimNodeId,
  );
  return { items: all };
}

export function runIntegrityChecks(projectId: string): { results: { linkId: string; integrityStatus: IntegrityStatus }[] } {
  const links = claimEvidenceLinksByProject.get(projectId) ?? [];
  const spans = evidenceSpansByProject.get(projectId) ?? [];
  const spanById = new Map(spans.map((s) => [s.id, s]));

  const results = links.map((link) => {
    const span = spanById.get(link.evidenceSpanId);
    link.integrityStatus = computeIntegrity(link, span);
    link.updatedAt = new Date().toISOString();
    return { linkId: link.id, integrityStatus: link.integrityStatus };
  });
  return { results };
}

export async function runReview(params: {
  linkId: string;
  client: any;
  model: string;
}): Promise<ClaimEvidenceLink> {
  const { linkId, client, model } = params;

  let link: ClaimEvidenceLink | undefined;
  let projectId: string | undefined;
  for (const [pid, list] of claimEvidenceLinksByProject.entries()) {
    const found = list.find((l) => l.id === linkId);
    if (found) {
      link = found;
      projectId = pid;
      break;
    }
  }
  if (!link || !projectId) {
    throw new Error(`Claim–evidence link ${linkId} not found.`);
  }

  const spans = evidenceSpansByProject.get(projectId) ?? [];
  const span = spans.find((s) => s.id === link.evidenceSpanId);
  if (!span) {
    throw new Error(`Evidence span ${link.evidenceSpanId} not found for link ${link.id}.`);
  }

  const review = await structuredCall<EvidenceReviewOutput>({
    client,
    model,
    systemPrompt: EVIDENCE_REVIEW_SYSTEM_PROMPT,
    userPrompt:
      "Review the following claim against the evidence span. Return one allowed verdict and a concise reason.",
    untrusted: [
      { label: "Claim (node id)", text: link.claimNodeId },
      { label: "Evidence span exact text", text: span.exactText },
    ],
    outputSchema: EvidenceReviewOutputSchema,
  });

  link.review = {
    verdict: review.verdict,
    reason: review.reason,
    unsupportedAspects: review.unsupportedAspects,
  };
  link.updatedAt = new Date().toISOString();
  return parseOrThrow(ClaimEvidenceLinkSchema, link, "ClaimEvidenceLink");
}
