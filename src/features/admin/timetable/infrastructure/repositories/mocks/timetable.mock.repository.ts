import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  ConflictInfo,
  TimetableData,
} from "../../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../../domain/entities/timetable-slot.entity";
import type {
  ITimetableRepository,
  UpdateSlotInput,
} from "../../../domain/repositories/i-timetable.repository";
import { detectConflicts } from "../../../domain/use-cases/detect-conflicts.use-case";
import { buildSeedSlots } from "./fixtures";

const slotKeyOf = (classId: string, day: number, period: number) =>
  `${classId}|${day}|${period}`;

// Module-level mutable state so mutations survive within a server process.
let slots: Record<string, TimetableSlot> = buildSeedSlots();

/**
 * In-memory timetable repository (mock-first, decision 0014). Holds the whole
 * school's slots so cross-class teacher conflicts are detectable. `getTimetable`
 * returns the requested class's slots plus the school-wide conflict set.
 */
export class MockTimetableRepository implements ITimetableRepository {
  /** Test-only reset to the planted seed (used by integration tests). */
  static reset(): void {
    slots = buildSeedSlots();
  }

  async getTimetable(classId: string, yearId: string): Promise<TimetableData> {
    await mockDelay(200);
    const classSlots: Record<string, TimetableSlot> = {};
    for (const slot of Object.values(slots)) {
      if (slot.classId === classId) classSlots[slot.slotKey] = { ...slot };
    }
    return {
      classId,
      yearId,
      slots: classSlots,
      conflicts: detectConflicts(slots),
    };
  }

  async updateSlot(
    classId: string,
    _yearId: string,
    day: number,
    period: number,
    data: UpdateSlotInput,
  ): Promise<TimetableSlot> {
    await mockDelay(250);
    const slotKey = slotKeyOf(classId, day, period);
    const slot: TimetableSlot = {
      slotKey,
      classId,
      day,
      period,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      room: data.room,
    };
    slots = { ...slots, [slotKey]: slot };
    return { ...slot };
  }

  async clearSlot(
    classId: string,
    _yearId: string,
    day: number,
    period: number,
  ): Promise<void> {
    await mockDelay(200);
    const slotKey = slotKeyOf(classId, day, period);
    const next = { ...slots };
    delete next[slotKey];
    slots = next;
  }

  async getConflicts(
    _classId: string,
    _yearId: string,
  ): Promise<ConflictInfo[]> {
    await mockDelay(150);
    return detectConflicts(slots);
  }
}
