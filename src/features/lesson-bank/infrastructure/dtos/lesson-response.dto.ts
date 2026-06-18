import type {
  LessonFileType,
  LessonVisibility,
} from "../../domain/entities/lesson.entity";

export interface LessonResponseDto {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  subjectName: string;
  department?: string;
  fileType: LessonFileType;
  fileUrl: string;
  thumbnailUrl?: string;
  visibility: LessonVisibility;
  uploadedAt: string;
  authorId: string;
  authorName: string;
  viewCount: number;
}

export type LessonListResponseDto = LessonResponseDto[];
