import { describe, expect, it } from "vitest";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import { hasAnySlot, subjectsUsed, toDataState } from "./timetable-view.derive";

const TT: WeeklyTimetable = {
  classId: "11A2",
  className: "11A2",
  slots: {
    0: {
      1: {
        subjectId: "math",
        subjectName: "Toán",
        subjectColorToken: "primary",
      },
      2: null,
      3: {
        subjectId: "math",
        subjectName: "Toán",
        subjectColorToken: "primary",
      },
    },
    1: {
      1: {
        subjectId: "geo",
        subjectName: "Địa lý",
        subjectColorToken: "geo",
      },
    },
  },
};

describe("toDataState", () => {
  it("maps ok result to success", () => {
    expect(toDataState({ ok: true, data: TT })).toEqual({
      status: "success",
      timetable: TT,
    });
  });

  it("maps not-found / no-child to empty", () => {
    expect(toDataState({ ok: false, errorKey: "not-found" })).toEqual({
      status: "empty",
    });
    expect(toDataState({ ok: false, errorKey: "no-child" })).toEqual({
      status: "empty",
    });
  });

  it("maps network-error / forbidden to error (carrying the key)", () => {
    expect(toDataState({ ok: false, errorKey: "network-error" })).toEqual({
      status: "error",
      errorKey: "network-error",
    });
    expect(toDataState({ ok: false, errorKey: "forbidden" })).toEqual({
      status: "error",
      errorKey: "forbidden",
    });
  });
});

describe("subjectsUsed", () => {
  it("dedupes subjects present in the grid, preserving first-seen order", () => {
    const used = subjectsUsed(TT);
    expect(used.map((s) => s.subjectId)).toEqual(["math", "geo"]);
    expect(used[0]).toEqual({
      subjectId: "math",
      subjectName: "Toán",
      colorToken: "primary",
    });
  });
});

describe("hasAnySlot", () => {
  it("is true when at least one filled slot exists", () => {
    expect(hasAnySlot(TT)).toBe(true);
  });
  it("is false for an all-empty grid", () => {
    expect(hasAnySlot({ classId: "x", className: "x", slots: {} })).toBe(false);
    expect(
      hasAnySlot({ classId: "x", className: "x", slots: { 0: { 1: null } } }),
    ).toBe(false);
  });
});
