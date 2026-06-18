import { describe, expect, it } from "vitest";
import { colorClass } from "../exam-taking-timer";

describe("colorClass", () => {
  it("returns success text above 600s", () => {
    expect(colorClass(601)).toBe("text-edu-success-text");
  });

  it("returns success text at 601s boundary", () => {
    expect(colorClass(601)).toBe("text-edu-success-text");
  });

  it("returns warning at exactly 600s", () => {
    expect(colorClass(600)).toBe("text-edu-warning-foreground");
  });

  it("returns warning between 301s and 600s", () => {
    expect(colorClass(450)).toBe("text-edu-warning-foreground");
  });

  it("returns warning at exactly 301s", () => {
    expect(colorClass(301)).toBe("text-edu-warning-foreground");
  });

  it("returns error text at exactly 300s", () => {
    expect(colorClass(300)).toBe("text-edu-error-text");
  });

  it("returns error text at 1s", () => {
    expect(colorClass(1)).toBe("text-edu-error-text");
  });

  it("returns error text at 0s", () => {
    expect(colorClass(0)).toBe("text-edu-error-text");
  });
});
