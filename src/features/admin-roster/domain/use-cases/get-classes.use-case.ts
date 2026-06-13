import type { ClassSummary } from "../entities/class-summary.entity";
import type {
  IRosterRepository,
  Result,
} from "../repositories/i-roster.repository";

export function getClasses(
  repo: IRosterRepository,
  params: { academicYear?: string } = {},
): Promise<Result<ClassSummary[]>> {
  return repo.getClasses(params);
}
