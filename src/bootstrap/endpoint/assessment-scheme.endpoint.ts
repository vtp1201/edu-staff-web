/**
 * core service — grade-scale & assessment-scheme config endpoints (US-E12.6 / US-059).
 * Real `core` paths ground-truthed against `services/core/docs/openapi.yaml`
 * (US-E18.7, ADR 0053). Routed through Kong gateway (ADR 0030 / US-E06.3):
 * `/core/api/v1/...` → Kong strips `/core`.
 */
export const ASSESSMENT_EP = {
  // Real path — no `/config/` segment (US-E18.7).
  gradeScale: "/core/api/v1/grade-scale",
  // Real path — `GET /subjects` now takes an optional `gradeLevel` (int 1..13)
  // ANDed with `status`, applied BEFORE pagination (BE US-177, US-E18.42). The
  // filters + `cursor` are passed as axios `params` (with `raw: true` as a
  // TOP-LEVEL config sibling) so the repository can drain every page — a grade
  // can hold more subjects than one page. Same endpoint the subject-catalogue
  // feature reads (US-E18.3); this constant stays path-only.
  subjects: "/core/api/v1/subjects",
  // Real path — adds trailing `/terms/{termId}` (US-E18.7).
  assessmentScheme: (subjectId: string, yearLabel: string, termId: string) =>
    `/core/api/v1/subjects/${subjectId}/assessment-schemes/${yearLabel}/terms/${termId}`,
} as const;
