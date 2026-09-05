/**
 * Sổ đầu bài TIẾT — the per-period fact-of-record entry a subject teacher (GVBM)
 * writes for one concrete calendar occurrence `(classId, date, periodNumber)`.
 *
 * Mirrors core's `PeriodLogEntryResponse` 1:1 (US-233 / ADR core 0145,
 * ground-truthed against `services/core/docs/openapi.yaml`). `remark` is
 * REQUIRED on the wire: absent content is `""`, never `null`/omitted, so the
 * entity keeps it a plain `string`. `subjectId`/`teacherMemberId` are
 * denormalised by the BE from the resolved timetable slot at write time — the
 * client never sends them.
 */
export type PeriodGrade = "A" | "B" | "C" | "D";

/** Weekdays the BE schedules periods on (no weekend slot ever resolves). */
export type PeriodDayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI";

export interface PeriodLog {
  classId: string;
  /** YYYY-MM-DD */
  date: string;
  periodNumber: number;
  termId: string;
  dayOfWeek: PeriodDayOfWeek;
  subjectId: string;
  teacherMemberId: string;
  lessonTitle: string;
  /** May be `""` — absent content, not null. */
  remark: string;
  grade: PeriodGrade;
  /** Informational only — NOT the attendance context's official record. */
  absentCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The mutable half of `UpsertPeriodLogEntryRequest` (full replace, no patch). */
export interface SavePeriodLogInput {
  lessonTitle: string;
  remark?: string;
  grade: PeriodGrade;
  absentCount: number;
}

/** BE caps (`PERIOD_LOG_INVALID_*` backstops) — the single source the zod
 *  schema and the character counters both read; never re-declare the numbers. */
export const MAX_LESSON_TITLE_LENGTH = 200;
export const MAX_REMARK_LENGTH = 2000;
export const MIN_ABSENT_COUNT = 0;
export const MAX_ABSENT_COUNT = 200;
export const PERIOD_GRADES: readonly PeriodGrade[] = ["A", "B", "C", "D"];
