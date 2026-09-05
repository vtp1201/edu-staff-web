import type { CourseSummary } from "../entities/course.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
import { fetchCourseTimelines } from "./fetch-course-timelines";
import { type Result, runCatching } from "./result";
import { type CourseSummaryStats, summarizeCourse } from "./summarize-course";

/** One course card's data: the list row plus its derived timeline summary. */
export interface CourseWithSummary {
  course: CourseSummary;
  /** `null` ⇔ `itemsFailed` — this course's timeline read failed, so the card
   *  shows "—" instead of a count that would be a lie (a 0 would read as
   *  "nothing to do"). */
  summary: CourseSummaryStats | null;
  itemsFailed: boolean;
}

/**
 * The `/student/courses` card-grid read (US-E24.2).
 *
 * `lms` publishes no per-course rollup (FE→BE ask #4), so the "N mục đang mở /
 * sắp đến hạn" figures are composed from one timeline read PER course. That
 * fan-out — and its two-level degradation rule — lives in
 * `fetchCourseTimelines` (US-E24.4), shared with the cross-subject filter; all
 * this use-case adds is the fold into `summarizeCourse`.
 */
export class ListCoursesWithSummaryUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    classId: string,
    now: Date,
    subjectId?: string,
  ): Promise<Result<CourseWithSummary[]>> {
    return runCatching(async () => {
      const timelines = await fetchCourseTimelines(
        this.repo,
        classId,
        subjectId,
      );

      return timelines.map(({ course, items, itemsFailed }) =>
        itemsFailed
          ? { course, summary: null, itemsFailed: true }
          : {
              course,
              summary: summarizeCourse(items, now),
              itemsFailed: false,
            },
      );
    });
  }
}
