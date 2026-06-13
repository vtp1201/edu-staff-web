/**
 * core service — timetable endpoints (mock-first until `core` exists, decision
 * 0014/0017). Routed through Kong gateway (ADR 0030 / US-E06.3): `/core/api/v1/...`
 * → Kong strips `/core` → core receives `/api/v1/...`. Slot id is the canonical
 * `slotKey` (`${classId}|${day}|${period}`).
 */
export const TIMETABLE_EP = {
  timetable: "/core/api/v1/timetable",
  slot: (slotId: string) =>
    `/core/api/v1/timetable/slots/${encodeURIComponent(slotId)}`,
  conflicts: "/core/api/v1/timetable/conflicts",
} as const;
