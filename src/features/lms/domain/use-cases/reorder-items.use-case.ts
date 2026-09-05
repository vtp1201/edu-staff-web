import type { CourseItem } from "../entities/course-item.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * Replace a course's whole timeline ordering.
 *
 * `itemIds` MUST name exactly the course's current items, each once — BE
 * rejects an omission, a duplicate or an unknown id with
 * `404 LMS_ITEM_NOT_FOUND` and writes NOTHING. Build it with
 * `buildReorderedItemIds`, never by hand.
 *
 * The response is the reordered timeline, so a caller needs no second read.
 */
export class ReorderItemsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(courseId: string, itemIds: string[]): Promise<Result<CourseItem[]>> {
    return runCatching(() => this.repo.reorderItems(courseId, itemIds));
  }
}
