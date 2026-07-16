import { describe, expect, it } from "vitest";
import { dayEnumToIndex, dayIndexToEnum } from "./day-enum";

describe("day-enum converters (admin timetable)", () => {
  it("maps every Mon–Fri index to its wire enum", () => {
    expect(dayIndexToEnum(0)).toBe("MON");
    expect(dayIndexToEnum(1)).toBe("TUE");
    expect(dayIndexToEnum(2)).toBe("WED");
    expect(dayIndexToEnum(3)).toBe("THU");
    expect(dayIndexToEnum(4)).toBe("FRI");
  });

  it("maps every wire enum back to its index (round-trip)", () => {
    for (let i = 0; i <= 4; i++) {
      expect(dayEnumToIndex(dayIndexToEnum(i))).toBe(i);
    }
  });

  it("throws for Saturday (index 5) — no wire representation (Mon–Fri only)", () => {
    expect(() => dayIndexToEnum(5)).toThrow(RangeError);
  });

  it("throws for a negative or out-of-range index", () => {
    expect(() => dayIndexToEnum(-1)).toThrow(RangeError);
    expect(() => dayIndexToEnum(7)).toThrow(RangeError);
  });

  it("throws for an unknown enum value", () => {
    expect(() => dayEnumToIndex("SAT")).toThrow(RangeError);
    expect(() => dayEnumToIndex("")).toThrow(RangeError);
  });
});
