import type { TimetableChild } from "@/features/timetable/domain/entities/timetable-child.entity";
import type { SubjectColorToken } from "@/features/timetable/domain/entities/timetable-slot.entity";
import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import type { TimetableViewFailure } from "@/features/timetable/domain/failures/timetable-view.failure";

export type TimetableRole = "student" | "parent";

/** Stable error keys a Server Action may return (failure union + guard). */
export type TimetableErrorKey = TimetableViewFailure["type"] | "forbidden";

/** Result shape returned by every timetable Server Action (never translated). */
export type TimetableActionResult =
  | { ok: true; data: WeeklyTimetable }
  | { ok: false; errorKey: TimetableErrorKey };

export type ChildListActionResult =
  | { ok: true; data: TimetableChild[] }
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
}

/** One legend entry (a subject actually present in the current week's grid). */
export interface LegendSubjectVm {
  subjectId: string;
  subjectName: string;
  colorToken: SubjectColorToken;
}
