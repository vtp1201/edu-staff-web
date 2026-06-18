import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesRepository } from "../repositories/i-grades.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

export class PublishGradesUseCase {
  constructor(private readonly repo: IGradesRepository) {}

  async execute(
    csId: string,
    term: string,
  ): Promise<{ ok: true } | GradesFailure> {
    try {
      await this.repo.publishGrades(csId, term);
      return { ok: true };
    } catch (err) {
      return toFailure(err);
    }
  }
}
