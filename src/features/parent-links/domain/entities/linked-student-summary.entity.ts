/**
 * A student linked to the authenticated parent's account (US-E20.2, INT-001).
 * Identity + the underlying parent-student-links row id (`linkId`). Scoped
 * server-side to the parent's own memberId — never a client-supplied id
 * (FR-004/NFR-007). Shares field names with US-E20.1's link entity to avoid
 * drift if a shared `core` service eventually backs both.
 */
export interface LinkedStudentSummary {
  studentId: string;
  fullName: string;
  avatarUrl?: string;
  linkId: string;
}
