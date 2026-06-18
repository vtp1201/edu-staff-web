import type { LessonEntity } from "../../domain/entities/lesson.entity";
import type { LessonResponseDto } from "../dtos/lesson-response.dto";

export function mapLesson(dto: LessonResponseDto): LessonEntity {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    subjectId: dto.subjectId,
    subjectName: dto.subjectName,
    department: dto.department,
    fileType: dto.fileType,
    fileUrl: dto.fileUrl,
    thumbnailUrl: dto.thumbnailUrl,
    visibility: dto.visibility,
    uploadedAt: dto.uploadedAt,
    authorId: dto.authorId,
    authorName: dto.authorName,
    viewCount: dto.viewCount,
  };
}

export function mapLessonList(dtos: LessonResponseDto[]): LessonEntity[] {
  return dtos.map(mapLesson);
}
