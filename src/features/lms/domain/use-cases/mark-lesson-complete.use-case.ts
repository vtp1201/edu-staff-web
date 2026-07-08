import type {
  ILmsRepository,
  MarkCompleteData,
} from "../repositories/i-lms.repository";
import { fail, ok, type Result } from "./result";

/**
 * Marks a lesson complete. Idempotent: re-marking an already-`done` lesson is a
 * no-op success (the repository returns its current state), never a failure.
 * Unknown lesson id → `not-found`.
 */
export class MarkLessonCompleteUseCase {
  constructor(private readonly repo: ILmsRepository) {}

  async execute(lessonId: string): Promise<Result<MarkCompleteData>> {
    try {
      return ok(await this.repo.markLessonComplete(lessonId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "not-found") return fail({ type: "not-found" });
      return fail({ type: "unknown" });
    }
  }
}
