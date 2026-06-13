import type {
  ConflictInfo,
  TimetableData,
} from "../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import type {
  ConflictInfoDto,
  TimetableResponseDto,
  TimetableSlotDto,
} from "../dtos/timetable-slot-response.dto";

export const TimetableSlotMapper = {
  toEntity(dto: TimetableSlotDto): TimetableSlot {
    return {
      slotKey: dto.slotKey,
      classId: dto.classId,
      day: dto.day,
      period: dto.period,
      subjectId: dto.subjectId,
      teacherId: dto.teacherId,
      room: dto.room,
    };
  },
};

export const ConflictMapper = {
  toEntity(dto: ConflictInfoDto): ConflictInfo {
    return {
      teacherId: dto.teacherId,
      day: dto.day,
      period: dto.period,
      classIds: dto.classIds,
    };
  },
};

export const TimetableMapper = {
  toEntity(dto: TimetableResponseDto): TimetableData {
    const slots: Record<string, TimetableSlot> = {};
    for (const slotDto of dto.slots) {
      const slot = TimetableSlotMapper.toEntity(slotDto);
      slots[slot.slotKey] = slot;
    }
    return {
      classId: dto.classId,
      yearId: dto.yearId,
      slots,
      conflicts: dto.conflicts.map(ConflictMapper.toEntity),
    };
  },
};
