import type { ConflictInfo } from "../entities/timetable.entity";
import type { TimetableSlot } from "../entities/timetable-slot.entity";

/**
 * Pure teacher-conflict detector. A conflict exists when the same teacher is
 * assigned to ≥2 distinct classes at the same `(day, period)`. The input may
 * span the whole school (multiple classes), since a clash crosses classes.
 *
 * Groups slots by `teacherId|day|period`; any group with ≥2 entries is a
 * conflict listing every class involved. No side effects, no I/O.
 */
export function detectConflicts(
  slots: Record<string, TimetableSlot>,
): ConflictInfo[] {
  const byTeacherSlot = new Map<
    string,
    { teacherId: string; day: number; period: number; classIds: string[] }
  >();

  for (const slot of Object.values(slots)) {
    if (!slot?.teacherId) continue;
    const key = `${slot.teacherId}|${slot.day}|${slot.period}`;
    const group = byTeacherSlot.get(key);
    if (group) {
      if (!group.classIds.includes(slot.classId)) {
        group.classIds.push(slot.classId);
      }
    } else {
      byTeacherSlot.set(key, {
        teacherId: slot.teacherId,
        day: slot.day,
        period: slot.period,
        classIds: [slot.classId],
      });
    }
  }

  const conflicts: ConflictInfo[] = [];
  for (const group of byTeacherSlot.values()) {
    if (group.classIds.length >= 2) {
      conflicts.push(group);
    }
  }
  return conflicts;
}
