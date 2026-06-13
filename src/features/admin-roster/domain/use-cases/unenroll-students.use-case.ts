import type {
  IRosterRepository,
  VoidResult,
} from "../repositories/i-roster.repository";

export function unenrollStudents(
  repo: IRosterRepository,
  classId: string,
  studentIds: string[],
): Promise<VoidResult> {
  return repo.unenrollStudents(classId, studentIds);
}
