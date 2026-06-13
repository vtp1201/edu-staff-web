import type {
  IRosterRepository,
  VoidResult,
} from "../repositories/i-roster.repository";

export function transferStudent(
  repo: IRosterRepository,
  studentId: string,
  fromClassId: string,
  toClassId: string,
): Promise<VoidResult> {
  return repo.transferStudent(studentId, fromClassId, toClassId);
}
