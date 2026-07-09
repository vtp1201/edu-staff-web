import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type { TimetableChild } from "../../../domain/entities/timetable-child.entity";
import type { WeeklyTimetable } from "../../../domain/entities/weekly-timetable.entity";
import type { IWeeklyTimetableRepository } from "../../../domain/repositories/i-weekly-timetable.repository";
import { mapTimetableChild } from "../../mappers/timetable-child.mapper";
import { mapWeeklyTimetable } from "../../mappers/weekly-timetable.mapper";
import { MY_CLASS_ID, TIMETABLE_CHILDREN, timetableDtoFor } from "./fixtures";

/**
 * Mock-first repository (decision 0014) — `core` service not shipped. Seeds
 * `11A2` (full week) + `8B1` (sparse); any other classId → `not-found`
 * (the empty-state trigger). Maps DTO seed → entity via the real mappers so the
 * color-token resolution stays exercised end-to-end.
 */
export class MockWeeklyTimetableRepository
  implements IWeeklyTimetableRepository
{
  async getByClass(classId: string): Promise<WeeklyTimetable> {
    await mockDelay();
    const dto = timetableDtoFor(classId);
    if (!dto) throw { type: "not-found" };
    return mapWeeklyTimetable(dto);
  }

  async getMyTimetable(): Promise<WeeklyTimetable> {
    return this.getByClass(MY_CLASS_ID);
  }

  async getChildren(): Promise<TimetableChild[]> {
    await mockDelay();
    return TIMETABLE_CHILDREN.map(mapTimetableChild);
  }
}
