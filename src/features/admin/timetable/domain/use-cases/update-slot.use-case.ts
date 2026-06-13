import type { TimetableSlot } from "../entities/timetable-slot.entity";
import type {
  ITimetableRepository,
  UpdateSlotInput,
} from "../repositories/i-timetable.repository";
import { fail, ok, type Result } from "./result";

interface UpdateSlotArgs {
  classId: string;
  yearId: string;
  day: number;
  period: number;
  data: UpdateSlotInput;
}

export class UpdateSlotUseCase {
  constructor(private readonly repo: ITimetableRepository) {}

  /**
   * Validate that subject + teacher are present (room is optional), then persist
   * the slot. Returns a typed failure rather than throwing on validation.
   */
  async execute(args: UpdateSlotArgs): Promise<Result<TimetableSlot>> {
    const { classId, yearId, day, period, data } = args;
    if (!data.subjectId || !data.teacherId) {
      return fail({
        type: "save-failed",
        message: "subjectId and teacherId are required",
      });
    }
    const slot = await this.repo.updateSlot(classId, yearId, day, period, {
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      room: data.room.trim(),
    });
    return ok(slot);
  }
}
