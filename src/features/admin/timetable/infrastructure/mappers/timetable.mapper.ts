import { dayEnumToIndex, dayIndexToEnum } from "../../domain/day-enum";
import type {
  ConflictInfo,
  TimetableConflictScan,
  TimetableData,
} from "../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import type {
  ConflictEntryDto,
  TimetableConflictsResponseDto,
} from "../dtos/timetable-conflicts-response.dto";
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
   * TimetableResponseDto}. `yearId` holds the wire `termId` (the entity field
   * predates the term concept; downstream the VM builder ignores it and uses its
   * own selection).
   *
   * Conflicts are NOT part of this read any more (US-E18.48, cross-repo ask #16
   * closed by BE US-188): they come from the whole-school scan below, so this
   * mapper no longer emits a permanently-empty `conflicts` array.
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
    };
  },
};

/**
 * Wire → domain mapper for the whole-school conflicts scan (BE US-188).
 *
 * Two translations matter here:
 * 1. `type` — the UPPER_SNAKE wire enum becomes the STABLE DOMAIN KEY (decision
 *    0008). The raw enum never escapes this file, so presentation can use the
 *    key as an i18n path segment and a new BE kind can be added without a
 *    silent, untranslated badge appearing in the UI.
 * 2. `day` — the `MON…FRI` enum becomes the 0-indexed domain day.
 *
 * The BE returns entries in a deterministic order (type, day, period, key) so
 * repeated scans diff cleanly — this mapper PRESERVES that order and never
 * re-sorts.
 *
 * An entry that cannot be narrowed onto the domain's discriminated union is
 * DROPPED, not coerced: an unknown future `type`, or a kind whose defining field
 * is missing (Go's `omitempty` means an empty `teacherMemberId`/`room` is absent
 * from the JSON entirely). Rendering such an entry would produce a row that
 * names no offending party — worse than omitting it, since the count would still
 * be believable.
 */
export const TimetableConflictsMapper = {
  toEntity(dto: TimetableConflictsResponseDto): TimetableConflictScan {
    const conflicts: ConflictInfo[] = [];
    for (const entry of dto.conflicts) {
      const mapped = toConflict(entry);
      if (mapped) conflicts.push(mapped);
    }
    return {
      termId: dto.termId,
      truncated: dto.truncated,
      conflicts,
    };
  },
};

function toConflict(entry: ConflictEntryDto): ConflictInfo | null {
  const classes = entry.classes.map((c) => ({
    classId: c.classId,
    subjectId: c.subjectId,
  }));
  const day = dayEnumToIndex(entry.day);

  if (entry.type === "TEACHER_DOUBLE_BOOKED") {
    if (!entry.teacherMemberId) return null;
    return {
      type: "teacher-double-booked",
      day,
      period: entry.period,
      classes,
      teacherId: entry.teacherMemberId,
    };
  }
  if (entry.type === "ROOM_DOUBLE_BOOKED") {
    if (!entry.room) return null;
    return {
      type: "room-double-booked",
      day,
      period: entry.period,
      classes,
      room: entry.room,
    };
  }
  return null;
}
