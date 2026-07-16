/**
 * core service — grade-scale & assessment-scheme config endpoints (US-E12.6 / US-059).
 * Real `core` paths ground-truthed against `services/core/docs/openapi.yaml`
 * (US-E18.7, ADR 0053). Routed through Kong gateway (ADR 0030 / US-E06.3):
 * `/core/api/v1/...` → Kong strips `/core`.
 */
export const ASSESSMENT_EP = {
  // Real path — no `/config/` segment (US-E18.7).
  gradeScale: "/core/api/v1/grade-scale",
  // UNCHANGED — still mock-first (real GET /subjects has no gradeLevel filter,
  // belongs to US-E18.3 subject-catalogue wiring). Do not real-wire here.
  subjectsByGrade: (gradeLevel: number) =>
    `/core/api/v1/subjects?gradeLevel=${gradeLevel}&status=ACTIVE`,
  // Real path — adds trailing `/terms/{termId}` (US-E18.7).
  assessmentScheme: (subjectId: string, yearLabel: string, termId: string) =>
    `/core/api/v1/subjects/${subjectId}/assessment-schemes/${yearLabel}/terms/${termId}`,
} as const;
