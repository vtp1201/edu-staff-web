/**
 * Real wire shape — `core` `ClassResponse` (US-E18.5, same drift as US-E18.4).
 * `classId` (not `id`), `academicYearLabel` (not `year`).
 *
 * BE US-173 made the homeroom fields REQUIRED keys of this schema (always
 * present, `null` = the "none/unknown" value — never an absent key), so the old
 * per-row `GET /classes/{classId}/homeroom-teacher` fan-out is gone (US-E18.30).
 * See `edu-api/services/core/docs/openapi.yaml` (`ClassResponse` schema).
 *
 * This roster picker only reads the homeroom fields; `studentCount` is on the
 * wire too but the roster screen counts its own loaded rows, so it stays out of
 * this narrow, boundary-scoped DTO.
 */
export interface ClassDto {
  classId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;

  /**
   * Current HOMEROOM assignment's teacher member id, or `null` when no homeroom
   * teacher is assigned. This — not the name — is the AUTHORITATIVE presence
   * signal. Only the enriched read endpoints (`GET /classes`,
   * `GET /classes/{classId}`) populate it.
   */
  homeroomTeacherId: string | null;

  /**
   * Resolved IAM display name for `homeroomTeacherId`. `null` when there is no
   * homeroom teacher OR when the cross-service name lookup failed/timed out
   * (best-effort, ADR 0124) — the two are indistinguishable on the wire BY
   * DESIGN. Never read a null name as "no teacher assigned" while
   * `homeroomTeacherId` is non-null.
   */
  homeroomTeacherName: string | null;
}

export type ClassesResponseDto = ClassDto[];
