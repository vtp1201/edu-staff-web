import { describe, expect, it } from "vitest";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import {
  hasAnySlot,
  resolveRetryTarget,
  subjectsUsed,
  toDataState,
} from "./timetable-view.derive";

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

/*
 * US-E15.3 fix round. When the ROSTER call fails (parent's children / principal's
 * teachers), the page seeds `{status:"error"}` with an EMPTY list, so there is no
 * selected member id at all. Retrying the member-scoped fetch with `""` can never
 * recover the roster failure that actually happened — the retry has to re-run the
 * RSC (`router.refresh()`). Applies to both role paths.
 */
describe("resolveRetryTarget", () => {
  const base = {
    canFetchChild: true,
    canFetchMember: true,
    selectedChildId: "c1",
    selectedTeacherId: "t-001",
  };

  it("re-fetches the selected child for a parent", () => {
    expect(resolveRetryTarget({ ...base, viewerRole: "parent" })).toBe("child");
  });

  it("re-fetches the selected teacher for a principal", () => {
    expect(resolveRetryTarget({ ...base, viewerRole: "principal" })).toBe(
      "teacher",
    );
  });

  it("refreshes the route when the roster failed (no id to retry with)", () => {
    expect(
      resolveRetryTarget({
        ...base,
        viewerRole: "parent",
        selectedChildId: "",
      }),
    ).toBe("refresh");
    expect(
      resolveRetryTarget({
        ...base,
        viewerRole: "principal",
        selectedTeacherId: "",
      }),
    ).toBe("refresh");
  });

  it("refreshes when the role has no fetch action wired (student, or omitted prop)", () => {
    expect(resolveRetryTarget({ ...base, viewerRole: "student" })).toBe(
      "refresh",
    );
    expect(
      resolveRetryTarget({
        ...base,
        viewerRole: "principal",
        canFetchMember: false,
      }),
    ).toBe("refresh");
  });
});
