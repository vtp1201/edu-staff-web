import type { TimetableData } from "../../domain/entities/timetable.entity";
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
 */
export function buildTimetableVM(
  data: TimetableData,
  classId: string,
  yearId: string,
): TimetableScreenVM {
  // Conflict slot-keys for the CURRENT class (a teacher clash at d/p means this
  // class's slot at d/p is in conflict if this class is one of the parties).
  const conflictSlotKeys = new Set<string>();
  for (const c of data.conflicts) {
    if (c.classIds.includes(classId)) {
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
    conflicts: data.conflicts,
    conflictSlotKeys,
  };
}
