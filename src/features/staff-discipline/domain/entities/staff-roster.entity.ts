/**
 * Fixed staff-roster entry (`SD_STAFF_ROSTER` shape). Domain-typed so
 * presentation can consume the type without importing infrastructure.
 * There is deliberately NO roster-search operation anywhere in this feature
 * (FR-013 explicit exclusion — the list is static and passed once).
 */
export interface StaffRosterEntry {
  staffMemberId: string;
  staffName: string;
  department: string;
  /** 2-letter initials for the avatar (display-only mock data). */
  initials: string;
}
