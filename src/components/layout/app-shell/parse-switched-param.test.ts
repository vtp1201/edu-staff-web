/**
 * US-E23.1 success-toast one-shot param (fe-lead decision 2026-07-18).
 * `AppShell` reads `?switched=1&school=<name>` once on mount, toasts, then
 * strips it. The parse is a pure function so the one-shot semantics are
 * unit-testable in the node env (effects don't run under renderToStaticMarkup).
 */
import { describe, expect, it } from "vitest";
import { parseSwitchedParam } from "./parse-switched-param";

describe("parseSwitchedParam", () => {
  it("returns the decoded school name when switched=1", () => {
    const p = new URLSearchParams(
      "switched=1&school=THPT%20Chu%20V%C4%83n%20An",
    );
    expect(parseSwitchedParam(p)).toBe("THPT Chu Văn An");
  });

  it("returns an empty string school when switched=1 but no school param", () => {
    const p = new URLSearchParams("switched=1");
    expect(parseSwitchedParam(p)).toBe("");
  });

  it("returns null when switched is absent (no toast)", () => {
    expect(parseSwitchedParam(new URLSearchParams(""))).toBeNull();
    expect(parseSwitchedParam(new URLSearchParams("foo=bar"))).toBeNull();
  });

  it("returns null when switched has any value other than 1", () => {
    expect(parseSwitchedParam(new URLSearchParams("switched=0"))).toBeNull();
    expect(parseSwitchedParam(new URLSearchParams("switched=true"))).toBeNull();
  });
});
