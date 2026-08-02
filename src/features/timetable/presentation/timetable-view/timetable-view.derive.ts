import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import type {
  LegendSubjectVm,
  TimetableActionResult,
  TimetableDataState,
  TimetableRole,
} from "./timetable-view.i-vm";

/**
 * Map a Server-Action result to the data-region state. `not-found` / `no-child`
 * are not errors from the viewer's perspective — the class simply has no
 * published timetable → the empty state. Everything else → the error banner.
 */
export function toDataState(result: TimetableActionResult): TimetableDataState {
  if (result.ok) return { status: "success", timetable: result.data };
  if (result.errorKey === "not-found" || result.errorKey === "no-child") {
    return { status: "empty" };
  }
  return { status: "error", errorKey: result.errorKey };
}

/** What the error banner's "Thử lại" button should actually do. */
export type RetryTarget = "child" | "teacher" | "refresh";

/**
 * Decide the retry action for the shared error banner.
 *
 * The member-scoped re-fetch is only meaningful when there IS a selected member.
 * When the ROSTER call itself failed, the page seeds `{status:"error"}` with an
 * empty list, so the selected id is `""` — re-fetching with it could never
 * recover the failure that occurred (and is meaningless for `forbidden`). In
 * that case the only honest retry is re-running the RSC (`router.refresh()`).
 * Deliberately generic: the parent and principal paths share the trap.
 */
export function resolveRetryTarget(input: {
  viewerRole: TimetableRole;
  selectedChildId: string;
  selectedTeacherId: string;
  canFetchChild: boolean;
  canFetchMember: boolean;
}): RetryTarget {
  if (
    input.viewerRole === "parent" &&
    input.canFetchChild &&
    input.selectedChildId
  )
    return "child";
  if (
    input.viewerRole === "principal" &&
    input.canFetchMember &&
    input.selectedTeacherId
  )
    return "teacher";
  return "refresh";
}

/** Subjects actually present in the grid (dedup by id, first-seen order) — legend. */
export function subjectsUsed(tt: WeeklyTimetable): LegendSubjectVm[] {
  const seen = new Set<string>();
  const out: LegendSubjectVm[] = [];
  for (const day of Object.keys(tt.slots)
    .map(Number)
    .sort((a, b) => a - b)) {
    const periods = tt.slots[day];
    for (const period of Object.keys(periods)
      .map(Number)
      .sort((a, b) => a - b)) {
      const slot = periods[period];
      if (slot && !seen.has(slot.subjectId)) {
        seen.add(slot.subjectId);
        out.push({
          subjectId: slot.subjectId,
          subjectName: slot.subjectName,
          colorToken: slot.subjectColorToken,
        });
      }
    }
  }
  return out;
}

/** True when the grid has at least one filled slot. */
export function hasAnySlot(tt: WeeklyTimetable): boolean {
  return Object.values(tt.slots).some((periods) =>
    Object.values(periods).some((slot) => slot !== null),
  );
}
