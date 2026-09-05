import "server-only";

import type { AxiosInstance } from "axios";
import { LMS_EP } from "@/bootstrap/endpoint/lms.endpoint";
import type {
  Assignment,
  AssignmentSummary,
} from "../../domain/entities/assignment.entity";
import type {
  Course,
  CourseSummary,
} from "../../domain/entities/course.entity";
import type { CourseItem } from "../../domain/entities/course-item.entity";
import type {
  Lesson,
  LessonSummary,
} from "../../domain/entities/lesson.entity";
import type { Submission } from "../../domain/entities/submission.entity";
import type {
  CreateAssignmentInput,
  CreateDocumentItemInput,
  CreateLessonInput,
  ILmsRepository,
  UpdateCourseItemInput,
} from "../../domain/repositories/i-lms.repository";
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
import {
  toAssignment,
  toAssignmentSummary,
  toCourse,
  toCourseItem,
  toCourseSummary,
  toLesson,
  toLessonSummary,
  toSubmission,
} from "../mappers/lms.mapper";
import {
  isSubmissionNotFound,
  toLmsFailure,
} from "../mappers/lms-failure.mapper";

/**
 * REAL `lms` repository (US-E24.1, ADR 0075 — supersedes the ADR 0073
 * force-mock). Talks to the deployed service through Kong; see `LMS_EP` for
 * why every path carries the double `lms` segment.
 *
 * Conventions:
 * - the HTTP interceptor already unwrapped the envelope, so every call casts
 *   the payload directly (`as unknown as <Dto>`) — never `.data`;
 * - none of these endpoints paginate (BE bounds every list by construction:
 *   200 lessons/course, 500 items/course, 500 assignments/class), so there is
 *   no `raw: true` + `parseEnvelope` cursor drain anywhere in this file;
 * - every method throws an `LmsFailure` (see `i-lms.repository.ts`), mapped
 *   from `error.code` by `toLmsFailure`.
 */
export class LmsRepository implements ILmsRepository {
  constructor(private readonly http: AxiosInstance) {}

