/**
 * Contract tests for the AIT-01 idea-interpretation schemas (TT-US02-01).
 * Fixtures mirror the JSON skeleton in
 * `docs/source/02-approved-proposal.md` §9 "Bước 1".
 */

import { describe, expect, it } from "vitest";
import {
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
      VALID_INPUT,
    );
  });

  it("defaults resourceConstraints to an empty array", () => {
    const { resourceConstraints: _omit, ...rest } = VALID_INPUT;
    expect(InterpretIdeaInputSchema.parse(rest).resourceConstraints).toEqual(
      [],
    );
  });

  it("rejects a raw idea below the minimum length", () => {
    expect(() =>
      InterpretIdeaInputSchema.parse({ ...VALID_INPUT, rawIdea: "short" }),
    ).toThrow();
  });

  it("rejects a non-UUID projectId", () => {
    expect(() =>
      InterpretIdeaInputSchema.parse({ ...VALID_INPUT, projectId: "not-a-uuid" }),
    ).toThrow();
  });
});

describe("InterpretationOutputSchema", () => {
  it("accepts a valid output with empty list fields allowed", () => {
    expect(InterpretationOutputSchema.parse(VALID_OUTPUT)).toEqual(
      VALID_OUTPUT,
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
      }),
    ).toThrow();
  });
});

describe("InterpretationRecordSchema", () => {
  it("accepts a PROPOSED record", () => {
    const record = {
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
    };
    expect(InterpretationRecordSchema.parse(record)).toMatchObject(record);
  });

  it("rejects a status outside PROPOSED/USER_CONFIRMED", () => {
    expect(() =>
      InterpretationRecordSchema.parse({
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
      }),
    ).toThrow();
  });
});
