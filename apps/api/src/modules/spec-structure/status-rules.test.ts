import { describe, expect, it } from "vitest";

import type { DecompositionOutput } from "@specloop/schemas";
import {
  DecompositionOutputSchema,
  STEP2_REQUIRED_NODE_TYPES,
} from "@specloop/schemas";
import { applyDeterministicRules } from "./status-rules.js";

const projectId = "00000000-0000-4000-8000-000000000001";
const requiredTypes = STEP2_REQUIRED_NODE_TYPES;

function node(
  clientRef: string,
  type: DecompositionOutput["nodes"][number]["type"]
) {
  return {
    projectId,
    clientRef,
    type,
    title: `${type} title`,
    content: `${type} content`,
    status: "PROPOSED" as const,
    sourceRefs: [],
  };
}

function output(
  nodes: ReturnType<typeof node>[],
  relations: DecompositionOutput["relations"] = [],
  warnings: DecompositionOutput["warnings"] = []
): DecompositionOutput {
  return DecompositionOutputSchema.parse({
    projectId,
    nodes,
    relations,
    warnings,
  });
}

describe("deterministic decomposition rules", () => {
  it.each(requiredTypes)(
    "warns MISSING when the required %s card is absent",
    (missingType) => {
      const reviewed = applyDeterministicRules(
        output(
          requiredTypes
            .filter((type) => type !== missingType)
            .map((type, index) => node(`${type.toLowerCase()}-${index}`, type))
        )
      );
      const warning = reviewed.warnings.find(
        (candidate) =>
          candidate.code === "MISSING" && candidate.targetType === missingType
      );

      expect(warning).toBeDefined();
      expect(warning?.reason).toBeTruthy();
      expect(warning?.suggestedAction).toBeTruthy();
    }
  );

  it("warns UNSUPPORTED for a claim without support or a planned test", () => {
    const reviewed = applyDeterministicRules(
      output(
        [node("claim-1", "CLAIM"), node("evidence-1", "EVIDENCE")],
        [
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "evidence-1",
            type: "REQUIRES",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.find(
        (warning) =>
          warning.code === "UNSUPPORTED" &&
          warning.targetClientRef === "claim-1"
      )
    ).toMatchObject({ targetType: "CLAIM" });
    expect(
      reviewed.nodes.find((node) => node.clientRef === "claim-1")
    ).toMatchObject({
      status: "UNSUPPORTED",
      reason: expect.stringContaining("no supporting evidence"),
    });
  });

  it("does not treat an Evidence requirement as support", () => {
    const reviewed = applyDeterministicRules(
      output(
        [node("claim-1", "CLAIM"), node("evidence-1", "EVIDENCE")],
        [
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "evidence-1",
            type: "SUPPORTED_BY",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.some(
        (warning) =>
          warning.code === "UNSUPPORTED" &&
          warning.targetClientRef === "claim-1"
      )
    ).toBe(true);
  });

  it("does not warn unsupported when a claim has a planned experiment", () => {
    const reviewed = applyDeterministicRules(
      output(
        [node("claim-1", "CLAIM"), node("experiment-1", "EXPERIMENT")],
        [
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "experiment-1",
            type: "TESTED_BY",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.some(
        (warning) =>
          warning.code === "UNSUPPORTED" &&
          warning.targetClientRef === "claim-1"
      )
    ).toBe(false);
  });

  it("requires EVIDENCE even when optional RISK is present", () => {
    const reviewed = applyDeterministicRules(output([node("risk-1", "RISK")]));

    expect(reviewed.warnings).toContainEqual(
      expect.objectContaining({ code: "MISSING", targetType: "EVIDENCE" })
    );
    expect(reviewed.warnings).not.toContainEqual(
      expect.objectContaining({ code: "MISSING", targetType: "RISK" })
    );
  });

  it("warns CONFLICT for contradictory relations on the same ordered pair", () => {
    const reviewed = applyDeterministicRules(
      output(
        [node("claim-1", "CLAIM"), node("evidence-1", "EVIDENCE")],
        [
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "evidence-1",
            type: "SUPPORTED_BY",
          },
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "evidence-1",
            type: "CONTRADICTED_BY",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.find(
        (warning) =>
          warning.code === "CONFLICT" && warning.targetClientRef === "claim-1"
      )
    ).toMatchObject({ targetType: "CLAIM" });
  });

  it("does not create a conflict for different ordered pairs", () => {
    const reviewed = applyDeterministicRules(
      output(
        [
          node("claim-1", "CLAIM"),
          node("evidence-1", "EVIDENCE"),
          node("evidence-2", "EVIDENCE"),
        ],
        [
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "evidence-1",
            type: "SUPPORTED_BY",
          },
          {
            projectId,
            sourceClientRef: "claim-1",
            targetClientRef: "evidence-2",
            type: "CONTRADICTED_BY",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.some((warning) => warning.code === "CONFLICT")
    ).toBe(false);
  });

  it("keeps a complete targeted ambiguity warning", () => {
    const reviewed = applyDeterministicRules(
      output(
        [node("claim-1", "CLAIM")],
        [],
        [
          {
            code: "AMBIGUOUS",
            targetClientRef: "claim-1",
            targetType: "CLAIM",
            reason: "The claim scope is unclear.",
            suggestedAction: "Specify the target domain.",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.filter((warning) => warning.code === "AMBIGUOUS")
    ).toEqual([
      expect.objectContaining({
        code: "AMBIGUOUS",
        targetClientRef: "claim-1",
      }),
    ]);
    expect(
      reviewed.nodes.find((node) => node.clientRef === "claim-1")
    ).toMatchObject({
      status: "AMBIGUOUS",
      reason: "The claim scope is unclear.",
    });
  });

  it("drops an ambiguity warning without a target", () => {
    const reviewed = applyDeterministicRules(
      output(
        [node("claim-1", "CLAIM")],
        [],
        [
          {
            code: "AMBIGUOUS",
            targetType: "CLAIM",
            reason: "The claim scope is unclear.",
            suggestedAction: "Specify the target domain.",
          },
        ]
      )
    );

    expect(
      reviewed.warnings.some((warning) => warning.code === "AMBIGUOUS")
    ).toBe(false);
  });

  it("does not infer ambiguity from arbitrary text length", () => {
    const reviewed = applyDeterministicRules(
      output([
        {
          ...node("long-claim-1", "CLAIM"),
          content: "A deliberately long but otherwise valid claim. ".repeat(
            100
          ),
        },
      ])
    );

    expect(
      reviewed.warnings.some((warning) => warning.code === "AMBIGUOUS")
    ).toBe(false);
  });
});
