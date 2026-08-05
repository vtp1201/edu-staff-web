import { describe, expect, it } from "vitest";
import { validateReason } from "./validate-reason";

describe("validateReason", () => {
  it("flags an empty reason as required", () => {
    expect(validateReason("", 500)).toBe("required");
  });

  it("flags a whitespace-only reason as required (trim first)", () => {
    expect(validateReason("   \n\t ", 500)).toBe("required");
  });

  it("accepts a normal reason", () => {
    expect(validateReason("Sai điểm cuối kỳ", 500)).toBe("ok");
  });

  it("accepts a reason of exactly the max length", () => {
    expect(validateReason("x".repeat(500), 500)).toBe("ok");
  });

  it("flags a reason over the max length", () => {
    expect(validateReason("x".repeat(501), 500)).toBe("too-long");
  });

  it("measures the TRIMMED length against the cap (padding is not budget)", () => {
    expect(validateReason(`  ${"x".repeat(500)}  `, 500)).toBe("ok");
  });

  /**
   * US-E18.44 follow-up — the grade-revision-request field (the fork this
   * canonical dialog replaced) enforces a MINIMUM: a two-word note gives the
   * teacher nothing actionable. `minLength` is opt-in so the reject flow, which
   * has no minimum, is unaffected.
   */
  describe("optional minLength", () => {
    it("is not enforced when omitted", () => {
      expect(validateReason("Sai", 500)).toBe("ok");
    });

    it("flags a non-empty reason shorter than the minimum", () => {
      expect(validateReason("Sai", 500, 10)).toBe("too-short");
    });

    it("accepts a reason of exactly the minimum length", () => {
      expect(validateReason("x".repeat(10), 500, 10)).toBe("ok");
    });

    it("still reports an EMPTY reason as required, not too-short", () => {
      expect(validateReason("   ", 500, 10)).toBe("required");
    });

    it("measures the TRIMMED length against the minimum", () => {
      expect(validateReason("  short  ", 500, 10)).toBe("too-short");
    });
  });

  /**
   * Not every reason field has a server-enforced cap. The grade-revision note
   * has NO documented maximum, and inventing one would be fabricating a
   * constraint no contract states — so `maxLength` is opt-in too.
   */
  describe("omitted maxLength", () => {
    it("accepts an arbitrarily long reason", () => {
      expect(validateReason("x".repeat(10_000), undefined)).toBe("ok");
    });

    it("still enforces required + minLength", () => {
      expect(validateReason("", undefined)).toBe("required");
      expect(validateReason("Sai", undefined, 10)).toBe("too-short");
    });
  });
});
