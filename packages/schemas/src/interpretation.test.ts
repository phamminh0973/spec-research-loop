/**
 * Contract tests for the AIT-01 idea-interpretation schemas (TT-US02-01).
 * Fixtures mirror the JSON skeleton in
 * `docs/source/02-approved-proposal.md` §9 "Bước 1".
 */

import { describe, expect, it } from "vitest";
import {
  InterpretationDecisionSchema,
  InterpretationOutputSchema,
  InterpretationRecordSchema,
  InterpretIdeaInputSchema,
} from "./index.js";

const VALID_INPUT = {
  projectId: "123e4567-e89b-12d3-a456-426614174000",
  rawIdea: "A sufficiently long raw idea describing the research problem.",
  domain: "NLP",
  resourceConstraints: ["single GPU"],
};

const VALID_OUTPUT = {
  simpleInterpretation: "Plain-language restatement.",
  technicalInterpretation: "Technical restatement.",
  assumptions: ["An assumption."],
  objectives: ["An objective."],
  ambiguities: [],
};

describe("InterpretIdeaInputSchema", () => {
  it("accepts a valid input", () => {
    expect(InterpretIdeaInputSchema.parse(VALID_INPUT)).toMatchObject(
      VALID_INPUT
    );
  });

  it("defaults resourceConstraints to an empty array", () => {
    const { resourceConstraints: _omit, ...rest } = VALID_INPUT;
    expect(InterpretIdeaInputSchema.parse(rest).resourceConstraints).toEqual(
      []
    );
  });

  it("rejects a raw idea below the minimum length", () => {
    expect(() =>
      InterpretIdeaInputSchema.parse({ ...VALID_INPUT, rawIdea: "short" })
    ).toThrow();
  });

  it("rejects a non-UUID projectId", () => {
    expect(() =>
      InterpretIdeaInputSchema.parse({
        ...VALID_INPUT,
        projectId: "not-a-uuid",
      })
    ).toThrow();
  });
});

describe("InterpretationOutputSchema", () => {
  it("accepts a valid output with empty list fields allowed", () => {
    expect(InterpretationOutputSchema.parse(VALID_OUTPUT)).toEqual(
      VALID_OUTPUT
    );
  });

  it("rejects output missing a required field", () => {
    const { objectives: _omit, ...missingField } = VALID_OUTPUT;
    expect(() => InterpretationOutputSchema.parse(missingField)).toThrow();
  });

  it("rejects a non-array ambiguities field", () => {
    expect(() =>
      InterpretationOutputSchema.parse({
        ...VALID_OUTPUT,
        ambiguities: "not an array",
      })
    ).toThrow();
  });
});

describe("InterpretationRecordSchema", () => {
  it("accepts a PROPOSED record", () => {
    const record = {
      interpretationId: "123e4567-e89b-42d3-a456-426614174001",
      projectId: VALID_INPUT.projectId,
      output: VALID_OUTPUT,
      status: "PROPOSED" as const,
      promptId: "PT-01" as const,
      promptVersion: "1.0.0",
      schemaVersion: "1.0.0",
      provider: "openai-compatible",
      model: "test-model",
      retryCount: 0,
      createdAt: "2026-08-08T07:00:00Z",
      confirmedAt: null,
    };
    expect(InterpretationRecordSchema.parse(record)).toMatchObject(record);
  });

  it("rejects a status outside PROPOSED/USER_CONFIRMED", () => {
    expect(() =>
      InterpretationRecordSchema.parse({
        interpretationId: "123e4567-e89b-42d3-a456-426614174001",
        projectId: VALID_INPUT.projectId,
        output: VALID_OUTPUT,
        status: "SYSTEM_VERIFIED",
        promptId: "PT-01",
        promptVersion: "1.0.0",
        schemaVersion: "1.0.0",
        provider: "openai-compatible",
        model: "test-model",
        retryCount: 0,
        createdAt: "2026-08-08T07:00:00Z",
        confirmedAt: null,
      })
    ).toThrow();
  });

  it("accepts SUPERSEDED records but requires confirmation metadata for USER_CONFIRMED", () => {
    const base = {
      interpretationId: "123e4567-e89b-42d3-a456-426614174001",
      projectId: VALID_INPUT.projectId,
      output: VALID_OUTPUT,
      promptId: "PT-01" as const,
      promptVersion: "1.0.0",
      schemaVersion: "1.0.0",
      provider: "openai-compatible",
      model: "test-model",
      retryCount: 0,
      createdAt: "2026-08-08T07:00:00Z",
    };

    expect(
      InterpretationRecordSchema.parse({
        ...base,
        status: "SUPERSEDED",
        confirmedAt: null,
      }).status
    ).toBe("SUPERSEDED");
    expect(() =>
      InterpretationRecordSchema.parse({
        ...base,
        status: "USER_CONFIRMED",
        confirmedAt: null,
      })
    ).toThrow();
  });
});

describe("InterpretationDecisionSchema", () => {
  it("records an actor-owned decision against an exact interpretation version", () => {
    const decision = {
      id: "123e4567-e89b-42d3-a456-426614174002",
      projectId: VALID_INPUT.projectId,
      interpretationId: "123e4567-e89b-42d3-a456-426614174001",
      action: "OTHER" as const,
      content: "Use the user-authored interpretation.",
      actorId: "123e4567-e89b-42d3-a456-426614174003",
      createdAt: "2026-08-08T07:05:00Z",
    };

    expect(InterpretationDecisionSchema.parse(decision)).toEqual(decision);
  });

  it("rejects EDIT and OTHER decisions without user-authored content", () => {
    expect(() =>
      InterpretationDecisionSchema.parse({
        id: "123e4567-e89b-42d3-a456-426614174002",
        projectId: VALID_INPUT.projectId,
        interpretationId: "123e4567-e89b-42d3-a456-426614174001",
        action: "EDIT",
        content: null,
        actorId: "123e4567-e89b-42d3-a456-426614174003",
        createdAt: "2026-08-08T07:05:00Z",
      })
    ).toThrow();
  });
});
