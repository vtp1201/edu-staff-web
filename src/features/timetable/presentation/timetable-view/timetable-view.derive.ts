import type { WeeklyTimetable } from "@/features/timetable/domain/entities/weekly-timetable.entity";
import type {
  LegendSubjectVm,
  TimetableActionResult,
  TimetableDataState,
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
