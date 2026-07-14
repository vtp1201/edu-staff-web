import type { AssignmentEntity } from "../../domain/entities/assignment.entity";
import type { ChapterEntity } from "../../domain/entities/chapter.entity";
import type {
  CourseHeader,
  CourseSummary,
  CourseTone,
} from "../../domain/entities/course.entity";
import type { LessonContentEntity } from "../../domain/entities/lesson.entity";
import { calculateCourseProgress } from "../../domain/use-cases/calculate-course-progress";
import type { AssignmentDto } from "../dtos/assignment-response.dto";
import type {
  ChapterDto,
  CourseLessonsDto,
  LessonDto,
} from "../dtos/course-lessons-response.dto";
import type { CourseDto } from "../dtos/course-response.dto";

/**
 * Maps a raw accent color (hex from mock/BE) to a semantic design-system tone.
 * The client only ever receives the tone name — never a hex (fe-lead decision).
 * Hexes match the EduPortal palette (design-system.md); unknown → primary.
 */
const HEX_TO_TONE: Record<string, CourseTone> = {
  "#5d87ff": "primary", // --edu-primary
  "#13deb9": "success", // --edu-success
  "#ffae1f": "warning", // --edu-warning
  "#7b5ea7": "purple", // --edu-purple
  "#00b8a9": "teal", // --edu-teal
  "#fa896b": "error", // --edu-error
};

export function mapColorToTone(color: string): CourseTone {
  return HEX_TO_TONE[color.trim().toLowerCase()] ?? "primary";
}

export function mapCourseSummary(dto: CourseDto): CourseSummary {
  return {
    id: dto.id,
    name: dto.name,
    teacherName: dto.teacherName,
    tone: mapColorToTone(dto.color),
    gradeAvg: dto.grade,
    progress: calculateCourseProgress(dto.lessonsDone, dto.lessonsTotal),
  };
}

export function mapLesson(dto: LessonDto): LessonContentEntity {
  return {
    id: dto.id,
    chapterId: dto.chapterId,
    type: dto.type,
    order: dto.order,
    title: dto.title,
    durationLabel: dto.durationLabel,
    done: dto.done,
    ...(dto.downloadHref !== undefined
      ? { downloadHref: dto.downloadHref }
      : {}),
    ...(dto.blocks !== undefined ? { blocks: dto.blocks } : {}),
  };
}

export function mapChapter(dto: ChapterDto): ChapterEntity {
  return {
    id: dto.id,
    title: dto.title,
    lessons: dto.lessons.map(mapLesson),
    isEmpty: dto.lessons.length === 0,
  };
}

export function mapCourseHeader(dto: CourseLessonsDto["course"]): CourseHeader {
  return { id: dto.id, name: dto.name, tone: mapColorToTone(dto.color) };
}

/** Maps an assignment DTO → entity, resolving the hex `courseColor` to a tone.
 *  An empty-string `teacherComment` is preserved (not coerced to null) — it is a
 *  valid graded value that drives the empty-comment fallback copy (FR-008). */
export function mapAssignment(dto: AssignmentDto): AssignmentEntity {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    subject: dto.subject,
    className: dto.className,
    teacherName: dto.teacherName,
    tone: mapColorToTone(dto.courseColor),
    dueDate: dto.dueDate,
    status: dto.status,
    submittedAt: dto.submittedAt,
    gradedAt: dto.gradedAt,
    score: dto.score,
    maxScore: dto.maxScore,
    teacherComment: dto.teacherComment,
    fileName: dto.fileName,
    answerText: dto.answerText,
    gradedFileName: dto.gradedFileName,
  };
}

export function mapCourseLessons(dto: CourseLessonsDto): {
  course: CourseHeader;
  chapters: ChapterEntity[];
} {
  return {
    course: mapCourseHeader(dto.course),
    chapters: dto.chapters.map(mapChapter),
  };
}
