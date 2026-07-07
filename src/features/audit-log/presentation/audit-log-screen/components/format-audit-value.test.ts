import { describe, expect, it } from "vitest";
import { formatAuditValue } from "./format-audit-value";

describe("formatAuditValue", () => {
  it("renders an em dash for null / undefined", () => {
    expect(formatAuditValue(null)).toBe("—");
    expect(formatAuditValue(undefined)).toBe("—");
  });

  it("stringifies primitives", () => {
    expect(formatAuditValue("8.5")).toBe("8.5");
    expect(formatAuditValue(9)).toBe("9");
    expect(formatAuditValue(true)).toBe("true");
  });

  it("compact-JSONs objects", () => {
    expect(formatAuditValue({ score: 5 })).toBe('{"score":5}');
    expect(formatAuditValue(["a", "b"])).toBe('["a","b"]');
  });
});
