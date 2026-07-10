import "server-only";

import type { AxiosInstance } from "axios";
import { TIMETABLE_VIEW_EP } from "@/bootstrap/endpoint/timetable-view.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { TimetableChild } from "../../domain/entities/timetable-child.entity";
import type { WeeklyTimetable } from "../../domain/entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../../domain/repositories/i-weekly-timetable.repository";
import type {
  TimetableChildDto,
  WeeklyTimetableResponseDto,
} from "../dtos/weekly-timetable-response.dto";
import { mapTimetableChild } from "../mappers/timetable-child.mapper";
import { mapWeeklyTimetable } from "../mappers/weekly-timetable.mapper";

/**
 * Real HTTP implementation — wiring-ready against the documented `core`
 * timetable endpoints. The `core` service is not shipped yet (decision 0014);
 * while NEXT_PUBLIC_USE_MOCK=true the DI factory selects the mock repository, so
 * this is not exercised at runtime today. Kept for contract-readiness.
 * The HTTP interceptor unwraps the envelope → repos receive the payload directly;
 * errors are normalized to `ApiError` and mapped to the failure union by `code`.
 */
export class WeeklyTimetableRepository implements IWeeklyTimetableRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getByClass(
    classId: string,
    weekStart?: string,
  ): Promise<WeeklyTimetable> {
    try {
      const data = (await this.http.get(
        TIMETABLE_VIEW_EP.classTimetable(classId),
        weekStart ? { params: { weekStart } } : undefined,
      )) as unknown as WeeklyTimetableResponseDto;
      return mapWeeklyTimetable(data);
    } catch (err) {
      throw this.toFailure(err);
    }
  }

  async getMyTimetable(weekStart?: string): Promise<WeeklyTimetable> {
    try {
      const data = (await this.http.get(
        TIMETABLE_VIEW_EP.myTimetable,
        weekStart ? { params: { weekStart } } : undefined,
      )) as unknown as WeeklyTimetableResponseDto;
      return mapWeeklyTimetable(data);
    } catch (err) {
      throw this.toFailure(err);
    }
  }

  async getChildren(): Promise<TimetableChild[]> {
    try {
      const data = (await this.http.get(
        TIMETABLE_VIEW_EP.myChildren,
      )) as unknown as TimetableChildDto[];
      return data.map(mapTimetableChild);
    } catch (err) {
      throw this.toFailure(err);
    }
  }

  private toFailure(err: unknown): { type: "not-found" | "network-error" } {
    const code = errorCodeOf(err);
    if (code === "TIMETABLE_NOT_FOUND" || code === "NOT_FOUND") {
      return { type: "not-found" };
    }
    return { type: "network-error" };
  }
}
