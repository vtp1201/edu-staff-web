/**
 * QA gap-fill (US-E24.9) — `isValidMaterialUrl` is the ONE rule the zod schema
 * (`period-prep-form.schema.ts`), any future importer, and the BE's own
 * `PERIOD_PREP_INVALID_MATERIAL` share. It had zero direct test coverage
 * (only exercised transitively through form rendering) despite being a pure,
 * trivially unit-testable function — closing that gap here.
 */
import { describe, expect, it } from "vitest";
import { isValidMaterialUrl } from "./period-prep.entity";

describe("isValidMaterialUrl", () => {
  it.each([
    "https://geogebra.org/m/abc",
    "http://example.com",
  ])("accepts absolute http(s) urls (%s)", (url) => {
    expect(isValidMaterialUrl(url)).toBe(true);
  });

  it.each([
    ["ftp://example.com/file", "non-http(s) scheme"],
    ["javascript:alert(1)", "javascript: scheme"],
    ["mailto:teacher@example.com", "mailto: scheme"],
    ["example.com", "no scheme at all"],
    ["not a url", "not a url shape"],
    ["", "empty string"],
    ["   ", "whitespace only"],
  ])("rejects %s (%s)", (url) => {
    expect(isValidMaterialUrl(url)).toBe(false);
  });

  it("is case-insensitive on the scheme (URL normalises it)", () => {
    expect(isValidMaterialUrl("HTTPS://example.com")).toBe(true);
  });
});
