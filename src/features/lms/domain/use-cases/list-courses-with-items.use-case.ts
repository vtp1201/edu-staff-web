import type { ILmsRepository } from "../repositories/i-lms.repository";
import {
  type CourseTimeline,
  fetchCourseTimelines,
} from "./fetch-course-timelines";
import { type Result, runCatching } from "./result";

/**
 * The `/student/courses?view=assignment|exam` read (US-E24.4).
 *
 * Same class fan-out as the card grid (`fetchCourseTimelines`), but the RAW
 * timelines are what the cross-subject filter needs: it groups items by state
 * across courses, which a per-course summary has already thrown away.
 */
export class ListCoursesWithItemsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    classId: string,
    subjectId?: string,
  ): Promise<Result<CourseTimeline[]>> {
    return runCatching(() =>
      fetchCourseTimelines(this.repo, classId, subjectId),
    );
  }
}
