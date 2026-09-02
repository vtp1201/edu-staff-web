import type { CourseItem } from "@/features/lms/domain/entities/course-item.entity";
import type { TimelineItemVm } from "./lesson-player.i-vm";

/** Entity → VM. Order is preserved verbatim — BE's `(position, createdAt, id)`
 *  ordering is the contract, so the client never sorts. */
export function toTimelineItems(items: CourseItem[]): TimelineItemVm[] {
  return items.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    title: item.title,
    description: item.description,
    url: item.url,
    dueAt: item.dueAt,
    state: item.state,
    examUrl: item.exam?.examUrl ?? null,
    examDurationMinutes: item.exam?.durationMinutes ?? null,
  }));
}

/**
 * The lesson to open on arrival: the first LESSON tile the caller may actually
 * read. `UPCOMING_HIDDEN` is excluded — for a student that value only ever
 * appears on an EXAM tile, but a TEACHER read includes hidden lessons and
 * auto-opening one would show unreleased content as if it were live.
 */
export function pickInitialLessonId(items: TimelineItemVm[]): string | null {
  const lesson = items.find(
    (item) => item.itemType === "LESSON" && item.state !== "UPCOMING_HIDDEN",
  );
  return lesson?.id ?? null;
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
