import type {
  CourseLessonsData,
  ILmsRepository,
} from "../repositories/i-lms.repository";
import { fail, ok, type Result } from "./result";

/**
 * Loads the chapter/lesson hierarchy for a course. An existing course with no
 * uploaded content resolves to a success with empty chapters (designed empty
 * state); a truly unknown course id maps to `not-found` → the page 404s.
 */
export class GetCourseLessonsUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  async execute(courseId: string): Promise<Result<CourseLessonsData>> {
    try {
      return ok(await this.repo.getCourseLessons(courseId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "not-found") return fail({ type: "not-found" });
      return fail({ type: "unknown" });
    }
  }
}
