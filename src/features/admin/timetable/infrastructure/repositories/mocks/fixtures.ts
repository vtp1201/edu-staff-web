import "server-only";
import type { TimetableSlot } from "../../../domain/entities/timetable-slot.entity";

/**
 * In-memory seed for the mock timetable repository (mock-first, decision 0014).
 * Ported verbatim from `design_src/edu/timetable.jsx` TT_SEED — NOT imported
 * from design_src (which is a non-built pixel reference). Mock seed data is data,
 * not UI copy, so it is intentionally not in i18n.
 *
 * Three teacher conflicts are deliberately planted (exercises the conflict UI):
 *   • tch-1 (Hương) at Mon(0)-period1 in BOTH cls-10a1 and cls-10a2
 *   • tch-2 (Minh)  at Tue(1)-period3 in BOTH cls-10a1 and cls-11b2
 *   • tch-5 (Mai)   at Wed(2)-period4 in BOTH cls-10a1 and cls-11b2
 */
type SeedTuple = [
  classId: string,
  day: number,
  period: number,
  subjectId: string,
  teacherId: string,
  room: string,
];

const SEED_TUPLES: SeedTuple[] = [
  // ── 10A1 — fairly complete week ──
  ["cls-10a1", 0, 1, "sub-math", "tch-1", "P.201"],
  ["cls-10a1", 0, 2, "sub-math", "tch-1", "P.201"],
  ["cls-10a1", 0, 3, "sub-lit", "tch-4", "P.201"],
  ["cls-10a1", 0, 4, "sub-eng", "tch-5", "P.201"],
  ["cls-10a1", 0, 5, "sub-phys", "tch-2", "P.LAB1"],
  ["cls-10a1", 0, 7, "sub-pe", "tch-10", "Sân TD"],
  ["cls-10a1", 0, 8, "sub-pe", "tch-10", "Sân TD"],
  ["cls-10a1", 1, 1, "sub-eng", "tch-5", "P.201"],
  ["cls-10a1", 1, 2, "sub-lit", "tch-4", "P.201"],
  ["cls-10a1", 1, 3, "sub-phys", "tch-2", "P.LAB1"],
  ["cls-10a1", 1, 4, "sub-chem", "tch-3", "P.LAB2"],
  ["cls-10a1", 1, 5, "sub-math", "tch-1", "P.201"],
  ["cls-10a1", 1, 7, "sub-hist", "tch-6", "P.201"],
  ["cls-10a1", 2, 1, "sub-math", "tch-1", "P.201"],
  ["cls-10a1", 2, 2, "sub-bio", "tch-7", "P.LAB3"],
  ["cls-10a1", 2, 3, "sub-geo", "tch-8", "P.201"],
  ["cls-10a1", 2, 4, "sub-eng", "tch-5", "P.201"],
  ["cls-10a1", 2, 5, "sub-lit", "tch-4", "P.201"],
  ["cls-10a1", 3, 1, "sub-chem", "tch-3", "P.LAB2"],
  ["cls-10a1", 3, 2, "sub-chem", "tch-3", "P.LAB2"],
  ["cls-10a1", 3, 3, "sub-math", "tch-1", "P.201"],
  ["cls-10a1", 3, 4, "sub-civic", "tch-9", "P.201"],
  ["cls-10a1", 3, 7, "sub-hist", "tch-6", "P.201"],
  ["cls-10a1", 3, 8, "sub-geo", "tch-8", "P.201"],
  ["cls-10a1", 4, 1, "sub-lit", "tch-4", "P.201"],
  ["cls-10a1", 4, 2, "sub-eng", "tch-5", "P.201"],
  ["cls-10a1", 4, 3, "sub-bio", "tch-7", "P.LAB3"],
  ["cls-10a1", 4, 4, "sub-math", "tch-1", "P.201"],
  ["cls-10a1", 4, 5, "sub-phys", "tch-2", "P.LAB1"],
  ["cls-10a1", 5, 1, "sub-civic", "tch-9", "P.201"],
  ["cls-10a1", 5, 2, "sub-pe", "tch-10", "Sân TD"],
  // ── 10A2 — partial; planted collisions ──
  ["cls-10a2", 0, 1, "sub-math", "tch-1", "P.202"], // conflict with 10a1 (tch-1)
  ["cls-10a2", 0, 2, "sub-lit", "tch-4", "P.202"],
  ["cls-10a2", 0, 3, "sub-eng", "tch-5", "P.202"],
  ["cls-10a2", 2, 1, "sub-hist", "tch-6", "P.202"],
  // ── 11B2 — partial; further collisions ──
  ["cls-11b2", 1, 3, "sub-phys", "tch-2", "P.301"], // conflict with 10a1 (tch-2)
  ["cls-11b2", 2, 4, "sub-eng", "tch-5", "P.301"], // conflict with 10a1 (tch-5)
  ["cls-11b2", 0, 4, "sub-math", "tch-1", "P.301"],
  // ── 12C1, 11A1 — sparse seed ──
  ["cls-12c1", 0, 1, "sub-chem", "tch-3", "P.401"],
  ["cls-12c1", 0, 2, "sub-math", "tch-11", "P.401"],
  ["cls-11a1", 2, 5, "sub-bio", "tch-7", "P.LAB3"],
];

export function buildSeedSlots(): Record<string, TimetableSlot> {
  const out: Record<string, TimetableSlot> = {};
  for (const [
    classId,
    day,
    period,
    subjectId,
    teacherId,
    room,
  ] of SEED_TUPLES) {
    const slotKey = `${classId}|${day}|${period}`;
    out[slotKey] = {
      slotKey,
      classId,
      day,
      period,
      subjectId,
      teacherId,
      room,
    };
  }
  return out;
}
