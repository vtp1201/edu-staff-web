import { describe, expect, it } from "vitest";
import { resolveViolationToastParams } from "./violation-toast-params";

describe("resolveViolationToastParams", () => {
  it("AC-E17.12-06: returns the contextual key + 4000ms when studentName is available", () => {
    const params = resolveViolationToastParams("Nguyen Van A");
    expect(params).toEqual({
      key: "successContext",
      values: { studentName: "Nguyen Van A" },
      duration: 4000,
    });
  });

  it("AC-E17.12-09: falls back to the generic key + 2000ms when studentName is undefined", () => {
    const params = resolveViolationToastParams(undefined);
    expect(params).toEqual({ key: "success", duration: 2000 });
  });

  it("falls back to the generic key when studentName is empty/whitespace", () => {
    expect(resolveViolationToastParams("")).toEqual({
      key: "success",
      duration: 2000,
    });
    expect(resolveViolationToastParams("   ")).toEqual({
      key: "success",
      duration: 2000,
    });
  });
});
