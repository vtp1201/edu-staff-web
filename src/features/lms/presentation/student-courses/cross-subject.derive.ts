import type {
  CrossSubjectGroups,
  CrossSubjectRow,
} from "@/features/lms/domain/use-cases/sort-cross-subject-items";
import { isSafeHref } from "../shared/safe-href";
import { toneForId } from "../tone";
import type {
  CoursesView,
  CrossSubjectCtaVm,
  CrossSubjectGroupsVm,
  CrossSubjectRowVm,
  CrossSubjectSubTab,
} from "./cross-subject.i-vm";

/** How close a deadline has to be before a row reads as urgent (design-spec
 *  `crossSubjectList.row` — the same 48h cut the cards use). */
const DUE_SOON_MS = 48 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/** Route-owned link builders — only the route knows locale/tenant. */
export interface CrossSubjectHrefs {
  courseHrefFor: (courseId: string) => string;
  examHrefFor: (examId: string) => string;
}

/** ISO → ms, or `null` for absent/unparseable (an "Invalid Date" must never
 *  become a countdown). */
function msOf(iso: string | null): number | null {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Where the row's single button goes.
 *
 * Only an OPEN exam starts an exam. Everything else — a closed exam, an
 * upcoming one, every assignment — returns to the course timeline, where the
 * item's own body lives. An exam BE sent without any reference degrades to
 * "view" as well: a dead "Vào làm bài" is worse than an honest one.
 *
 * `examUrl` is a teacher/deployment-authored string reaching an `href`, so it
 * passes the same scheme gate the player uses before we trust it.
 */
function ctaFor(
  { course, item }: CrossSubjectRow,
  hrefs: CrossSubjectHrefs,
): CrossSubjectCtaVm {
  const view: CrossSubjectCtaVm = {
    kind: "view",
    href: hrefs.courseHrefFor(course.id),
    external: false,
  };

  if (item.itemType !== "EXAM" || item.state !== "OPEN") return view;

  const externalUrl = item.exam?.examUrl ?? null;
  if (externalUrl !== null && isSafeHref(externalUrl)) {
    return { kind: "start", href: externalUrl, external: true };
  }

  const examId = item.exam?.examId ?? null;
  if (examId !== null) {
    return { kind: "start", href: hrefs.examHrefFor(examId), external: false };
  }

  return view;
}

/**
 * Domain row → ViewModel (US-E24.4).
 *
 * The 48h urgency cut is resolved HERE, against the route's single `now`, so
 * every row in one response is judged by the same instant (identical rule to
 * `toCourseCardVms`). `hoursLeft` is floored at 1: BE can still report OPEN a
 * moment past the deadline, and "còn 0 giờ" / a negative countdown would be
 * worse copy than the floor.
 */
export function toCrossSubjectRowVm(
  row: CrossSubjectRow,
  now: Date,
  hrefs: CrossSubjectHrefs,
): CrossSubjectRowVm {
  const { course, item } = row;
  const dueMs = msOf(item.dueAt);
  const urgent =
    item.state === "OPEN" &&
    dueMs !== null &&
    dueMs - now.getTime() <= DUE_SOON_MS;

  return {
    key: `${course.id}:${item.id}`,
    itemId: item.id,
    itemType: item.itemType,
    title: item.title,
    state: item.state,
    startAt: item.startAt,
    dueAt: item.dueAt,
    courseTitle: course.title,
    tone: toneForId(course.id),
    urgent,
    hoursLeft:
      urgent && dueMs !== null
        ? Math.max(1, Math.round((dueMs - now.getTime()) / HOUR_MS))
        : null,
    cta: ctaFor(row, hrefs),
  };
}

export function toCrossSubjectGroupsVm(
  groups: CrossSubjectGroups,
  now: Date,
  hrefs: CrossSubjectHrefs,
): CrossSubjectGroupsVm {
  const map = (rows: CrossSubjectRow[]) =>
    rows.map((row) => toCrossSubjectRowVm(row, now, hrefs));

  return {
    open: map(groups.open),
    upcoming: map(groups.upcoming),
    closed: map(groups.closed),
  };
}

/**
 * `?view=` → the view, defaulting to the card grid.
 *
 * Defensive rather than validating: an unknown/absent/repeated param renders
 * the default view instead of 404-ing. A hand-typed URL is not an error worth
 * a dead end.
 */
export function parseCoursesView(
  raw: string | string[] | undefined,
): CoursesView {
  return raw === "assignment" || raw === "exam" ? raw : "all";
}

/**
 * `?sub=` → the sub-tab, defaulting to "Đang mở".
 *
 * `sub=upcoming` on the assignment view falls back rather than rendering a tab
 * that view does not have (D7: only EXAM rows can be `UPCOMING_HIDDEN`), which
 * would otherwise show a permanently empty group with no tab to leave it by.
 */
export function parseSubTab(
  raw: string | string[] | undefined,
  view: CoursesView,
): CrossSubjectSubTab {
  if (raw === "closed") return "closed";
  if (raw === "upcoming" && view === "exam") return "upcoming";
  return "open";
}
