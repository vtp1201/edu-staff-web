/**
 * Academic-records endpoint constants (`core` service).
 * No magic strings in repositories.
 *
 * Only `sealBatch` is REACHABLE (wired REAL, US-E18.13). **Every other constant
 * below is a permanently unreachable dead constant** — since US-E18.21 both the
 * viewer repository (`academic-records.repository.ts`) and the unseal surface
 * are force-mocked synchronous stubs that never perform an HTTP call, so none
 * of these paths is ever requested. They are kept accurate-as-documentation
 * only (same convention as `staff-leave.endpoint.ts`), NOT re-pointed at the
 * real ground-truthed routes: doing so would dress dead code up as wiring.
 * See ADR `0055` (§Context points 4 + 6) for the two independent blockers —
 * the viewer's model mismatch and the unseal workflow's missing listing/
 * discovery endpoint (cross-repo ask #21).
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
  // US-E14.6 admin seal / unseal — ALL DEAD constants (permanently mock-first:
  // no BE listing/discovery endpoint, ADR 0055 §Context point 4 + ask #21).
  // The hybrid facade routes these operations to the mock repo, so the dormant
  // real branches that reference them are never executed. Two of the real
  // endpoints DO exist (`POST .../unseal-requests` create, `POST
  // /academic-records/unseal-requests/{requestId}/approve`) but stay unwired —
  // a real request nobody could discover is worse than an honest mock.
  availableClasses: () => "/core/api/v1/academic-records/seal-classes", // GET ?term=&year=
  sealStatus: () => "/core/api/v1/academic-records/seal-status", // GET ?classId=&term=&year=
  seal: () => "/core/api/v1/academic-records/seal", // POST (legacy mock-first path)
  sealedStudents: () => "/core/api/v1/academic-records/sealed-students", // GET
  unsealInitiate: () => "/core/api/v1/academic-records/unseal/initiate", // POST
  unsealConfirm: () => "/core/api/v1/academic-records/unseal/confirm", // POST
  sealAuditTrail: () => "/core/api/v1/academic-records/seal-audit-trail", // GET
  pendingUnsealRequests: () =>
    "/core/api/v1/academic-records/unseal-requests?status=pending", // GET
} as const;
