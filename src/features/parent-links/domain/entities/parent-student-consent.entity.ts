/**
 * Per-child notification-consent record the parent reads and toggles
 * (US-E20.2, INT-002/INT-003). Three category booleans. `parentId` is resolved
 * server-side from the authenticated session (mock hardcodes "self") — never a
 * client-supplied id (FR-004/NFR-007). Field-compatible with US-E20.1's
 * `ParentStudentConsent` (independent repository, shared shape).
 */
export interface ParentStudentConsent {
  studentId: string;
  parentId: string;
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}
