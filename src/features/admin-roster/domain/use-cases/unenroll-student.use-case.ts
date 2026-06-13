import type {
  IRosterRepository,
  VoidResult,
} from "../repositories/i-roster.repository";

export function unenrollStudent(
  repo: IRosterRepository,
  classId: string,
  studentId: string,
): Promise<VoidResult> {
  return repo.unenrollStudent(classId, studentId);
}
