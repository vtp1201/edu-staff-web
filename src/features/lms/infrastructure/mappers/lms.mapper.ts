import type {
  Assignment,
  AssignmentSummary,
} from "../../domain/entities/assignment.entity";
import type {
  Course,
  CourseSummary,
} from "../../domain/entities/course.entity";
import type {
  CourseItem,
  CourseItemExam,
} from "../../domain/entities/course-item.entity";
import type {
  Lesson,
  LessonSummary,
} from "../../domain/entities/lesson.entity";
import type { Submission } from "../../domain/entities/submission.entity";
import type {
  AssignmentResponseDto,
  AssignmentSummaryResponseDto,
} from "../dtos/assignment-response.dto";
import type { CourseItemResponseDto } from "../dtos/course-item-response.dto";
import type {
  CourseResponseDto,
  CourseSummaryResponseDto,
} from "../dtos/course-response.dto";
import type {
  LessonResponseDto,
  LessonSummaryResponseDto,
} from "../dtos/lesson-response.dto";
import type { SubmissionResponseDto } from "../dtos/submission-response.dto";

/**
 * `services/lms` DTO → entity mappers (US-E24.1).
 *
 * Almost every field is a pass-through — the wire is already camelCase and the
 * entities were written FROM the contract, so the mapper's real job is to add
 * nothing. The ONE reshape is `CourseItem.exam`: BE returns
 * `examId`/`scheduledDate`/`durationMinutes`/`examUrl` FLAT and null off an
 * EXAM row; nesting them makes "these belong to an exam tile" a type-level
 * fact instead of four repeated null checks in presentation.
 */

/** EXAM-only block. Requires BOTH an EXAM item type and an `examId` — a
 *  fabricated block for a row missing its id would be worse than none. */
function toExam(dto: CourseItemResponseDto): CourseItemExam | null {
  if (dto.itemType !== "EXAM" || dto.examId === null) return null;
  return {
    examId: dto.examId,
    scheduledDate: dto.scheduledDate,
    durationMinutes: dto.durationMinutes,
    examUrl: dto.examUrl,
  };
}

export function toCourseItem(dto: CourseItemResponseDto): CourseItem {
  return {
    id: dto.id,
    courseId: dto.courseId,
    itemType: dto.itemType,
    refId: dto.refId,
    title: dto.title,
    description: dto.description,
    url: dto.url,
    position: dto.position,
    startAt: dto.startAt,
    dueAt: dto.dueAt,
    // BE-COMPUTED — passed through verbatim, never re-derived from the window.
    state: dto.state,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    exam: toExam(dto),
  };
}

export function toCourse(dto: CourseResponseDto): Course {
  return {
    id: dto.id,
    classId: dto.classId,
    subjectId: dto.subjectId,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    isDefault: dto.isDefault,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    publishedAt: dto.publishedAt,
  };
}

/** Narrower than `toCourse` BY DESIGN — `description`/`createdAt` are absent
 *  from the by-class table and are NOT defaulted to "" / now. */
export function toCourseSummary(dto: CourseSummaryResponseDto): CourseSummary {
  return {
    id: dto.id,
    classId: dto.classId,
    subjectId: dto.subjectId,
    title: dto.title,
    status: dto.status,
    isDefault: dto.isDefault,
    createdBy: dto.createdBy,
    updatedAt: dto.updatedAt,
    publishedAt: dto.publishedAt,
  };
}

export function toLesson(dto: LessonResponseDto): Lesson {
  return {
    id: dto.id,
    courseId: dto.courseId,
    title: dto.title,
    content: dto.content,
    position: dto.position,
    startAt: dto.startAt,
    dueAt: dto.dueAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toLessonSummary(dto: LessonSummaryResponseDto): LessonSummary {
  return {
    id: dto.id,
    courseId: dto.courseId,
    title: dto.title,
    position: dto.position,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toAssignment(dto: AssignmentResponseDto): Assignment {
  return {
    id: dto.id,
    classId: dto.classId,
    subjectId: dto.subjectId,
    courseId: dto.courseId,
    title: dto.title,
    instructions: dto.instructions,
    startAt: dto.startAt,
    dueAt: dto.dueAt,
    state: dto.state,
    createdBy: dto.createdBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** No `state`, no `instructions` — the by-class row genuinely has neither. */
export function toAssignmentSummary(
  dto: AssignmentSummaryResponseDto,
): AssignmentSummary {
  return {
    id: dto.id,
    classId: dto.classId,
    subjectId: dto.subjectId,
    courseId: dto.courseId,
    title: dto.title,
    dueAt: dto.dueAt,
    createdBy: dto.createdBy,
    updatedAt: dto.updatedAt,
  };
}

export function toSubmission(dto: SubmissionResponseDto): Submission {
  return {
    assignmentId: dto.assignmentId,
    studentUserId: dto.studentUserId,
    content: dto.content,
    status: dto.status,
    submittedAt: dto.submittedAt,
  };
}
