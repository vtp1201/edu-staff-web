import type { ITimetableRepository } from "../repositories/i-timetable.repository";
import { ok, type Result } from "./result";

export class ClearSlotUseCase {
  constructor(private readonly repo: ITimetableRepository) {}

  /** Remove the slot at (class, day, period). Idempotent at the repo boundary. */
  async execute(
    classId: string,
    yearId: string,
    day: number,
    period: number,
  ): Promise<Result<void>> {
    await this.repo.clearSlot(classId, yearId, day, period);
    return ok(undefined);
  }
}
