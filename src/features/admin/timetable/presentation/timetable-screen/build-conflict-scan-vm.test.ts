import { describe, expect, it } from "vitest";
import type {
  ConflictInfo,
  TimetableConflictScan,
} from "../../domain/entities/timetable.entity";
import type { Result } from "../../domain/use-cases/result";
import { buildConflictScanVM } from "./build-conflict-scan-vm";

const TEACHER_CONFLICT: ConflictInfo = {
  type: "teacher-double-booked",
  day: 0,
  period: 1,
  classes: [
    { classId: "cls-10a1", subjectId: "sub-math" },
    { classId: "cls-10a2", subjectId: "sub-math" },
  ],
  teacherId: "tch-1",
};

const ROOM_CONFLICT: ConflictInfo = {
  type: "room-double-booked",
  day: 2,
  period: 3,
  classes: [
    { classId: "cls-11b2", subjectId: "sub-geo" },
    { classId: "cls-12c1", subjectId: "sub-lit" },
  ],
  room: "P.201",
};

const okScan = (
  conflicts: ConflictInfo[],
  truncated = false,
): Result<TimetableConflictScan> => ({
  ok: true,
  value: { termId: "term-1", conflicts, truncated },
});

describe("buildConflictScanVM — ok scans", () => {
  it("resolves the teacher name and keeps the kind discriminant", () => {
    const vm = buildConflictScanVM(okScan([TEACHER_CONFLICT]), "cls-10a1");
    expect(vm.status).toBe("ok");
    if (vm.status !== "ok") return;
    expect(vm.rows[0].type).toBe("teacher-double-booked");
    expect(vm.rows[0].teacherName).toBe("Nguyễn Thị Hương");
    expect(vm.rows[0].room).toBeUndefined();
  });

  it("carries the room and NO teacher name on a room conflict", () => {
    const vm = buildConflictScanVM(okScan([ROOM_CONFLICT]), "cls-10a1");
    if (vm.status !== "ok") return;
    expect(vm.rows[0].type).toBe("room-double-booked");
    expect(vm.rows[0].room).toBe("P.201");
    expect(vm.rows[0].teacherName).toBeUndefined();
  });

  it("resolves each party's class name and subject name", () => {
    const vm = buildConflictScanVM(okScan([TEACHER_CONFLICT]), "cls-10a1");
    if (vm.status !== "ok") return;
    expect(vm.rows[0].classes).toEqual([
      { classId: "cls-10a1", className: "10A1", subjectName: "Toán" },
      { classId: "cls-10a2", className: "10A2", subjectName: "Toán" },
    ]);
  });

  it("falls an unknown class/subject/teacher id back to the raw id (never blank)", () => {
    const vm = buildConflictScanVM(
      okScan([
        {
          type: "teacher-double-booked",
          day: 1,
          period: 2,
          classes: [
            { classId: "cls-ghost", subjectId: "sub-ghost" },
            { classId: "cls-10a1", subjectId: "sub-math" },
          ],
          teacherId: "tch-ghost",
        },
      ]),
      "cls-10a1",
    );
    if (vm.status !== "ok") return;
    expect(vm.rows[0].teacherName).toBe("tch-ghost");
    expect(vm.rows[0].classes[0]).toEqual({
      classId: "cls-ghost",
      className: "cls-ghost",
      subjectName: "sub-ghost",
    });
  });

  it("targets the CURRENT class when it is a party to the conflict", () => {
    const vm = buildConflictScanVM(okScan([TEACHER_CONFLICT]), "cls-10a2");
    if (vm.status !== "ok") return;
    expect(vm.rows[0].targetClassId).toBe("cls-10a2");
    expect(vm.rows[0].involvesCurrentClass).toBe(true);
  });

  it("targets the first listed class when the current class is not involved", () => {
    const vm = buildConflictScanVM(okScan([ROOM_CONFLICT]), "cls-10a1");
    if (vm.status !== "ok") return;
    expect(vm.rows[0].targetClassId).toBe("cls-11b2");
    expect(vm.rows[0].involvesCurrentClass).toBe(false);
  });

  it("gives each row a stable id unique across kinds at the same cell", () => {
    const vm = buildConflictScanVM(
      okScan([TEACHER_CONFLICT, { ...ROOM_CONFLICT, day: 0, period: 1 }]),
      "cls-10a1",
    );
    if (vm.status !== "ok") return;
    const ids = vm.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("preserves the scan's order (the BE sorts deterministically)", () => {
    const vm = buildConflictScanVM(
      okScan([ROOM_CONFLICT, TEACHER_CONFLICT]),
      "cls-10a1",
    );
    if (vm.status !== "ok") return;
    expect(vm.rows.map((r) => r.type)).toEqual([
      "room-double-booked",
      "teacher-double-booked",
    ]);
  });

  it("surfaces truncated and an empty (but successful) scan distinctly", () => {
    expect(buildConflictScanVM(okScan([], true), "cls-10a1")).toEqual({
      status: "ok",
      rows: [],
      truncated: true,
    });
    expect(buildConflictScanVM(okScan([]), "cls-10a1")).toEqual({
      status: "ok",
      rows: [],
      truncated: false,
    });
  });
});

describe("buildConflictScanVM — failed scans", () => {
  it("returns the error status with the stable failure key (NOT an empty list)", () => {
    const vm = buildConflictScanVM(
      { ok: false, failure: { type: "forbidden", message: "nope" } },
      "cls-10a1",
    );
    expect(vm).toEqual({ status: "error", errorKey: "forbidden" });
  });

  it("never reports zero conflicts for a failed scan", () => {
    const vm = buildConflictScanVM(
      { ok: false, failure: { type: "fetch-failed", message: "boom" } },
      "cls-10a1",
    );
    expect(vm).not.toHaveProperty("rows");
  });
});
