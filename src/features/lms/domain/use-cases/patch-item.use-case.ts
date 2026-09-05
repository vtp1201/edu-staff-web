import type { CourseItem } from "../entities/course-item.entity";
import type {
  ILmsRepository,
  UpdateCourseItemInput,
} from "../repositories/i-lms.repository";
import { type Result, runCatching } from "./result";

/**
 * Partial update of one timeline row (window, or a DOCUMENT's own fields).
 *
 * The patch is forwarded VERBATIM: `startAt`/`dueAt` are three-state on the
 * wire (omitted = unchanged, explicit `null` = cleared, value = set), so
 * stripping nulls here would silently turn "xoá hạn chót" into a no-op.
 *
 * `state` on the response is BE-recomputed from the new window — the caller
 * renders THAT, never a locally guessed one.
 */
export class PatchItemUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    courseId: string,
    itemId: string,
    patch: UpdateCourseItemInput,
  ): Promise<Result<CourseItem>> {
    return runCatching(() => this.repo.patchItem(courseId, itemId, patch));
  }
}
