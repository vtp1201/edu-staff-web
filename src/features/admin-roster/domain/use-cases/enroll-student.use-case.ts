import type { SearchStudent } from "../entities/search-student.entity";
import type {
  IRosterRepository,
  Result,
} from "../repositories/i-roster.repository";

export interface EnrollOutcome {
  /** Non-null when the student was moved from an existing class (a transfer). */
  transferWarning: { fromClassName: string } | null;
}

/**
 * Enroll a candidate into a class. Encodes the core US-043 invariant:
 * a student belongs to at most one class per year, so enrolling a student
 * who already has a `currentClassId` is a transfer (repo.transferStudent),
 * not a plain enroll. The returned outcome surfaces the transfer for the UI.
 */
export async function enrollStudent(
  repo: IRosterRepository,
  toClassId: string,
  student: SearchStudent,
): Promise<Result<EnrollOutcome>> {
  if (student.currentClassId) {
    const res = await repo.transferStudent(
      student.id,
      student.currentClassId,
      toClassId,
    );
    if (!res.ok) return res;
    return {
      ok: true,
      data: {
        transferWarning: {
          fromClassName: student.currentClassName ?? student.currentClassId,
        },
      },
    };
  }

  const res = await repo.enrollStudent(toClassId, student.id);
  if (!res.ok) return res;
  return { ok: true, data: { transferWarning: null } };
}
