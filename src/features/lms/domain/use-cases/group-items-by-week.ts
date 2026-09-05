import type { CourseItem } from "../entities/course-item.entity";

/**
 * One rendered section of the course timeline (US-E24.3).
 *
 * `weekStart`/`weekEnd` are DATE-ONLY ISO strings (`YYYY-MM-DD`), not formatted
 * text: the domain must not know the reader's locale. Presentation renders them
 * through `Intl` at the edge (with `timeZone: "UTC"`, matching how they were
 * computed, so a week label never slips a day across time zones).
 */
export interface WeekGroup {
  /** `"always"` for the un-windowed group, else an ISO week id (`2026-W17`). */
  key: string;
  /** Monday of the ISO week; null for the `"always"` group. */
  weekStart: string | null;
  /** Sunday of the ISO week; null for the `"always"` group. */
  weekEnd: string | null;
  /** BE order preserved verbatim (see below). */
  items: CourseItem[];
}

const DAY_MS = 86_400_000;
const ALWAYS_KEY = "always";

/** `YYYY-MM-DD` of a UTC instant. */
function toDateOnly(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * ISO-8601 week of a UTC instant: Monday-start, week 1 is the week holding
 * Jan 4. Written inline on purpose — the repo carries no date library
 * (`date-fns`/`dayjs` are absent from `package.json`) and this is 20 lines of
 * pure arithmetic; adding a dependency for it would be the larger change.
 */
function isoWeekOf(ms: number): {
  key: string;
  startMs: number;
  endMs: number;
} {
  const d = new Date(ms);
  // Monday-indexed day of week (Mon = 0 … Sun = 6).
  const dayIndex = (d.getUTCDay() + 6) % 7;
  const midnightUtc = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  );
  const startMs = midnightUtc - dayIndex * DAY_MS;
  // The Thursday of the week decides the ISO year (that is the whole point of
  // the ISO rule — a week belongs to the year holding its Thursday).
  const thursdayMs = startMs + 3 * DAY_MS;
  const isoYear = new Date(thursdayMs).getUTCFullYear();
  // Thursday of the week that contains Jan 4 = Thursday of ISO week 1.
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Index = (jan4.getUTCDay() + 6) % 7;
  const firstThursdayMs = jan4.getTime() - jan4Index * DAY_MS + 3 * DAY_MS;
  const week = 1 + Math.round((thursdayMs - firstThursdayMs) / (7 * DAY_MS));

  return {
    key: `${isoYear}-W${String(week).padStart(2, "0")}`,
    startMs,
    endMs: startMs + 6 * DAY_MS,
  };
}

/**
 * Fold a course timeline into week sections (US-E24.3, design-spec
 * `student-course-timeline.model.weekGrouping`).
 *
 * A pure helper, not a `*.use-case.ts` class: it touches no repository (same
 * shape as `summarize-course.ts`).
 *
 * Rules:
 * - `startAt === null` → the `"always"` group, rendered FIRST. Its label
 *   ("Luôn mở") is resolved by presentation — the domain emits a key, not copy.
 * - Otherwise the item's ISO week of `startAt`, groups sorted ascending.
 * - Inside a group, BE order (`position`, then `createdAt`, then `id`) is the
 *   contract, so the items array is never re-sorted here — only partitioned.
 * - No `now` parameter: which week an item belongs to is a function of
 *   `startAt` alone. Availability (`state`) is BE-computed and irrelevant to
 *   grouping — a CLOSED item stays in its own week (EPIC §2: never re-derive
 *   availability from a clock).
 */
export function groupItemsByWeek(items: CourseItem[]): WeekGroup[] {
  const byKey = new Map<string, WeekGroup>();

  for (const item of items) {
    const ms = item.startAt === null ? Number.NaN : Date.parse(item.startAt);
    // An unparseable `startAt` degrades to "always" rather than producing an
    // `Invalid Date` week label (or throwing) on screen.
    const week = Number.isFinite(ms) ? isoWeekOf(ms) : null;
    const key = week?.key ?? ALWAYS_KEY;

    const group = byKey.get(key);
    if (group) {
      group.items.push(item);
      continue;
    }
    byKey.set(key, {
      key,
      weekStart: week ? toDateOnly(week.startMs) : null,
      weekEnd: week ? toDateOnly(week.endMs) : null,
      items: [item],
    });
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.key === ALWAYS_KEY) return -1;
    if (b.key === ALWAYS_KEY) return 1;
    return (a.weekStart ?? "").localeCompare(b.weekStart ?? "");
  });
}
