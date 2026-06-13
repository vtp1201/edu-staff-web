import { describe, expect, it } from "vitest";
import { validateSubjectCode } from "./validate-subject-code.use-case";

describe("validateSubjectCode", () => {
  it("returns ok for valid uppercase alphanumeric codes", () => {
    expect(validateSubjectCode("MATH10").ok).toBe(true);
    expect(validateSubjectCode("ABC123").ok).toBe(true);
    expect(validateSubjectCode("A").ok).toBe(true);
    expect(validateSubjectCode("A".repeat(16)).ok).toBe(true);
  });

  it("returns ok for null/empty (optional field)", () => {
    expect(validateSubjectCode(null).ok).toBe(true);
    expect(validateSubjectCode("").ok).toBe(true);
  });

  it("returns code-format failure for lowercase letters", () => {
    const result = validateSubjectCode("math10");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("code-format");
  });

  it("returns code-format failure for special characters", () => {
    const result = validateSubjectCode("MATH-10");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("code-format");
  });

  it("returns code-format failure for codes longer than 16 characters", () => {
    const result = validateSubjectCode("A".repeat(17));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("code-format");
  });
});
