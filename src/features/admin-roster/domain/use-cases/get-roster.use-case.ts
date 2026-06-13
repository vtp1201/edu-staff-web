import type { RosterStudent } from "../entities/roster-student.entity";
import type {
  IRosterRepository,
  Result,
} from "../repositories/i-roster.repository";

export function getRoster(
  repo: IRosterRepository,
  classId: string,
): Promise<Result<RosterStudent[]>> {
  return repo.getClassRoster(classId);
}
