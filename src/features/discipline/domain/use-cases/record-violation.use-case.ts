import type {
  RecordViolationInput,
  ViolationEntity,
  ViolationSeverity,
} from "../entities/violation.entity";
import type { DisciplineFailure } from "../failures/discipline.failure";
import type { IDisciplineRepository } from "../repositories/i-discipline.repository";

const VALID_SEVERITIES: ReadonlySet<ViolationSeverity> = new Set([
  "low",
  "medium",
  "high",
]);

function fail(type: DisciplineFailure["type"]): never {
  const failure: DisciplineFailure = { type };
  throw failure;
}

export class RecordViolationUseCase {
  constructor(private readonly repo: IDisciplineRepository) {}

  async execute(input: RecordViolationInput): Promise<ViolationEntity> {
    if (!input.studentName.trim()) fail("missing-student");
    if (!input.description.trim()) fail("missing-description");
    if (!VALID_SEVERITIES.has(input.severity)) fail("invalid-severity");
    return this.repo.recordViolation(input);
  }
}
