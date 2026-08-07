import type {
  ConflictInfo,
  TimetableConflictType,
} from "../../domain/entities/timetable.entity";
import type { TimetableFailure } from "../../domain/failures/timetable.failure";

/** Re-exported so presentation components bind to the VM contract, not the entity. */
export type { TimetableConflictType };

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

/** One class's participation in a conflict, with display names resolved. */
export interface ConflictClassVM {
  classId: string;
  className: string;
  subjectName: string;
}

/** One row of the whole-school conflicts panel (US-E18.48). */
export interface ConflictRowVM {
  /** Stable list key — kind + cell + offending party. */
  id: string;
  type: TimetableConflictType;
  day: number;
  period: number;
  /** Resolved teacher name — present only on a teacher conflict. */
  teacherName?: string;
  /** Room label — present only on a room conflict. */
  room?: string;
  /** The ≥2 classes involved, in the order the BE returned them. */
  classes: ConflictClassVM[];
  /** Class to open when the row is activated (the current class when it is a party). */
  targetClassId: string;
  /** True when the currently-selected class is one of the parties. */
  involvesCurrentClass: boolean;
}

/**
 * Whole-school conflicts scan, as the panel consumes it. A discriminated union
 * so a failed scan can NEVER be rendered as "no conflicts" — the empty state and
 * the error state are structurally different values (the scan is a secondary
 * read on this screen, so its failure degrades inside the panel instead of
 * blanking the timetable grid).
 */
export type ConflictScanVM =
  | {
      status: "ok";
      rows: ConflictRowVM[];
      /** BE scan hit its budget — MORE conflicts may exist. A hint, not an error. */
      truncated: boolean;
    }
  | { status: "error"; errorKey: TimetableErrorKey };

export interface TimetableScreenVM {
  yearId: string;
  classId: string;
  years: { id: string; label: string }[];
  classes: { id: string; name: string; gradeLevel: number }[];
  days: { vi: string; en: string }[];
  periods: TimetablePeriodVM[];
  slots: Record<string, TimetableSlotVM>;
  /**
   * Raw scan conflicts — consumed by the slot editor to warn that a candidate
   * teacher is already booked at the target cell. Empty when the scan failed.
   */
  conflicts: ConflictInfo[];
  /** Set of slotKeys (for the current class) that are in conflict. */
  conflictSlotKeys: Set<string>;
  /** The whole-school conflicts panel's state. */
  conflictScan: ConflictScanVM;
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
