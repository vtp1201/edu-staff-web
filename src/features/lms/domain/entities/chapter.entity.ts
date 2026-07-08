import type { LessonContentEntity } from "./lesson.entity";

/** A chapter groups lessons within a course. `isEmpty` = teacher uploaded none. */
export interface ChapterEntity {
  id: string;
  title: string;
  lessons: LessonContentEntity[];
  isEmpty: boolean;
}
