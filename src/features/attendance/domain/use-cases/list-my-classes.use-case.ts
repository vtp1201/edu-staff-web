import type {
  ClassSummary,
  IAttendanceRepository,
} from "../repositories/i-attendance.repository";

export class ListMyClassesUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(): Promise<ClassSummary[]> {
    return this.repo.listMyClasses();
  }
}
