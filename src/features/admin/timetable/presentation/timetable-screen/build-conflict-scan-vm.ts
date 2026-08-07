import type {
  ConflictInfo,
  TimetableConflictScan,
} from "../../domain/entities/timetable.entity";
import type { Result } from "../../domain/use-cases/result";
import type { ConflictRowVM, ConflictScanVM } from "./timetable-screen.i-vm";
import { findClass, findSubject, findTeacher } from "./timetable-static";

/**
 * Pure VM builder for the whole-school conflicts panel (US-E18.48).
 *
 * Enriches the domain scan with the screen's static class / subject / teacher
 * catalogue — the BE deliberately returns raw ids only (US-188 Q4), so every
 * display name is resolved here, falling back to the raw id rather than an empty
 * string so a row can never render as an unattributable blank.
 *
 * A FAILED scan becomes `{ status: "error" }`, never an empty row list: the
 * panel's "no conflicts in the whole school" state is a strong claim, and
 * showing it for a read that never completed would be a lie an admin acts on.
 *
 * The BE returns entries in a deterministic order (type, day, period, key) so
 * repeated scans diff cleanly — the order is PRESERVED here, never re-sorted.
 *
 * Client-safe (no framework, no I/O): used by the RSC page, Storybook and tests.
 */
export function buildConflictScanVM(
  result: Result<TimetableConflictScan>,
  currentClassId: string,
): ConflictScanVM {
  if (!result.ok) {
    return { status: "error", errorKey: result.failure.type };
  }
  return {
    status: "ok",
    truncated: result.value.truncated,
    rows: result.value.conflicts.map((c) => toRow(c, currentClassId)),
  };
}

function toRow(conflict: ConflictInfo, currentClassId: string): ConflictRowVM {
  const involvesCurrentClass = conflict.classes.some(
    (c) => c.classId === currentClassId,
  );
  const party =
    conflict.type === "teacher-double-booked"
      ? conflict.teacherId
      : conflict.room;

  return {
    id: `${conflict.type}|${conflict.day}|${conflict.period}|${party}`,
    type: conflict.type,
    day: conflict.day,
    period: conflict.period,
    teacherName:
      conflict.type === "teacher-double-booked"
        ? (findTeacher(conflict.teacherId)?.name ?? conflict.teacherId)
        : undefined,
    room: conflict.type === "room-double-booked" ? conflict.room : undefined,
    classes: conflict.classes.map((c) => ({
      classId: c.classId,
      className: findClass(c.classId)?.name ?? c.classId,
      subjectName: findSubject(c.subjectId)?.name ?? c.subjectId,
    })),
    // Jump to the class the admin is already looking at when it is a party;
    // otherwise open the first listed class (the BE sorts parties by classId).
    targetClassId: involvesCurrentClass
      ? currentClassId
      : (conflict.classes[0]?.classId ?? currentClassId),
    involvesCurrentClass,
  };
}
