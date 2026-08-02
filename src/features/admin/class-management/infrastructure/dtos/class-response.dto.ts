/**
 * Real wire shape — `core` `ClassResponse` (US-E18.4; enriched US-E18.30).
 * `id`→`classId`, `academicYear`→`academicYearLabel` vs the mock-first guess
 * (US-E06.3).
 *
 * BE US-173 made `studentCount` + `homeroomTeacherId`/`homeroomTeacherName`
 * REQUIRED keys of this schema (always present, `null` = the "none/unknown"
 * value — never an absent key), so the client-side enrichment fan-out is gone.
 * Read the per-endpoint caveats below before trusting the three values.
 */
export interface ClassResponseDto {
  classId: string;
  tenantId: string;
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;

  /**
   * Server-computed enrollment count. Only `GET /classes` and
   * `GET /classes/{classId}` run the enrichment read — `POST`/`PATCH` return
   * `0` by construction, NOT the real count.
   */
  studentCount: number;

  /**
   * Current HOMEROOM assignment's teacher member id, or `null` when no
   * homeroom teacher is assigned. This — not the name — is the AUTHORITATIVE
   * presence signal. `POST`/`PATCH` return `null` unenriched.
   */
  homeroomTeacherId: string | null;

  /**
   * Resolved IAM display name for `homeroomTeacherId`. `null` when there is no
   * homeroom teacher OR when the cross-service name lookup failed/timed out
   * (best-effort, ADR 0124) — the two are indistinguishable on the wire BY
   * DESIGN. Never read a null name as "no teacher assigned" while
   * `homeroomTeacherId` is non-null. `POST`/`PATCH` return `null` unenriched.
   */
  homeroomTeacherName: string | null;
}

export interface CreateClassRequestDto {
  name: string;
  gradeLevel: number;
  academicYearLabel: string;
}

export interface UpdateClassRequestDto {
  name: string;
  gradeLevel: number;
}
