import type { TimetableData } from "../entities/timetable.entity";
import type { ITimetableRepository } from "../repositories/i-timetable.repository";

export class GetTimetableUseCase {
  constructor(private readonly repo: ITimetableRepository) {}

  /** Fetch the timetable (slots + school-wide conflicts) for a class+year. */
  async execute(classId: string, yearId: string): Promise<TimetableData> {
    return this.repo.getTimetable(classId, yearId);
  }
}
