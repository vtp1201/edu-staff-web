import type { Course } from "../entities/course.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * DRAFT → PUBLISHED. TERMINAL: there is no unpublish route, and a second call
 * is `already-published` (`409 LMS_COURSE_INVALID_STATUS_TRANSITION`) rather
 * than a silent success — including the losing side of two concurrent
 * publishes, which is why the caller treats that key as "someone already did
 * it, re-read the course" instead of as a hard error.
 */
export class PublishCourseUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string): Promise<Result<Course>> {
    return runCatching(() => this.repo.publishCourse(courseId));
  }
}
