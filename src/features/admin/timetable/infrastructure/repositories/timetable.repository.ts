import "server-only";
import type { AxiosInstance } from "axios";
import { TIMETABLE_EP } from "@/bootstrap/endpoint/timetable.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import { dayIndexToEnum } from "../../domain/day-enum";
import type {
  ConflictInfo,
  TimetableData,
} from "../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../domain/entities/timetable-slot.entity";
import type { TimetableFailure } from "../../domain/failures/timetable.failure";
import type {
  ITimetableRepository,
  UpdateSlotInput,
} from "../../domain/repositories/i-timetable.repository";
import type {
  SetTimetableRequestDto,
  SlotRequestDto,
  TimetableResponseDto,
} from "../dtos/timetable-slot-response.dto";
import {
  TimetableMapper,
  TimetableSlotMapper,
} from "../mappers/timetable.mapper";

/** Resolves the mandatory `termId` from a date (default: today). Injected by DI
 *  from the real `calendar` feature; throws a typed failure when no term
 *  contains the date. */
export type TermIdResolver = (date?: Date) => Promise<string>;

const KNOWN_FAILURE_TYPES = new Set<TimetableFailure["type"]>([
  "invalid-tenant",
  "invalid-class",
  "invalid-term",
  "invalid-member",
  "invalid-subject",
  "invalid-slot",
  "invalid-day",
  "invalid-period",
  "forbidden",
  "slot-not-found",
  "teacher-conflict",
  "save-failed",
  "fetch-failed",
]);

/**
 * Map a normalised ApiError (by UPPER_SNAKE `error.code`) to the timetable
 * failure union. Covers the full 11-code `core` taxonomy
 * (`services/core/docs/ERROR_CODES.md`) — branch on `code`, never on message.
 * A thrown, already-typed `TimetableFailure` (e.g. from the term resolver) is
 * passed through unchanged; a `RangeError` (Saturday has no wire enum) becomes
 * `invalid-day`.
 */
function mapTimetableFailure(err: unknown): TimetableFailure {
  if (
    err &&
    typeof err === "object" &&
    "type" in err &&
    !("code" in err) &&
    typeof (err as { type: unknown }).type === "string" &&
    KNOWN_FAILURE_TYPES.has((err as TimetableFailure).type)
  ) {
    return err as TimetableFailure;
  }
  if (err instanceof RangeError) {
    return { type: "invalid-day", message: "Day is outside the Mon–Fri week" };
  }
  const code = errorCodeOf(err);
  switch (code) {
    case "TIMETABLE_INVALID_TENANT_ID":
      return { type: "invalid-tenant", message: "Invalid tenant" };
    case "TIMETABLE_INVALID_CLASS_ID":
      return { type: "invalid-class", message: "Invalid class" };
    case "TIMETABLE_INVALID_TERM_ID":
      return { type: "invalid-term", message: "Invalid term" };
    case "TIMETABLE_INVALID_MEMBER_ID":
      return { type: "invalid-member", message: "Invalid teacher" };
    case "TIMETABLE_INVALID_SUBJECT_ID":
      return { type: "invalid-subject", message: "Invalid subject" };
    case "TIMETABLE_INVALID_SLOT_ID":
      return { type: "invalid-slot", message: "Invalid slot" };
    case "TIMETABLE_INVALID_DAY":
      return { type: "invalid-day", message: "Invalid day" };
    case "TIMETABLE_INVALID_PERIOD":
      return { type: "invalid-period", message: "Invalid period" };
    case "TIMETABLE_FORBIDDEN":
      return { type: "forbidden", message: "Forbidden" };
    case "TIMETABLE_SLOT_NOT_FOUND":
      return { type: "slot-not-found", message: "Slot not found" };
    case "TIMETABLE_TEACHER_CONFLICT":
      return {
        type: "teacher-conflict",
        message: "Teacher is already booked for this period",
      };
    default:
      return { type: "fetch-failed", message: "Failed to load timetable" };
  }
}

