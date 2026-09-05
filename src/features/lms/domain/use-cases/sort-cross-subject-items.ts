import type { CourseSummary } from "../entities/course.entity";
import type { CourseItem } from "../entities/course-item.entity";
import type { CourseTimeline } from "./fetch-course-timelines";

/** One cross-subject row: the item plus the course it came from (the row's
 *  subject badge and its "xem trong khoá học" target both need it). */
export interface CrossSubjectRow {
  course: CourseSummary;
  item: CourseItem;
}

export interface CrossSubjectGroups {
  open: CrossSubjectRow[];
  /** Only ever populated for EXAM: a student read returns `UPCOMING_HIDDEN`
   *  for no other type (D7). Nothing here special-cases that — an assignment
   *  list simply never has such a row. */
  upcoming: CrossSubjectRow[];
  closed: CrossSubjectRow[];
}

/** Missing boundary → sorts LAST in every group ("unknown" is not "urgent"). */
const UNKNOWN = Number.POSITIVE_INFINITY;

function msOf(iso: string | null): number {
  if (iso === null) return UNKNOWN;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : UNKNOWN;
}

/** Ascending by `key`, unknown last. */
function byAsc(
  key: (row: CrossSubjectRow) => number,
): (a: CrossSubjectRow, b: CrossSubjectRow) => number {
  return (a, b) => key(a) - key(b);
}

/**
 * Descending by `key` but keeping unknown LAST — a plain reverse would float
 * the `Infinity` rows to the top, i.e. "no deadline" would outrank "closed
 * yesterday" in a list whose whole point is recency.
 */
function byDescUnknownLast(
  key: (row: CrossSubjectRow) => number,
): (a: CrossSubjectRow, b: CrossSubjectRow) => number {
  return (a, b) => {
    const [x, y] = [key(a), key(b)];
    if (x === UNKNOWN && y === UNKNOWN) return 0;
    if (x === UNKNOWN) return 1;
    if (y === UNKNOWN) return -1;
    return y - x;
  };
}

/**
 * Every course's timeline flattened into ONE list of a single item type,
 * grouped by BE state and ordered per group (US-E24.4, design-spec
 * `crossSubjectList.sort`).
 *
 * Pure and clock-free: `state` is BE-computed and is never re-derived here
 * (design-spec `statusSource` — the mockup's `ciStatus()` recompute is demo
 * code), and "how urgent" is a presentation concern resolved against the
 * route's single `now`. Ordering is therefore fully provable without a timer.
 *
 * A course whose timeline read failed contributes NOTHING: its items were
 * never loaded, so including it is impossible and pretending it is empty is
 * exactly the "confident lie" the card view refuses too (it degrades to "—").
 */
export function sortCrossSubjectItems(
  timelines: CourseTimeline[],
  itemType: "ASSIGNMENT" | "EXAM",
): CrossSubjectGroups {
  const rows: CrossSubjectRow[] = timelines
    .filter((timeline) => !timeline.itemsFailed)
    .flatMap((timeline) =>
      timeline.items
        .filter((item) => item.itemType === itemType)
        .map((item) => ({ course: timeline.course, item })),
    );

  const inState = (state: CourseItem["state"]) =>
    rows.filter((row) => row.item.state === state);

  return {
    open: inState("OPEN").sort(byAsc((row) => msOf(row.item.dueAt))),
    upcoming: inState("UPCOMING_HIDDEN").sort(
      byAsc((row) => msOf(row.item.startAt)),
    ),
    closed: inState("CLOSED").sort(
      byDescUnknownLast((row) => msOf(row.item.dueAt)),
    ),
  };
}