  /** Single catch boundary: any thrown `ApiError` becomes an `LmsFailure`. */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      throw toLmsFailure(err);
    }
  }

  // ── reads ───────────────────────────────────────────────────────────────

  async listCourses(
    classId: string,
    subjectId?: string,
  ): Promise<CourseSummary[]> {
    return this.call(async () => {
      const rows = (await this.http.get(LMS_EP.courses, {
        params: subjectId ? { classId, subjectId } : { classId },
      })) as unknown as CourseSummaryResponseDto[];
      return rows.map(toCourseSummary);
    });
  }

  async getCourse(courseId: string): Promise<Course> {
    return this.call(async () =>
      toCourse(
        (await this.http.get(
          LMS_EP.course(courseId),
        )) as unknown as CourseResponseDto,
      ),
    );
  }

  async listLessons(courseId: string): Promise<LessonSummary[]> {
    return this.call(async () => {
      const rows = (await this.http.get(
        LMS_EP.lessons(courseId),
      )) as unknown as LessonSummaryResponseDto[];
      return rows.map(toLessonSummary);
    });
  }

  async getLesson(courseId: string, lessonId: string): Promise<Lesson> {
    return this.call(async () =>
      toLesson(
        (await this.http.get(
          LMS_EP.lesson(courseId, lessonId),
        )) as unknown as LessonResponseDto,
      ),
    );
  }

  async listItems(courseId: string): Promise<CourseItem[]> {
    return this.call(async () => {
      const rows = (await this.http.get(
        LMS_EP.items(courseId),
      )) as unknown as CourseItemResponseDto[];
      // BE order is meaningful (position, createdAt, id) — never re-sort here.
      return rows.map(toCourseItem);
    });
  }

  async listAssignments(
    classId: string,
    filter?: { subjectId?: string; courseId?: string },
  ): Promise<AssignmentSummary[]> {
    return this.call(async () => {
      const params: Record<string, string> = { classId };
      if (filter?.subjectId) params.subjectId = filter.subjectId;
      if (filter?.courseId) params.courseId = filter.courseId;
      const rows = (await this.http.get(LMS_EP.assignments, {
        params,
      })) as unknown as AssignmentSummaryResponseDto[];
      return rows.map(toAssignmentSummary);
    });
  }

  async getAssignment(assignmentId: string): Promise<Assignment> {
    return this.call(async () =>
      toAssignment(
        (await this.http.get(
          LMS_EP.assignment(assignmentId),
        )) as unknown as AssignmentResponseDto,
      ),
    );
  }

  /**
   * `404 LMS_SUBMISSION_NOT_FOUND` is the documented "you have not submitted
   * yet" answer, so it resolves to `null` — turning it into a failure would
   * make the normal pre-submit state look like an error to every caller.
   * Every OTHER 404 (`LMS_ASSIGNMENT_NOT_FOUND` = denied/absent) still throws.
   */
  async getMySubmission(assignmentId: string): Promise<Submission | null> {
    try {
      return toSubmission(
        (await this.http.get(
          LMS_EP.mySubmission(assignmentId),
        )) as unknown as SubmissionResponseDto,
      );
    } catch (err) {
      if (isSubmissionNotFound(err)) return null;
      throw toLmsFailure(err);
    }
  }

  // ── commands ────────────────────────────────────────────────────────────

  async submitAssignment(
    assignmentId: string,
    content: string,
  ): Promise<Submission> {
    return this.call(async () =>
      toSubmission(
        (await this.http.post(LMS_EP.submissions(assignmentId), {
          content,
        })) as unknown as SubmissionResponseDto,
      ),
    );
  }

  async createLesson(
    courseId: string,
    input: CreateLessonInput,
  ): Promise<Lesson> {
    return this.call(async () =>
      toLesson(
        (await this.http.post(
          LMS_EP.lessons(courseId),
          input,
        )) as unknown as LessonResponseDto,
      ),
    );
  }

  async createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
    return this.call(async () =>
      toAssignment(
        (await this.http.post(
          LMS_EP.assignments,
          input,
        )) as unknown as AssignmentResponseDto,
      ),
    );
  }

  async addDocumentItem(
    courseId: string,
    input: CreateDocumentItemInput,
  ): Promise<CourseItem> {
    return this.call(async () =>
      toCourseItem(
        (await this.http.post(
          LMS_EP.itemDocuments(courseId),
          input,
        )) as unknown as CourseItemResponseDto,
      ),
    );
  }

  /** The window halves are three-state — an explicit `null` CLEARS one, so the
   *  patch object is forwarded as-is rather than having its nulls stripped. */
  async patchItem(
    courseId: string,
    itemId: string,
    patch: UpdateCourseItemInput,
  ): Promise<CourseItem> {
    return this.call(async () =>
      toCourseItem(
        (await this.http.patch(
          LMS_EP.item(courseId, itemId),
          patch,
        )) as unknown as CourseItemResponseDto,
      ),
    );
  }

  /** PUT — the body IS the complete ordering (`{ itemIds }`); BE renumbers
   *  densely from 0 and rejects a partial list with `LMS_ITEM_NOT_FOUND`. */
  async reorderItems(
    courseId: string,
    itemIds: string[],
  ): Promise<CourseItem[]> {
    return this.call(async () => {
      const rows = (await this.http.put(LMS_EP.itemsOrder(courseId), {
        itemIds,
      })) as unknown as CourseItemResponseDto[];
      return rows.map(toCourseItem);
    });
  }

  /** POST, no body — the transition is the whole request. Returns the course
   *  in its new state, so the banner never needs a second read. */
  async publishCourse(courseId: string): Promise<Course> {
    return this.call(async () =>
      toCourse(
        (await this.http.post(
          LMS_EP.publishCourse(courseId),
        )) as unknown as CourseResponseDto,
      ),
    );
  }

  /** 204, no body — nothing to map, and nothing to return but the absence. */
  async deleteItem(courseId: string, itemId: string): Promise<void> {
    return this.call(async () => {
      await this.http.delete(LMS_EP.item(courseId, itemId));
    });
  }
}
