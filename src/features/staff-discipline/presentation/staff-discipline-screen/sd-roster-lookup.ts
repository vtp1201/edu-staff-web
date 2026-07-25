import type { StaffRosterEntry } from "../../domain/entities/staff-roster.entity";

/**
 * Presentation-local roster lookup for the avatar/name/department columns.
 *
 * Deliberately NOT imported from `infrastructure/mappers/staff-discipline.mapper`
 * (presentation may not import infrastructure) — the mapper owns the same rule for
 * the server side. Both are trivial, pure, and covered by their own tests.
 */
export function staffOf(
  roster: readonly StaffRosterEntry[],
  staffMemberId: string,
): StaffRosterEntry {
  const hit = roster.find((r) => r.staffMemberId === staffMemberId);
  if (hit) return hit;
  return {
    staffMemberId,
    staffName: staffMemberId,
    department: "",
    initials: staffMemberId.slice(0, 2).toUpperCase(),
  };
}
