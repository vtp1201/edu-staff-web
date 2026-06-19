import { describe, expect, it } from "vitest";
import { deriveConductColorClass } from "./derive-conduct-color-class";

describe("deriveConductColorClass", () => {
  it("maps Tot to success text", () => {
    expect(deriveConductColorClass("Tot")).toBe("text-edu-success-text");
  });

  it("maps Kha to primary", () => {
    expect(deriveConductColorClass("Kha")).toBe("text-primary");
  });

  it("maps TrungBinh to warning foreground", () => {
    expect(deriveConductColorClass("TrungBinh")).toBe(
      "text-edu-warning-foreground",
    );
  });

  it("maps Yeu to error text", () => {
    expect(deriveConductColorClass("Yeu")).toBe("text-edu-error-text");
  });

  it("maps null to muted foreground", () => {
    expect(deriveConductColorClass(null)).toBe("text-muted-foreground");
  });
});
