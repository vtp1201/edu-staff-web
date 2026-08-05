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
});
