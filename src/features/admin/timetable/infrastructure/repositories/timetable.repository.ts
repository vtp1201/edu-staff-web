import "server-only";
import type { AxiosInstance } from "axios";
import { TIMETABLE_EP } from "@/bootstrap/endpoint/timetable.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
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
  ConflictInfoDto,
  TimetableResponseDto,
  TimetableSlotDto,
} from "../dtos/timetable-slot-response.dto";
import {
  ConflictMapper,
  TimetableMapper,
  TimetableSlotMapper,
} from "../mappers/timetable.mapper";

const slotKeyOf = (classId: string, day: number, period: number) =>
  `${classId}|${day}|${period}`;

/** Map a normalised ApiError (by UPPER_SNAKE `code`) to the timetable failure union. */
function mapTimetableFailure(err: unknown): TimetableFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "TIMETABLE_SLOT_NOT_FOUND":
      return { type: "slot-not-found", message: "Slot not found" };
    case "TIMETABLE_SAVE_FAILED":
      return { type: "save-failed", message: "Failed to save slot" };
    default:
      return { type: "fetch-failed", message: "Failed to load timetable" };
  }
}

/**
 * Real HTTP timetable repository (used when `NEXT_PUBLIC_USE_MOCK !== 'true'`).
 * The `core` service does not exist yet (mock-first); this is the contract-ready
 * stub. The HTTP interceptor unwraps the envelope → repo receives payload directly.
 */
export class TimetableRepository implements ITimetableRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getTimetable(classId: string, yearId: string): Promise<TimetableData> {
    try {
      const dto = (await this.http.get(TIMETABLE_EP.timetable, {
        params: { classId, yearId },
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
      const dto = (await this.http.put(
        TIMETABLE_EP.slot(slotKeyOf(classId, day, period)),
        { classId, day, period, ...data },
      )) as unknown as TimetableSlotDto;
      return TimetableSlotMapper.toEntity(dto);
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
      await this.http.delete(
        TIMETABLE_EP.slot(slotKeyOf(classId, day, period)),
      );
    } catch (err) {
      throw mapTimetableFailure(err);
    }
  }

  async getConflicts(classId: string, yearId: string): Promise<ConflictInfo[]> {
    try {
      const dto = (await this.http.get(TIMETABLE_EP.conflicts, {
        params: { classId, yearId },
      })) as unknown as ConflictInfoDto[];
      return dto.map(ConflictMapper.toEntity);
    } catch (err) {
      throw mapTimetableFailure(err);
    }
  }
}
