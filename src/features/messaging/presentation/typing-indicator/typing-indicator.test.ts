import { describe, expect, it } from "vitest";
import { TYPING_DOT_CLASS, TYPING_DOT_DELAYS } from "./typing-indicator";

/**
 * DR-009 US-E16.5 — the typing dots use the bespoke `msg-typing` keyframe
 * (smooth ease-in-out lift), not Tailwind's springy default bounce utility.
 */
describe("typing-indicator dot config", () => {
  it("uses the msg-typing-dot class, not a Tailwind animate utility", () => {
    expect(TYPING_DOT_CLASS).toContain("msg-typing-dot");
    expect(TYPING_DOT_CLASS).not.toMatch(/\banimate-/);
  });

  it("staggers three dots at 0 / 0.18 / 0.36s", () => {
    expect(TYPING_DOT_DELAYS).toEqual([0, 0.18, 0.36]);
  });
});
