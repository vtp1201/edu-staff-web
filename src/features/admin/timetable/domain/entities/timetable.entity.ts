import type { TimetableSlot } from "./timetable-slot.entity";

/**
 * Conflict kind, as a STABLE DOMAIN KEY — never the raw BE enum (decision 0008).
 * Wire `TEACHER_DOUBLE_BOOKED`/`ROOM_DOUBLE_BOOKED` are translated at the mapper
 * boundary so presentation can use the key directly as an i18n path segment
 * (`timetable.conflicts.type.<key>`).
 *
 * - `teacher-double-booked` — two different classes hold the same teacher at the
 *   same `(day, period)`. The write path DOES reject this (409
 *   `TIMETABLE_TEACHER_CONFLICT`).
 * - `room-double-booked` — two different classes hold the same non-empty room at
 *   the same `(day, period)`. **Detected on READ only (BE ADR 0128): the write
 *   path does NOT reject a duplicate room.** Copy for this kind must never imply
 *   creating/editing such a slot will be blocked.
 *
 * Class-level double-booking is structurally impossible (a class holds ≤1 slot
 * per `(day, period)`) and therefore has no key.
 */
export type TimetableConflictType =
  | "teacher-double-booked"
  | "room-double-booked";

/** One class's participation in a conflict. Raw ids only — the BE deliberately
 *  does NOT enrich names here (US-188 Q4); presentation resolves them. */
export interface ConflictClassRef {
  classId: string;
  /** The subject this class holds at the conflicting `(day, period)`. */
  subjectId: string;
}

/**
 * One detected double-booking. A discriminated union so the party that caused
 * the clash is REQUIRED per kind — it is a compile error to read `room` off a
 * teacher conflict (or a teacher off a room conflict), which is what keeps the
 * two BE-distinct semantics (enforced-on-write vs detected-on-read) from being
 * rendered with the same copy.
 *
 * `day` is the web domain's 0-indexed day (0 = Mon), joined from the wire's
 * `MON|TUE|WED|THU|FRI` enum by `day-enum.ts`. `teacherId` holds the wire's
 * `teacherMemberId` — the same rename `TimetableSlot.teacherId` already applies,
 * so the whole feature speaks one teacher-identity name.
 */
export type ConflictInfo =
  | {
      type: "teacher-double-booked";
      day: number;
      period: number;
      classes: ConflictClassRef[];
      teacherId: string;
    }
  | {
      type: "room-double-booked";
      day: number;
      period: number;
      classes: ConflictClassRef[];
      room: string;
    };

/**
 * Result of the whole-school, term-scoped conflict scan
 * (`GET /api/v1/timetable/conflicts?termId=`, BE US-188 — ADMIN/SUPER_ADMIN
 * only; MANAGER is explicitly NOT authorized).
 *
 * `truncated` is NOT an error: the BE scan is budget-bounded (2000 classes /
 * 500 entries) and stops early when the budget is hit, meaning MORE conflicts
 * may exist than are listed. The listed ones are still accurate and re-running
 * the scan is always safe — so it surfaces as a hint, never as a failure.
 */
export interface TimetableConflictScan {
  /** The term the scan covered (echoed by the BE). */
  termId: string;
  conflicts: ConflictInfo[];
  truncated: boolean;
}

/**
 * The timetable payload for one class in one academic year. `slots` is keyed by
 * the slot's canonical `slotKey`.
 *
 * Conflicts are deliberately NOT part of this entity (US-E18.48): they are
 * whole-school and term-scoped, not class-scoped, and live behind their own
 * endpoint / {@link TimetableConflictScan}. Carrying them here forced the real
 * mapper to emit a permanently-empty array that no real read could ever fill.
 */
export interface TimetableData {
  classId: string;
  yearId: string;
  slots: Record<string, TimetableSlot>;
}
