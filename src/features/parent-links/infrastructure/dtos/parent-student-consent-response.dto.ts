/**
 * INT-002 / INT-003 wire shape (camelCase). Per-child consent booleans. The
 * server resolves `parentId` from the session; it is echoed back for the client
 * to reconcile without re-fetching (INT-003 response).
 */
export interface ParentStudentConsentResponseDto {
  studentId: string;
  parentId: string;
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}
