/**
 * Academic-records endpoint constants (`core` service).
 * No magic strings in repositories.
 *
 * SEVEN constants are REACHABLE: `memberRecords` (US-E18.54 — the viewer read),
 * `sealBatch` (US-E18.13) plus `sealStatus`, `unsealRequests` (POST create +
 * GET list, same path) and `unsealApprove` (US-E18.24, after BE US-150 shipped
 * the listing endpoint ADR `0055` said was missing), and `sealedStudents`
 * (US-E18.43, BE US-183). The remaining two constants stay **permanently
 * unreachable dead constants**: `availableClasses` and `sealAuditTrail` have no
 * BE endpoint at all, so the hybrid facade routes them to the mock. They are
 * kept accurate-as-documentation only (same convention as
 * `staff-leave.endpoint.ts`).
 */
export const ACADEMIC_RECORDS_EP = {
  /**
   * US-E18.54 — REAL per-student read-everything (`ListStudentAcademicRecords`,
   * BE US-064). Returns `{studentMemberId, records: AcademicRecordResponse[]}`
   * for EVERY `(classId, termId)` the member holds. UNPAGINATED — plain
   * unwrapped GET, no `raw: true`.
   *
   * RBAC (`ListStudentAcademicRecordsUseCase`): ADMIN/MANAGER/SUPER_ADMIN any
   * student, STUDENT self only, PARENT linked child only. **TEACHER is NOT in
   * the allow-list** (`default: forbidden`) — the teacher route degrades to the
   * `forbidden` state in real mode; see cross-repo ask #48.
   *
   * The two pre-remodel constants (`record`, `years`) modelled a
   * `(studentId, yearId?)` contract that never existed on any server and are
   * DELETED, not kept as documentation.
   */
  memberRecords: (memberId: string) =>
    `/core/api/v1/members/${encodeURIComponent(memberId)}/academic-records`,
  // US-E18.13 — REAL batch-seal (core, ground-truthed openapi.yaml AcademicRecords
  // tag). Bare POST, no body: server derives the actor from the Bearer token and
  // performs the "all grades locked" check server-side (ADR 0055).
  sealBatch: (classId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/terms/${termId}/academic-records/seal`,
  // US-E18.24 (BE US-150) — REAL class+term seal ROLLUP. `status` here is the
  // class-term rollup enum (PENDING|SEALED|PARTIAL), NOT the per-record enum.
  sealStatus: (classId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/terms/${termId}/academic-records/seal-status`, // GET
  // US-E18.24 — ONE path, two verbs: POST creates an unseal request (body
  // `{studentMemberId, reason}`), GET lists them (cursor-paginated,
  // `?status=&cursor=&limit=`, status defaults to PENDING server-side).
  unsealRequests: (classId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/terms/${termId}/academic-records/unseal-requests`, // POST | GET
  // US-E18.24 — REAL approve. Bare POST, no body: the server derives the
  // approver from the Bearer token (same precedent as `sealBatch`).
  unsealApprove: (requestId: string) =>
    `/core/api/v1/academic-records/unseal-requests/${requestId}/approve`, // POST
  // US-E18.43 (BE US-183) — REAL per-student companion to `sealStatus`: the
  // currently-SEALED subset of the class roster with the LATEST seal-cycle
  // metadata (`sealedAt`, `sealedBy`, `resealCount`). UNPAGINATED (bounded by the
  // roster), ADMIN/SUPER_ADMIN. Class+term PATH-scoped — there is no tenant-wide
  // sealed-students listing, so the caller must supply the key.
  sealedStudents: (classId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/terms/${termId}/academic-records/sealed-students`, // GET
  // DEAD (permanently mock-first, ADR 0055): no endpoint exists anywhere in
  // `core`'s AcademicRecords tag for these two. The hybrid facade routes them to
  // the mock repo, so nothing below is ever requested. `sealAuditTrail` stays
  // dead even after BE US-183: the record keeps only the LATEST seal cycle plus a
  // reseal counter — `core` has no multi-cycle seal/unseal event log at all (the
  // unseal-REQUEST history is served by `unsealRequests`, already wired).
  availableClasses: () => "/core/api/v1/academic-records/seal-classes", // GET ?term=&year=
  sealAuditTrail: () => "/core/api/v1/academic-records/seal-audit-trail", // GET
} as const;
