import type { ConflictInfo, TimetableData } from "../entities/timetable.entity";
import type { TimetableSlot } from "../entities/timetable-slot.entity";

export interface UpdateSlotInput {
  subjectId: string;
  teacherId: string;
  room: string;
}

export interface ITimetableRepository {
  getTimetable(classId: string, yearId: string): Promise<TimetableData>;
  updateSlot(
    classId: string,
    yearId: string,
    day: number,
    period: number,
    data: UpdateSlotInput,
  ): Promise<TimetableSlot>;
  clearSlot(
    classId: string,
    yearId: string,
    day: number,
    period: number,
  ): Promise<void>;
  getConflicts(classId: string, yearId: string): Promise<ConflictInfo[]>;
}
