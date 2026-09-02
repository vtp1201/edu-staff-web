import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import { groupItemsByWeek } from "@/features/lms/domain/use-cases/group-items-by-week";
import type { TimelineItemVm, WeekVm } from "./course-timeline.i-vm";

/**
 * Entity → VM. Order is preserved verbatim inside every week — BE's
 * `(position, createdAt, id)` ordering is the contract, so the client only
 * PARTITIONS by week (`groupItemsByWeek`), it never sorts rows.
 */
export function toWeekVms(items: CourseItem[]): WeekVm[] {
  return groupItemsByWeek(items).map((group) => ({
    key: group.key,
    weekStart: group.weekStart,
    weekEnd: group.weekEnd,
    items: group.items.map(toTimelineItem),
  }));
}

function toTimelineItem(item: CourseItem): TimelineItemVm {
  // `UPCOMING_HIDDEN` is the only unopenable state. CLOSED stays clickable on
  // purpose: a student may re-read closed material for revision (AC).
  const locked = item.state === "UPCOMING_HIDDEN";

  return {
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    state: item.state,
    startAt: item.startAt,
    dueAt: item.dueAt,
    description: item.description,
    url: item.url,
    examUrl: item.exam?.examUrl ?? null,
    examDurationMinutes: item.exam?.durationMinutes ?? null,
    locked,
    // Null is a real case: BE may hide an item with no announced release time.
    opensAt: locked ? item.startAt : null,
  };
}

/** One rendered paragraph of a lesson body, with a stable render key. */
export interface LessonParagraph {
  /** Ordinal-based and stable: the list is derived from one immutable string,
   *  never reordered or filtered, and paragraph TEXT can legitimately repeat. */
  id: string;
  text: string;
}

/** Split a plain-text lesson body into paragraphs on blank lines. BE stores
 *  `content` as text (max 50 000 runes) — never HTML, so nothing is ever
 *  injected with `dangerouslySetInnerHTML`. */
export function toParagraphs(content: string): LessonParagraph[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((text, index) => ({ id: `p${index}`, text }));
}
