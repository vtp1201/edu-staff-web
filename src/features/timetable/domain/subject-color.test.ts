import { describe, expect, it } from "vitest";
import { assignSubjectColors, SUBJECT_PALETTE } from "./subject-color";

describe("assignSubjectColors", () => {
  it("gives every subject in the week its own colour", () => {
    const colors = assignSubjectColors(["math", "lit", "eng"]);
    expect(new Set(colors.values()).size).toBe(3);
  });

  it("never assigns the grey fallback (real UUID ids used to render grey)", () => {
    const colors = assignSubjectColors([
      "ca450ebe-6505-446a-b3b0-3d7710825cb1",
      "1aff4f6f-b125-4903-8639-c1f1bc597ab9",
    ]);
    for (const token of colors.values()) expect(token).not.toBe("muted");
  });

  it("is order-independent, so a subject keeps its colour across weeks", () => {
    const monFirst = assignSubjectColors(["lit", "math", "lit"]);
    const mathFirst = assignSubjectColors(["math", "lit"]);
    expect(monFirst.get("math")).toBe(mathFirst.get("math"));
    expect(monFirst.get("lit")).toBe(mathFirst.get("lit"));
  });

  it("wraps around past the palette size instead of running out", () => {
    const ids = Array.from(
      { length: SUBJECT_PALETTE.length + 2 },
      (_, i) => `s${i}`,
    );
    const colors = assignSubjectColors(ids);
    expect(colors.size).toBe(ids.length);
  });

  it("ignores blank ids", () => {
    expect(assignSubjectColors(["", "math"]).size).toBe(1);
  });
});
