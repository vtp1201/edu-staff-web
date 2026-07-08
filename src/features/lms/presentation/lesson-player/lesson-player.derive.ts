import type { ChapterEntity } from "@/features/lms/domain/entities/chapter.entity";
import type { LessonContentEntity } from "@/features/lms/domain/entities/lesson.entity";
import { calculateCourseProgress } from "@/features/lms/domain/use-cases/calculate-course-progress";
import type { ActiveLessonVm, ChapterVm } from "./lesson-player.i-vm";

/** All lessons across chapters, in order, tagged with their chapter title. */
export function flattenLessons(
  chapters: ChapterEntity[],
): Array<{ lesson: LessonContentEntity; chapterTitle: string }> {
  return chapters.flatMap((ch) =>
    ch.lessons.map((lesson) => ({ lesson, chapterTitle: ch.title })),
  );
}

/** Lightweight projection for ChapterList (no content payload). */
export function projectChapters(chapters: ChapterEntity[]): ChapterVm[] {
  return chapters.map((ch) => ({
    id: ch.id,
    title: ch.title,
    isEmpty: ch.isEmpty,
    lessons: ch.lessons.map((l) => ({
      id: l.id,
      order: l.order,
      title: l.title,
      type: l.type,
      durationLabel: l.durationLabel,
      done: l.done,
    })),
  }));
}

/** Server/client shared initial-lesson pick: active/first-incomplete → first → null. */
export function pickInitialLessonId(chapters: ChapterEntity[]): string | null {
  const all = flattenLessons(chapters).map((x) => x.lesson);
  if (all.length === 0) return null;
  return (all.find((l) => !l.done) ?? all[0])?.id ?? null;
}

/** Build the discriminated content VM for the active lesson. */
export function toActiveLessonVm(
  chapters: ChapterEntity[],
  activeLessonId: string | null,
): ActiveLessonVm {
  if (!activeLessonId) return null;
  const found = flattenLessons(chapters).find(
    (x) => x.lesson.id === activeLessonId,
  );
  if (!found) return null;
  const { lesson, chapterTitle } = found;
  const base = {
    id: lesson.id,
    title: lesson.title,
    chapterTitle,
    durationLabel: lesson.durationLabel,
    done: lesson.done,
  };
  switch (lesson.type) {
    case "video":
      return { type: "video", ...base };
    case "pdf":
      return { type: "pdf", ...base, downloadHref: lesson.downloadHref ?? "#" };
    case "text":
      return { type: "text", ...base, blocks: lesson.blocks ?? [] };
  }
}

/** Next lesson id after the active one, or null if it's the last / not found. */
export function findNextLessonId(
  chapters: ChapterEntity[],
  activeLessonId: string | null,
): string | null {
  const all = flattenLessons(chapters).map((x) => x.lesson);
  const idx = all.findIndex((l) => l.id === activeLessonId);
  if (idx < 0 || idx >= all.length - 1) return null;
  return all[idx + 1]?.id ?? null;
}

/** Course progress (done/total/pct) computed from the chapter hierarchy. */
export function courseProgressOf(chapters: ChapterEntity[]) {
  const all = flattenLessons(chapters).map((x) => x.lesson);
  const done = all.filter((l) => l.done).length;
  return calculateCourseProgress(done, all.length);
}

/** Immutably flip a lesson's `done` flag across the hierarchy (optimistic patch). */
export function patchLessonDone(
  chapters: ChapterEntity[],
  lessonId: string,
  done: boolean,
): ChapterEntity[] {
  return chapters.map((ch) => ({
    ...ch,
    lessons: ch.lessons.map((l) => (l.id === lessonId ? { ...l, done } : l)),
  }));
}
