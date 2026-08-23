import { describe, expect, it } from "vitest";

import {
  buildResearchSpecMarkdown,
  getResearchSpecFilename,
} from "./markdown-export";

describe("Markdown export", () => {
  it("builds ordered UTF-8-ready Markdown with decision metadata", () => {
    const markdown = buildResearchSpecMarkdown({
      sections: [["Problem statement", "Một vấn đề có thể kiểm chứng."]],
      judges: [
        {
          name: "Evidence Judge",
          focus: "provenance",
          score: "MAJOR",
          finding: "Cần evidence.",
        },
      ],
      decision: "Narrow claim",
      custom: "  Giới hạn trong domain NLP  ",
      version: 2,
      finalized: true,
    });

    expect(markdown).toContain("# SpecLoop Research Specification");
    expect(markdown).toContain("## Problem statement\n\nMột vấn đề có thể kiểm chứng.");
    expect(markdown).toContain("## Judge review");
    expect(markdown).toContain("### Evidence Judge");
    expect(markdown).toContain("Other: Giới hạn trong domain NLP");
    expect(markdown).toContain("Version: 2");
    expect(markdown).toContain("Status: FINALIZED");
  });

  it("omits an empty custom decision and normalizes the filename version", () => {
    const markdown = buildResearchSpecMarkdown({
      sections: [],
      judges: [],
      decision: "Narrow claim",
      custom: "   ",
      version: 0,
      finalized: false,
    });

    expect(markdown).not.toContain("Other:");
    expect(getResearchSpecFilename(2)).toBe("specloop-research-spec-v2.md");
    expect(getResearchSpecFilename(0)).toBe("specloop-research-spec-v1.md");
  });
});
