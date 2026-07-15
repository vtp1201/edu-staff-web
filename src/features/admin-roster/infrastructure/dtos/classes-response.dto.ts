/**
 * Real wire shape — `core` `ClassResponse` (US-E18.5, same drift as US-E18.4).
 * `classId` (not `id`), `academicYearLabel` (not `year`). The wire carries NO
 * homeroom field — the homeroom display name is fetched separately via
 * `GET /classes/{classId}/homeroom-teacher` and injected into the mapper as
 * enrichment (mirrors class-management's `ClassEnrichment`, scoped to the one
 * field this entity needs). See `edu-api/services/core/docs/openapi.yaml`
 * (`ClassResponse` schema).
 */
export interface ClassDto {
  classId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
}

export type ClassesResponseDto = ClassDto[];
