import { dayEnumToIndex, dayIndexToEnum } from "../../domain/day-enum";
import type { TimetableData } from "../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import type {
  SlotRequestDto,
  SlotResponseDto,
  TimetableResponseDto,
} from "../dtos/timetable-slot-response.dto";

const slotKeyOf = (classId: string, day: number, period: number) =>
  `${classId}|${day}|${period}`;

/**
 * Wire ↔ domain mappers for the real `core` timetable contract.
 *
 * `room` is client-side-only: it has NO representation on the wire
 * (`SlotRequest`/`SlotResponse` carry no room field — cross-repo ask #17), so it
 * maps IN as `""` and is dropped on the way OUT. It survives within a single
 * editing session (the UI keeps it) but is not persisted in real mode — same
 * precedent as US-E18.7's non-persistent `count` field.
 *
 * The wire `teacherMemberId` is the domain's `teacherId`; `day` (enum) is joined
 * to the 0-indexed domain day; `slotKey` is synthesised (`classId|day|period`).
 */
export const TimetableSlotMapper = {
  toEntity(dto: SlotResponseDto, classId: string): TimetableSlot {
    const day = dayEnumToIndex(dto.day);
    return {
      slotKey: slotKeyOf(classId, day, dto.period),
      classId,
      day,
      period: dto.period,
      subjectId: dto.subjectId,
      teacherId: dto.teacherMemberId,
      room: "", // non-persistent — no wire field (ask #17)
    };
  },

  toRequest(slot: TimetableSlot): SlotRequestDto {
    return {
      day: dayIndexToEnum(slot.day), // throws for Sat (index 5) — no wire enum
      period: slot.period,
      subjectId: slot.subjectId,
      teacherMemberId: slot.teacherId,
    };
  },
};

export const TimetableMapper = {
  /**
   * Assemble the domain {@link TimetableData} from a wire {@link
   * TimetableResponseDto}. `conflicts` is always empty in real mode: the wire
   * carries no proactive whole-school conflict set (only reactive per-slot 409s
   * on write — cross-repo ask #16). `yearId` holds the wire `termId` (the entity
   * field predates the term concept; downstream the VM builder ignores it and
   * uses its own selection).
   */
  toEntity(dto: TimetableResponseDto): TimetableData {
    const slots: Record<string, TimetableSlot> = {};
    for (const slotDto of dto.slots) {
      const slot = TimetableSlotMapper.toEntity(slotDto, dto.classId);
      slots[slot.slotKey] = slot;
    }
    return {
      classId: dto.classId,
      yearId: dto.termId,
      slots,
      conflicts: [],
    };
  },
};
