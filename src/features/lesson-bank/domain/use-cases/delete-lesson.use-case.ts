import type { LessonBankFailure } from "../failures/lesson-bank.failure";
import type { ILessonBankRepository } from "../repositories/i-lesson-bank.repository";

export class DeleteLessonUseCase {
  constructor(private readonly repo: ILessonBankRepository) {}

  async execute(
    id: string,
  ): Promise<{ ok: true } | { ok: false; failure: LessonBankFailure }> {
    if (!id?.trim()) {
      return { ok: false, failure: { type: "not-found" } };
    }
    try {
      await this.repo.deleteLesson(id);
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "not-found")
        return { ok: false, failure: { type: "not-found" } };
      if (msg === "forbidden")
        return { ok: false, failure: { type: "forbidden" } };
      return { ok: false, failure: { type: "unknown", message: msg } };
    }
  }
}
