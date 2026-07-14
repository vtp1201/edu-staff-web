import type {
  AssignmentEntity,
  AssignmentStatusFilter,
  SubmitAssignmentInput,
} from "../entities/assignment.entity";
import type { ChapterEntity } from "../entities/chapter.entity";
import type {
  CourseHeader,
  CourseProgress,
  CourseSummary,
} from "../entities/course.entity";
import type { LessonContentEntity } from "../entities/lesson.entity";
import type { LessonNoteEntity } from "../entities/lesson-note.entity";
import type { LessonQuestionEntity } from "../entities/lesson-question.entity";

/** Lesson hierarchy + course header for one course. */
export interface CourseLessonsData {
  course: CourseHeader;
  chapters: ChapterEntity[];
}

/** Result of marking a lesson complete: the updated lesson + recomputed progress. */
export interface MarkCompleteData {
  lesson: LessonContentEntity;
  courseProgress: CourseProgress;
}

/**
 * LMS student-consumption repository. Notes/Q&A are thin persistence methods
 * (mock-local per lessonId) rather than a separate use-case layer.
 * Errors are thrown (`Error("not-found")`); use-cases map them to `LmsFailure`.
 */
export interface ILmsRepository {
  listCourses(studentId: string): Promise<CourseSummary[]>;
  getCourseLessons(courseId: string): Promise<CourseLessonsData>;
  markLessonComplete(lessonId: string): Promise<MarkCompleteData>;
  getNote(lessonId: string): Promise<LessonNoteEntity | null>;
  saveNote(lessonId: string, content: string): Promise<LessonNoteEntity>;
  listQuestions(lessonId: string): Promise<LessonQuestionEntity[]>;
  askQuestion(
    lessonId: string,
    question: string,
  ): Promise<LessonQuestionEntity>;

  /**
   * The student's own assignments, optionally filtered by status. Errors are
   * thrown (`Error("network-error")`); the use-case maps them to
   * `AssignmentFailure`.
   */
  listAssignments(
    studentId: string,
    statusFilter?: AssignmentStatusFilter,
  ): Promise<AssignmentEntity[]>;

  /**
   * Submits a pending assignment, returning the updated entity
   * (`status: "submitted"`). Throws `Error("not-found")` /
   * `Error("already-submitted")` / `Error("forbidden")` / `Error("network-error")`.
   */
  submitAssignment(
    assignmentId: string,
    input: SubmitAssignmentInput,
  ): Promise<AssignmentEntity>;
}
