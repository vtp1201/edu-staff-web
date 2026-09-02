import type { Course } from "../entities/course.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** One course, full shape. Every student-side denial collapses to `not-found`
 *  (existence-oracle rule) — the course id is the secret. */
export class GetCourseUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string): Promise<Result<Course>> {
    return runCatching(() => this.repo.getCourse(courseId));
  }
}
