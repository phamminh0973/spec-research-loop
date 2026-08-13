import { expect, it } from "vitest";

import { confirmedInterpretationFixture } from "../__fixtures__/confirmed-interpretation";
import { decompositionOutputFixture } from "../__fixtures__/decomposition-output";
import {
  ConfirmedInterpretationSnapshotSchema,
  DecompositionOutputSchema,
} from "../index";

it("provides a valid confirmed interpretation fixture", () => {
  expect(
    ConfirmedInterpretationSnapshotSchema.parse(confirmedInterpretationFixture)
  ).toMatchObject({ status: "USER_CONFIRMED" });
});

it("provides a valid decomposition fixture without factual sources or results", () => {
  const parsed = DecompositionOutputSchema.parse(decompositionOutputFixture);
  expect(parsed.projectId).toBe(confirmedInterpretationFixture.projectId);
  expect(parsed.nodes.some((node) => node.type === "EVIDENCE")).toBe(true);
  expect(parsed.nodes.every((node) => node.sourceRefs.length === 0)).toBe(true);
});
