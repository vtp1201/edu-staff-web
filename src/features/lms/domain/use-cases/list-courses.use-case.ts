import type { CourseSummary } from "../entities/course.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";

/** Returns the student's enrolled courses (unfiltered — tabs filter client-side). */
export class ListCoursesUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(studentId: string): Promise<CourseSummary[]> {
    return this.repo.listCourses(studentId);
  }
}
