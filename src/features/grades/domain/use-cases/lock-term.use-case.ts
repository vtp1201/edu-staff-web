import type { ClassSubjectTermKey } from "../entities/class-subject-term-key.entity";
import type { GradesFailure } from "../failures/grades.failure";
import type { IGradesTermRepository } from "../repositories/i-grades-term.repository";

function toFailure(err: unknown): GradesFailure {
  if (err && typeof err === "object" && "type" in err) {
    return err as GradesFailure;
  }
  return { type: "network-error" };
}

/**
 * Admin/manager term-lock action (US-E18.12, ADR 0054 §3.2) — irreversible,
 * single confirm action (UI reuses `DestructiveConfirmDialog`). No fan-out:
 * this IS the one genuinely bulk operation on the wire.
 */
export class LockTermUseCase {
  constructor(private readonly repo: IGradesTermRepository) {}

  async execute(
    key: ClassSubjectTermKey,
  ): Promise<{ ok: true; lockedCount: number } | GradesFailure> {
    try {
      const { lockedCount } = await this.repo.lockTerm(key);
      return { ok: true, lockedCount };
    } catch (err) {
      return toFailure(err);
    }
  }
}
