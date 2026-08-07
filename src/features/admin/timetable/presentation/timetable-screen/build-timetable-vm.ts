import type {
  TimetableConflictScan,
  TimetableData,
} from "../../domain/entities/timetable.entity";
import type { Result } from "../../domain/use-cases/result";
import { buildConflictScanVM } from "./build-conflict-scan-vm";
import type {
  TimetablePeriodVM,
  TimetableScreenVM,
  TimetableSlotVM,
} from "./timetable-screen.i-vm";
import {
  findSubject,
  findTeacher,
  TT_CLASSES,
  TT_DAYS,
  TT_PERIODS,
  TT_YEARS,
} from "./timetable-static";

/**
 * Pure VM builder: enriches the domain {@link TimetableData} with static subject
 * / teacher reference data (mock-only for US-E12.5) and derives the per-class
 * conflict slot-key set. Client-safe — used by the RSC page and Storybook.
 *
 * Conflicts arrive as their own whole-school scan (US-E18.48) rather than riding
 * along on the class read, so the per-cell highlight is now driven by the SAME
 * real data as the conflicts panel — in real mode as well as mock, where it used
 * to be permanently empty. A failed scan simply yields no highlights (the panel
 * shows the error); it must never be mistaken for "this class is clean".
 */
export function buildTimetableVM(
  data: TimetableData,
  classId: string,
  yearId: string,
  scanResult: Result<TimetableConflictScan>,
): TimetableScreenVM {
  const conflicts = scanResult.ok ? scanResult.value.conflicts : [];

  // Conflict slot-keys for the CURRENT class (a clash at d/p means this class's
  // slot at d/p is in conflict if this class is one of the parties).
  const conflictSlotKeys = new Set<string>();
  for (const c of conflicts) {
    if (c.classes.some((party) => party.classId === classId)) {
      conflictSlotKeys.add(`${classId}|${c.day}|${c.period}`);
    }
  }

  const slots: Record<string, TimetableSlotVM> = {};
  for (const slot of Object.values(data.slots)) {
    const subject = findSubject(slot.subjectId);
    const teacher = findTeacher(slot.teacherId);
    slots[slot.slotKey] = {
      slotKey: slot.slotKey,
      day: slot.day,
      period: slot.period,
      subjectId: slot.subjectId,
      subjectName: subject?.name ?? slot.subjectId,
      subjectShort: subject?.short ?? slot.subjectId,
      subjectColor: subject?.color ?? "#5D87FF",
      teacherId: slot.teacherId,
      teacherName: teacher?.name ?? slot.teacherId,
      room: slot.room,
      hasConflict: conflictSlotKeys.has(slot.slotKey),
    };
  }

  const periods: TimetablePeriodVM[] = TT_PERIODS.map((p) =>
    "recess" in p ? { recess: true } : { n: p.n, start: p.start, end: p.end },
  );

  return {
    yearId,
    classId,
    years: TT_YEARS.map((y) => ({ id: y.id, label: y.label })),
    classes: TT_CLASSES.map((c) => ({
      id: c.id,
      name: c.name,
      gradeLevel: c.gradeLevel,
    })),
    days: TT_DAYS.map((d) => ({ vi: d.vi, en: d.en })),
    periods,
    slots,
    conflicts,
    conflictSlotKeys,
    conflictScan: buildConflictScanVM(scanResult, classId),
  };
}
