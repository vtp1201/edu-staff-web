/**
 * core service — grade-scale & assessment-scheme config endpoints (US-E12.6 / US-059).
 * Mock-first until `core` exists (decision 0014/0017). Routed through Kong
 * gateway (ADR 0030 / US-E06.3): `/core/api/v1/...` → Kong strips `/core`.
 */
export const ASSESSMENT_EP = {
  gradeScale: "/core/api/v1/config/grade-scale",
  subjectsByGrade: (gradeLevel: number) =>
    `/core/api/v1/subjects?gradeLevel=${gradeLevel}&status=ACTIVE`,
  assessmentScheme: (subjectId: string, yearLabel: string) =>
    `/core/api/v1/subjects/${subjectId}/assessment-schemes/${yearLabel}`,
} as const;
