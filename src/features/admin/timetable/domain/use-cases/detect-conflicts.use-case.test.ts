import { describe, expect, it } from "vitest";
import type { TimetableSlot } from "../entities/timetable-slot.entity";
import { detectConflicts } from "./detect-conflicts.use-case";

/**
 * Build a slot record from compact tuples for readable test setup. The room
 * defaults to a PER-CLASS unique value so a teacher-conflict case does not
 * accidentally also produce a room conflict — room collisions are opted into
 * explicitly by passing the same room.
 */
function slots(
  ...entries: Array<
    [
      classId: string,
      day: number,
      period: number,
      teacherId: string,
      room?: string,
    ]
  >
): Record<string, TimetableSlot> {
  const out: Record<string, TimetableSlot> = {};
  for (const [classId, day, period, teacherId, room] of entries) {
    const slotKey = `${classId}|${day}|${period}`;
    out[slotKey] = {
      slotKey,
      classId,
      day,
      period,
      subjectId: "sub-math",
      teacherId,
      room: room ?? `room-${classId}`,
    };
  }
  return out;
}

const classIdsOf = (classes: { classId: string }[]) =>
  classes.map((c) => c.classId).sort();

describe("detectConflicts — teacher double-booking", () => {
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
      type: "teacher-double-booked",
      teacherId: "tch-1",
      day: 0,
      period: 1,
    });
    expect(classIdsOf(conflicts[0].classes)).toEqual(["cls-a", "cls-b"]);
  });

  it("carries each class's subjectId alongside its classId", () => {
    const tt = slots(["cls-a", 0, 1, "tch-1"], ["cls-b", 0, 1, "tch-1"]);
    const conflicts = detectConflicts(tt);
    expect(conflicts[0].classes).toEqual(
      expect.arrayContaining([
        { classId: "cls-a", subjectId: "sub-math" },
        { classId: "cls-b", subjectId: "sub-math" },
      ]),
    );
  });

  it("includes all 3 class IDs when a teacher is in 3 classes at the same slot", () => {
    const tt = slots(
      ["cls-a", 0, 1, "tch-1"],
      ["cls-b", 0, 1, "tch-1"],
      ["cls-c", 0, 1, "tch-1"],
    );
    const conflicts = detectConflicts(tt);
    expect(conflicts).toHaveLength(1);
    expect(classIdsOf(conflicts[0].classes)).toEqual([
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

describe("detectConflicts — room double-booking (BE ADR 0128 parity)", () => {
  it("flags two classes holding the SAME room at the same day+period", () => {
    const tt = slots(
      ["cls-a", 0, 1, "tch-1", "P.201"],
      ["cls-b", 0, 1, "tch-2", "P.201"],
    );
    const conflicts = detectConflicts(tt);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      type: "room-double-booked",
      room: "P.201",
      day: 0,
      period: 1,
    });
    expect(classIdsOf(conflicts[0].classes)).toEqual(["cls-a", "cls-b"]);
  });

  it("ignores an EMPTY room — a blank location is not an occupancy claim", () => {
    const tt = slots(
      ["cls-a", 0, 1, "tch-1", ""],
      ["cls-b", 0, 1, "tch-2", ""],
    );
    expect(detectConflicts(tt)).toEqual([]);
  });

  it("does not flag the same room in the same class (≤1 slot per cell anyway)", () => {
    const tt = slots(
      ["cls-a", 0, 1, "tch-1", "P.201"],
      ["cls-a", 0, 2, "tch-1", "P.201"],
    );
    expect(detectConflicts(tt)).toEqual([]);
  });

  it("emits BOTH kinds independently when a slot pair clashes on teacher AND room", () => {
    const tt = slots(
      ["cls-a", 0, 1, "tch-1", "P.201"],
      ["cls-b", 0, 1, "tch-1", "P.201"],
    );
    const conflicts = detectConflicts(tt);
    expect(conflicts.map((c) => c.type)).toEqual([
      "room-double-booked",
      "teacher-double-booked",
    ]);
  });
});

describe("detectConflicts — deterministic ordering (BE US-188 D5 parity)", () => {
  it("orders by (type, day, period) so repeated scans produce stable output", () => {
    const tt = slots(
      // teacher clash, Wed(2) period 4
      ["cls-a", 2, 4, "tch-9"],
      ["cls-b", 2, 4, "tch-9"],
      // teacher clash, Mon(0) period 1
      ["cls-c", 0, 1, "tch-8"],
      ["cls-d", 0, 1, "tch-8"],
      // room clash, Tue(1) period 2
      ["cls-e", 1, 2, "tch-1", "P.500"],
      ["cls-f", 1, 2, "tch-2", "P.500"],
    );
    expect(detectConflicts(tt).map((c) => [c.type, c.day, c.period])).toEqual([
      ["room-double-booked", 1, 2],
      ["teacher-double-booked", 0, 1],
      ["teacher-double-booked", 2, 4],
    ]);
  });
});
