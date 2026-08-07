import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  TimetableConflictScan,
  TimetableData,
} from "../../../domain/entities/timetable.entity";
import type { TimetableSlot } from "../../../domain/entities/timetable-slot.entity";
import type {
  ITimetableRepository,
  UpdateSlotInput,
} from "../../../domain/repositories/i-timetable.repository";
import { detectConflicts } from "../../../domain/use-cases/detect-conflicts.use-case";
import { buildSeedSlots, MOCK_CONFLICT_CAP, MOCK_TERM_ID } from "./fixtures";

const slotKeyOf = (classId: string, day: number, period: number) =>
  `${classId}|${day}|${period}`;

// Module-level mutable state so mutations survive within a server process.
let slots: Record<string, TimetableSlot> = buildSeedSlots();

/**
 * In-memory timetable repository (mock-first, decision 0014). Holds the whole
 * school's slots so cross-class conflicts are detectable. `getTimetable` returns
 * only the requested class's slots; the school-wide conflict set is its own
 * read (`getConflicts`), mirroring the real contract's two endpoints.
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
    return { classId, yearId, slots: classSlots };
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

  /**
   * Whole-school scan over the in-memory school (BE US-188 parity). Recomputes
   * from the CURRENT slot map every call — never a cached list — so an edit made
   * in the builder immediately changes the scan, exactly like the real endpoint
   * which recomputes from base timetable data rather than a clone.
   *
   * The cap reproduces the real bounded scan: when the full conflict set exceeds
   * {@link MOCK_CONFLICT_CAP} the extras are dropped and `truncated` is set — a
   * hint, not an error.
   */
  async getConflicts(): Promise<TimetableConflictScan> {
    await mockDelay(150);
    const all = detectConflicts(slots);
    return {
      termId: MOCK_TERM_ID,
      conflicts: all.slice(0, MOCK_CONFLICT_CAP),
      truncated: all.length > MOCK_CONFLICT_CAP,
    };
  }
}
