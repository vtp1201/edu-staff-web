import type { ConflictInfo } from "../../domain/entities/timetable.entity";
import type { TimetableFailure } from "../../domain/failures/timetable.failure";

export interface TimetableSlotVM {
  slotKey: string;
  day: number;
  period: number;
  subjectId: string;
  subjectName: string;
  subjectShort: string;
  /** Hex colour from the subject reference (dynamic inline tint, not a token). */
  subjectColor: string;
  teacherId: string;
  teacherName: string;
  room: string;
  hasConflict: boolean;
}

export type TimetablePeriodVM =
  | { n: number; start: string; end: string }
  | { recess: true };

export interface TimetableScreenVM {
  yearId: string;
  classId: string;
  years: { id: string; label: string }[];
  classes: { id: string; name: string; gradeLevel: number }[];
  days: { vi: string; en: string }[];
  periods: TimetablePeriodVM[];
  slots: Record<string, TimetableSlotVM>;
  conflicts: ConflictInfo[];
  /** Set of slotKeys (for the current class) that are in conflict. */
  conflictSlotKeys: Set<string>;
}

/** Stable failure key returned by server actions (presentation translates it). */
export type TimetableErrorKey = TimetableFailure["type"];

export type SlotActionResult =
  | { ok: true }
  | { ok: false; errorKey: TimetableErrorKey };

export interface TimetableActions {
  updateSlotAction(
    classId: string,
    yearId: string,
    day: number,
    period: number,
    data: { subjectId: string; teacherId: string; room: string },
  ): Promise<SlotActionResult>;
  clearSlotAction(
    classId: string,
    yearId: string,
    day: number,
    period: number,
  ): Promise<SlotActionResult>;
}
