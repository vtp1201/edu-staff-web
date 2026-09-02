import type { CourseItem } from "../entities/course-item.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/** The course timeline, in BE order. Already filtered for the caller's role —
 *  the client must NOT re-filter or re-derive `state`. */
export class ListCourseItemsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string): Promise<Result<CourseItem[]>> {
    return runCatching(() => this.repo.listItems(courseId));
  }
}
