/**
 * Per-link notification-consent detail (US-E20.1, INT-004). The 3 category
 * booleans that aggregate into a link's `consentStatus`. Read-only on this
 * admin screen (FR-012); the parent edits the same record in US-E20.2.
 */
export interface ParentStudentConsent {
  studentId: string;
  parentId: string;
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}