/**
 * Real HTTP timetable builder repository (used when `NEXT_PUBLIC_USE_MOCK !==
 * 'true'`). Wires the class-scoped `core` timetable contract (US-E18.11):
 * - `getTimetable`  → GET `/classes/{classId}/timetable?termId=`.
 * - `updateSlot`    → read-modify-write: GET the full slot list, splice the one
 *   changed cell in, PUT the full `{termId, slots}` body (BE has no per-slot
 *   PUT — only full-replace). A 409 becomes a `teacher-conflict` failure.
 * - `clearSlot`     → DELETE `/classes/{classId}/timetable/slots?termId&day&period`.
 * - `getConflicts`  → `[]` (no whole-school proactive endpoint — ask #16;
 *   conflicts surface reactively as a `teacher-conflict` on `updateSlot`).
 *
 * The HTTP interceptor unwraps the envelope → the repo receives payload directly.
 */
export class TimetableRepository implements ITimetableRepository {
  constructor(
    private readonly http: AxiosInstance,
    private readonly resolveTermId: TermIdResolver,
  ) {}

  async getTimetable(classId: string, _yearId: string): Promise<TimetableData> {
    try {
      const termId = await this.resolveTermId();
      const dto = (await this.http.get(TIMETABLE_EP.timetable(classId), {
        params: { termId },
      })) as unknown as TimetableResponseDto;
      return TimetableMapper.toEntity(dto);
    } catch (err) {
      throw mapTimetableFailure(err);
    }
  }

  async updateSlot(
    classId: string,
    _yearId: string,
    day: number,
    period: number,
    data: UpdateSlotInput,
  ): Promise<TimetableSlot> {
    try {
      const termId = await this.resolveTermId();
      // Read the current full schedule (BE has no per-slot PUT).
      const current = (await this.http.get(TIMETABLE_EP.timetable(classId), {
        params: { termId },
      })) as unknown as TimetableResponseDto;

      const dayEnum = dayIndexToEnum(day); // throws for Sat (index 5)
      // Keep every slot except the (day, period) we are replacing…
      const slots: SlotRequestDto[] = current.slots
        .filter((s) => !(s.day === dayEnum && s.period === period))
        .map((s) => ({
          day: s.day,
          period: s.period,
          subjectId: s.subjectId,
          teacherMemberId: s.teacherMemberId,
        }));
      // …then splice in the changed cell.
      slots.push({
        day: dayEnum,
        period,
        subjectId: data.subjectId,
        teacherMemberId: data.teacherId,
      });

      const body: SetTimetableRequestDto = { termId, slots };
      const saved = (await this.http.put(
        TIMETABLE_EP.timetable(classId),
        body,
      )) as unknown as TimetableResponseDto;

      const savedSlot = saved.slots.find(
        (s) => s.day === dayEnum && s.period === period,
      );
      return savedSlot
        ? TimetableSlotMapper.toEntity(savedSlot, classId)
        : TimetableSlotMapper.toEntity(
            {
              day: dayEnum,
              period,
              subjectId: data.subjectId,
              teacherMemberId: data.teacherId,
            },
            classId,
          );
    } catch (err) {
      throw mapTimetableFailure(err);
    }
  }

  async clearSlot(
    classId: string,
    _yearId: string,
    day: number,
    period: number,
  ): Promise<void> {
    try {
      const termId = await this.resolveTermId();
      const dayEnum = dayIndexToEnum(day); // throws for Sat (index 5)
      await this.http.delete(TIMETABLE_EP.slots(classId), {
        params: { termId, day: dayEnum, period },
      });
    } catch (err) {
      throw mapTimetableFailure(err);
    }
  }

  /**
   * No whole-school proactive conflicts endpoint exists (cross-repo ask #16) —
   * conflicts are only discoverable reactively (a 409 on `updateSlot`). Returns
   * an empty set without touching the network; the proactive conflict summary
   * is a mock-only affordance.
   */
  async getConflicts(
    _classId: string,
    _yearId: string,
  ): Promise<ConflictInfo[]> {
    return [];
  }
}
