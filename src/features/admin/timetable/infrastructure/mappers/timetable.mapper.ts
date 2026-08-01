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
 * `room` NOW PERSISTS (US-E18.26, BE US-153 resolved cross-repo ask #17): it is
 * carried in both directions. On the way IN an omitted wire value becomes `""`
 * (the entity's non-optional convention); on the way OUT an empty string is
 * omitted rather than sent, per the BE contract's "omit or send empty" note.
 * The BE trims + caps it at 32 chars and echoes it back UNSANITIZED — safe
 * here because every render path is plain JSX text interpolation, which
 * HTML-escapes by default (no `dangerouslySetInnerHTML` anywhere on the
 * timetable surfaces — verified US-E18.26).
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
      room: dto.room ?? "", // persisted since BE US-153 (ask #17 resolved)
    };
  },

  toRequest(slot: TimetableSlot): SlotRequestDto {
    return {
      day: dayIndexToEnum(slot.day), // throws for Sat (index 5) — no wire enum
      period: slot.period,
      subjectId: slot.subjectId,
      teacherMemberId: slot.teacherId,
      // Omit rather than send "" for an unset room (BE contract, US-153).
      room: slot.room || undefined,
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
