/** Wire shape for a link's consent detail (US-E20.1, INT-004). camelCase. */
export interface ParentStudentConsentResponseDto {
  studentId: string;
  parentId: string;
  disciplineAlerts: boolean;
  absenceAlerts: boolean;
  gradeAlerts: boolean;
}
