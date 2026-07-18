import type {
  ClassSummary,
  IAttendanceRepository,
} from "../repositories/i-attendance.repository";

export class ListMyHomeroomClassesUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(): Promise<ClassSummary[]> {
    return this.repo.getMyHomeroomClasses();
  }
}
