/** Content type of a single lesson inside a chapter. */
export type LessonType = "video" | "pdf" | "text";

/** A structured, HTML-safe text block (heading + paragraphs) for text lessons. */
export interface LessonTextBlock {
  heading: string;
  paragraphs: string[];
}

/**
 * Student-facing lesson within a course chapter, carrying per-student progress
 * (`done`) and the content payload for its type. Distinct from lesson-bank's
 * teacher-authoring `LessonEntity` (US-E11.2) — different bounded concept.
 */
export interface LessonContentEntity {
  id: string;
  chapterId: string;
  type: LessonType;
  /** 1-based lesson number within its course ("Bài {order}"). */
  order: number;
  title: string;
  /** Pre-formatted duration/size label (e.g. "32 phút" / "12 trang"). Data, not i18n copy. */
  durationLabel: string;
  done: boolean;
  /** pdf only — pre-resolved download URL. */
  downloadHref?: string;
  /** text only — structured content blocks (no raw HTML → no dangerouslySetInnerHTML). */
  blocks?: LessonTextBlock[];
}
