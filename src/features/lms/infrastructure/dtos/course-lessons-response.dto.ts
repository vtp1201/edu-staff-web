import type { LessonType } from "../../domain/entities/lesson.entity";

export interface LessonDto {
  id: string;
  chapterId: string;
  type: LessonType;
  order: number;
  title: string;
  durationLabel: string;
  done: boolean;
  downloadHref?: string;
  blocks?: Array<{ heading: string; paragraphs: string[] }>;
}

export interface ChapterDto {
  id: string;
  title: string;
  lessons: LessonDto[];
}

export interface CourseLessonsDto {
  course: { id: string; name: string; color: string };
  chapters: ChapterDto[];
}
