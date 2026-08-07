import type {
  ConflictClassRef,
  ConflictInfo,
} from "../entities/timetable.entity";
import type { TimetableSlot } from "../entities/timetable-slot.entity";

/**
 * Pure double-booking detector over a whole-school slot set.
 *
 * This is the MOCK repository's conflict engine (`USE_MOCK=true`): it recomputes
 * the same two conflict kinds the real `GET /api/v1/timetable/conflicts` scan
 * reports (BE US-188), from the in-memory seed, so mock mode demos the real
 * surface. It is NOT a client-side helper — nothing in `presentation/` calls it.
 *
 * - `teacher-double-booked` — the same teacher held by ≥2 distinct classes at one
 *   `(day, period)`.
 * - `room-double-booked` — the same NON-EMPTY room held by ≥2 distinct classes at
 *   one `(day, period)`. An empty room is not an occupancy claim, so it is
 *   skipped (BE parity).
 *
 * The two occupancy maps are independent: a slot pair that clashes on teacher
 * AND room yields two entries, exactly as the BE emits them, because the two
 * kinds have different remedies (BE ADR 0128: only the teacher clash is rejected
 * on write).
 *
 * Output is sorted by `(type, day, period, key)` so repeated scans are stable
 * (BE US-188 D5 parity). No side effects, no I/O.
 */
export function detectConflicts(
  slots: Record<string, TimetableSlot>,
): ConflictInfo[] {
  const byTeacher = new Map<string, Occupancy>();
  const byRoom = new Map<string, Occupancy>();

  for (const slot of Object.values(slots)) {
    if (!slot) continue;
    if (slot.teacherId) {
      occupy(byTeacher, slot.teacherId, slot);
    }
    if (slot.room) {
      occupy(byRoom, slot.room, slot);
    }
  }

  const conflicts: ConflictInfo[] = [];
  for (const group of byRoom.values()) {
    if (group.classes.length >= 2) {
      conflicts.push({
        type: "room-double-booked",
        day: group.day,
        period: group.period,
        classes: group.classes,
        room: group.key,
      });
    }
  }
  for (const group of byTeacher.values()) {
    if (group.classes.length >= 2) {
      conflicts.push({
        type: "teacher-double-booked",
        day: group.day,
        period: group.period,
        classes: group.classes,
        teacherId: group.key,
      });
    }
  }

  return conflicts.sort(
    (a, b) =>
      a.type.localeCompare(b.type) ||
      a.day - b.day ||
      a.period - b.period ||
      keyOf(a).localeCompare(keyOf(b)),
  );
}

interface Occupancy {
  key: string;
  day: number;
  period: number;
  classes: ConflictClassRef[];
}

function occupy(
  map: Map<string, Occupancy>,
  key: string,
  slot: TimetableSlot,
): void {
  const mapKey = `${key}|${slot.day}|${slot.period}`;
  const group = map.get(mapKey);
  const ref: ConflictClassRef = {
    classId: slot.classId,
    subjectId: slot.subjectId,
  };
  if (!group) {
    map.set(mapKey, {
      key,
      day: slot.day,
      period: slot.period,
      classes: [ref],
    });
    return;
  }
  // Dedupe by class id — one class can only hold one slot per cell.
  if (!group.classes.some((c) => c.classId === slot.classId)) {
    group.classes.push(ref);
  }
}

const keyOf = (c: ConflictInfo): string =>
  c.type === "teacher-double-booked" ? c.teacherId : c.room;
