/**
 * Academic-records endpoint constants (`core` service).
 * No magic strings in repositories.
 *
 * FIVE constants are REACHABLE: `sealBatch` (US-E18.13) plus `sealStatus`,
 * `unsealRequests` (POST create + GET list, same path) and `unsealApprove`
 * (US-E18.24, after BE US-150 shipped the listing endpoint ADR `0055` said was
 * missing). The remaining constants stay **permanently unreachable dead
 * constants**: the viewer repository (`academic-records.repository.ts`,
 * US-E18.21 — model mismatch, ADR 0055 §Context point 6) and the four
 * no-BE-endpoint operations (`availableClasses`, `sealedStudents`,
 * `sealAuditTrail`, tenant-admin listing) are force-mocked and never perform an
 * HTTP call. They are kept accurate-as-documentation only (same convention as
 * `staff-leave.endpoint.ts`).
 */
export const ACADEMIC_RECORDS_EP = {
  // DEAD (US-E18.21): never called. Also not the real shape — the real viewer
  // read is `GET /classes/{classId}/terms/{termId}/students/{studentId}/academic-record`
  // (or `GET /members/{memberId}/academic-records`), keyed by class+term, not
  // by `(studentId, yearId?)`. ADR 0055 §Context point 6.
  record: (studentId: string) => `/core/api/v1/academic-records/${studentId}`,
  // DEAD (US-E18.21): never called. No per-student "academic years" endpoint
  // exists on the wire at all — there is no year-grouping concept in `core`.
  years: (studentId: string) =>
    `/core/api/v1/academic-records/${studentId}/years`,
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
  // DEAD (permanently mock-first, ADR 0055): no endpoint exists anywhere in
  // `core`'s AcademicRecords tag for these three. The hybrid facade routes them
  // to the mock repo, so nothing below is ever requested.
  availableClasses: () => "/core/api/v1/academic-records/seal-classes", // GET ?term=&year=
  sealedStudents: () => "/core/api/v1/academic-records/sealed-students", // GET
  sealAuditTrail: () => "/core/api/v1/academic-records/seal-audit-trail", // GET
} as const;
