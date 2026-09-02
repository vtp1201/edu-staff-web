import type { CourseSummary } from "../entities/course.entity";
import type { ILmsRepository } from "../repositories/i-lms.repository";
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
 * The `/student/courses` read (US-E24.2).
 *
 * `lms` publishes no per-course rollup (FE→BE ask #4), so the "N mục đang mở /
 * sắp đến hạn" figures are composed here: `listCourses` once, then `listItems`
 * for EACH course in parallel. The N+1 is deliberate and temporary — when BE
 * ships the summary the fan-out collapses into a single repository call and
 * nothing above this class changes.
 *
 * Two distinct error levels, on purpose:
 *  - `listCourses` failing ⇒ the whole result is that failure (there is no page
 *    without the list);
 *  - one `listItems` failing ⇒ only that row is marked `itemsFailed`. A single
 *    degraded timeline must never blank out five healthy cards.
 */
export class ListCoursesWithSummaryUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  execute(
    classId: string,
    now: Date,
    subjectId?: string,
  ): Promise<Result<CourseWithSummary[]>> {
    return runCatching(async () => {
      const courses = await this.repo.listCourses(classId, subjectId);

      const settled = await Promise.allSettled(
        courses.map((course) => this.repo.listItems(course.id)),
      );

      return courses.map((course, index) => {
        const outcome = settled[index];
        if (outcome === undefined || outcome.status === "rejected") {
          return { course, summary: null, itemsFailed: true };
        }
        return {
          course,
          summary: summarizeCourse(outcome.value, now),
          itemsFailed: false,
        };
      });
    });
  }
}
