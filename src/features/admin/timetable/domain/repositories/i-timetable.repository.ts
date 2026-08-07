import type {
  TimetableConflictScan,
  TimetableData,
} from "../entities/timetable.entity";
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
  /**
   * Whole-school, term-scoped double-booking scan (BE US-188).
   *
   * Takes NO class id and NO year: the real endpoint
   * (`GET /api/v1/timetable/conflicts?termId=`) scans the whole tenant, derives
   * the tenant from the verified token claim, and is keyed by `termId` only.
   * The `termId` is resolved INSIDE the implementation (the same shared
   * `resolveCurrentTermId` composition every other real timetable method uses) —
   * no caller in this feature has a term concept to pass down, only the mock
   * `yearId` label the builder's selector shows.
   */
  getConflicts(): Promise<TimetableConflictScan>;
}
