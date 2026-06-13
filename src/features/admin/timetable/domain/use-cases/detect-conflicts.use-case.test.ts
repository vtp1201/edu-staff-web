import { describe, expect, it } from "vitest";
import type { TimetableSlot } from "../entities/timetable-slot.entity";
import { detectConflicts } from "./detect-conflicts.use-case";

/** Build a slot record from compact tuples for readable test setup. */
function slots(
  ...entries: Array<
    [classId: string, day: number, period: number, teacherId: string]
  >
): Record<string, TimetableSlot> {
  const out: Record<string, TimetableSlot> = {};
  for (const [classId, day, period, teacherId] of entries) {
    const slotKey = `${classId}|${day}|${period}`;
    out[slotKey] = {
      slotKey,
      classId,
      day,
      period,
      subjectId: "sub-math",
      teacherId,
      room: "P.201",
    };
  }
  return out;
}

describe("detectConflicts", () => {
  it("returns no conflicts for an empty timetable", () => {
    expect(detectConflicts({})).toEqual([]);
  });

  it("returns no conflict for a single teacher in a single slot", () => {
    expect(detectConflicts(slots(["cls-a", 0, 1, "tch-1"]))).toEqual([]);
  });

  it("returns no conflict when the same teacher teaches on different days", () => {
    const tt = slots(["cls-a", 0, 1, "tch-1"], ["cls-b", 1, 1, "tch-1"]);
    expect(detectConflicts(tt)).toEqual([]);
  });

  it("returns no conflict when the same teacher teaches different periods same day", () => {
    const tt = slots(["cls-a", 0, 1, "tch-1"], ["cls-b", 0, 2, "tch-1"]);
    expect(detectConflicts(tt)).toEqual([]);
  });

  it("flags one conflict when a teacher is in 2 classes at the same day+period", () => {
    const tt = slots(["cls-a", 0, 1, "tch-1"], ["cls-b", 0, 1, "tch-1"]);
    const conflicts = detectConflicts(tt);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      teacherId: "tch-1",
      day: 0,
      period: 1,
    });
    expect([...conflicts[0].classIds].sort()).toEqual(["cls-a", "cls-b"]);
  });

  it("includes all 3 class IDs when a teacher is in 3 classes at the same slot", () => {
    const tt = slots(
      ["cls-a", 0, 1, "tch-1"],
      ["cls-b", 0, 1, "tch-1"],
      ["cls-c", 0, 1, "tch-1"],
    );
    const conflicts = detectConflicts(tt);
    expect(conflicts).toHaveLength(1);
    expect([...conflicts[0].classIds].sort()).toEqual([
      "cls-a",
      "cls-b",
      "cls-c",
    ]);
  });

  it("returns no conflict for two different teachers at the same day+period", () => {
    const tt = slots(["cls-a", 0, 1, "tch-1"], ["cls-b", 0, 1, "tch-2"]);
    expect(detectConflicts(tt)).toEqual([]);
  });
});
