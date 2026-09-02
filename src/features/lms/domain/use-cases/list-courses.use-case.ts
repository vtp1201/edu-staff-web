import type { CourseSummary } from "../entities/course.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * Courses of ONE class (BE requires `classId`; a student sees only PUBLISHED).
 * A caller who neither teaches nor is enrolled in the class gets `forbidden`
 * (BE `403 LMS_CLASS_NOT_FOUND`) — never a silently empty list.
 */
export class ListCoursesUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    classId: string,
    subjectId?: string,
  ): Promise<Result<CourseSummary[]>> {
    return runCatching(() => this.repo.listCourses(classId, subjectId));
  }
}
