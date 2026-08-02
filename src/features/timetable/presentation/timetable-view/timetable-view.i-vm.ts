import type { PrincipalTeacher } from "@/features/principal/domain/teachers/entities/principal-teacher.entity";
import type { TimetableChild } from "@/features/timetable/domain/entities/timetable-child.entity";
import type { SubjectColorToken } from "@/features/timetable/domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "@/features/timetable/domain/failures/timetable-view.failure";

export type TimetableRole = "student" | "parent" | "principal";

/**
 * Stable error keys a Server Action may return (failure union + guard).
 * - `forbidden` — the action's own RBAC guard denied the caller.
 * - `unknown`   — a source-feature failure with no timetable counterpart
 *   (US-E15.3: the principal roster's `conflict-exists`/`unknown`). It exists so
 *   those never have to masquerade as `network-error`, whose copy promises the
 *   user a connectivity problem that isn't there.
 */
export type TimetableErrorKey =
  | TimetableViewFailure["type"]
  | "forbidden"
  | "unknown";

/** Result shape returned by every timetable Server Action (never translated). */
export type TimetableActionResult =
  | { ok: true; data: WeeklyTimetable }
  | { ok: false; errorKey: TimetableErrorKey };

export type ChildListActionResult =
  | { ok: true; data: TimetableChild[] }
  | { ok: false; errorKey: TimetableErrorKey };

/**
 * Principal sibling of {@link ChildListActionResult} (US-E15.3). The teacher
 * roster comes from the `principal` feature's own `Result<T,E>` convention
 * (`.value`/`.failure`); the Server Action bridges it into this shape so the
 * timetable presentation only ever sees ONE result convention.
 */
export type TeacherListActionResult =
  | { ok: true; data: PrincipalTeacher[] }
  | { ok: false; errorKey: TimetableErrorKey };

/**
 * Discriminated data-region state (AC5: loading / empty / error / success).
 * `not-found` / `no-child` collapse to `empty` (class has no published TKB);
 * every other errorKey drives the error banner.
 */
export type TimetableDataState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; errorKey: TimetableErrorKey }
  | { status: "success"; timetable: WeeklyTimetable };

export interface TimetableViewProps {
  /** Named `viewerRole` (not `role`) — `role` on JSX reads as an ARIA attribute. */
  viewerRole: TimetableRole;
  /** RSC-seeded initial data region (student's own / parent's first child). */
  initialState: TimetableDataState;
  /** Parent only — the children roster (omit / single-item hides the picker). */
  childList?: TimetableChild[];
  /** Parent only — initially-selected child. */
  initialChildId?: string;
  /** Parent only — re-fetch on child switch (no client-side DI import). */
  fetchChildTimetable?: (childId: string) => Promise<TimetableActionResult>;

  /**
   * Principal only — the teacher roster (omit / single-item hides the picker).
   * Parallel to `childList`, deliberately NOT unified with it: the id field,
   * the fallback rules and the status affordance all differ (US-E15.3
   * component architecture §1/§2).
   */
  teacherList?: PrincipalTeacher[];
  /** Principal only — initially-selected teacher. */
  initialTeacherId?: string;
  /** Principal only — re-fetch on teacher switch (member-scoped read). */
  fetchMemberTimetable?: (
    memberId: string,
    weekStart?: string,
  ) => Promise<TimetableActionResult>;
}

/** One legend entry (a subject actually present in the current week's grid). */
export interface LegendSubjectVm {
  subjectId: string;
  subjectName: string;
  colorToken: SubjectColorToken;
}
