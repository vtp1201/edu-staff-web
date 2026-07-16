export const ACADEMIC_RECORDS_EP = {
  record: (studentId: string) => `/core/api/v1/academic-records/${studentId}`,
  years: (studentId: string) =>
    `/core/api/v1/academic-records/${studentId}/years`,
  // US-E18.13 — REAL batch-seal (core, ground-truthed openapi.yaml AcademicRecords
  // tag). Bare POST, no body: server derives the actor from the Bearer token and
  // performs the "all grades locked" check server-side (ADR 0055).
  sealBatch: (classId: string, termId: string) =>
    `/core/api/v1/classes/${classId}/terms/${termId}/academic-records/seal`,
  // US-E14.6 admin seal / unseal (permanently mock-first — no BE listing/discovery
  // endpoints; ADR 0055). Consumed only by the mock repo via the hybrid facade.
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
