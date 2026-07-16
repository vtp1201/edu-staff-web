import { describe, expect, it } from "vitest";
import { dayEnumToIndex } from "./day-enum";

describe("dayEnumToIndex (timetable view)", () => {
  it("maps every wire enum to its 0-indexed day", () => {
    expect(dayEnumToIndex("MON")).toBe(0);
    expect(dayEnumToIndex("TUE")).toBe(1);
    expect(dayEnumToIndex("WED")).toBe(2);
    expect(dayEnumToIndex("THU")).toBe(3);
    expect(dayEnumToIndex("FRI")).toBe(4);
  });

  it("throws for an unknown enum value", () => {
    expect(() => dayEnumToIndex("SAT")).toThrow(RangeError);
    expect(() => dayEnumToIndex("")).toThrow(RangeError);
  });
});
