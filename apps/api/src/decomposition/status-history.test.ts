import { describe, expect, it } from "vitest";

import { NodeStatusHistorySchema } from "@specloop/schemas";

const baseChange = {
  id: "00000000-0000-4000-8000-000000000010",
  projectId: "00000000-0000-4000-8000-000000000001",
  nodeId: "00000000-0000-4000-8000-000000000011",
  fromStatus: "PROPOSED" as const,
  toStatus: "NEEDS_REVIEW" as const,
  actor: "AI" as const,
  authority: "AI" as const,
  reason: "The generated card needs review.",
  occurredAt: "2026-08-11T00:00:00Z",
};

describe("node status history authority", () => {
  it.each(["actor", "authority", "reason", "occurredAt"] as const)(
    "requires %s on every status change",
    (field) => {
      expect(() =>
        NodeStatusHistorySchema.parse({
          ...baseChange,
          [field]: undefined,
        })
      ).toThrow();
    }
  );

  it("accepts user, system and AI transitions under matching authority", () => {
    expect(
      NodeStatusHistorySchema.parse({
        ...baseChange,
        toStatus: "USER_CONFIRMED",
        actor: "USER",
        authority: "USER",
        reason: "The user confirmed this card.",
      })
    ).toMatchObject({ toStatus: "USER_CONFIRMED", authority: "USER" });

    expect(
      NodeStatusHistorySchema.parse({
        ...baseChange,
        toStatus: "SYSTEM_VERIFIED",
        actor: "SYSTEM",
        authority: "SYSTEM",
        reason: "The application verified this transition.",
      })
    ).toMatchObject({ toStatus: "SYSTEM_VERIFIED", authority: "SYSTEM" });

    expect(NodeStatusHistorySchema.parse(baseChange)).toMatchObject({
      toStatus: "NEEDS_REVIEW",
      authority: "AI",
    });
  });

  it.each(["USER_CONFIRMED", "SYSTEM_VERIFIED"] as const)(
    "rejects AI authority from assigning %s",
    (toStatus) => {
      expect(() =>
        NodeStatusHistorySchema.parse({
          ...baseChange,
          toStatus,
        })
      ).toThrow();
    }
  );
});
