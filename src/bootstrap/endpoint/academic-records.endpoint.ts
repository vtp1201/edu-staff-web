export const ACADEMIC_RECORDS_EP = {
  record: (studentId: string) => `/core/api/v1/academic-records/${studentId}`,
  years: (studentId: string) =>
    `/core/api/v1/academic-records/${studentId}/years`,
  // US-E14.6 admin seal / unseal (core US-064 — mock-first until BE ships)
  availableClasses: () => "/core/api/v1/academic-records/seal-classes", // GET ?term=&year=
  sealStatus: () => "/core/api/v1/academic-records/seal-status", // GET ?classId=&term=&year=
  seal: () => "/core/api/v1/academic-records/seal", // POST
  sealedStudents: () => "/core/api/v1/academic-records/sealed-students", // GET
  unsealInitiate: () => "/core/api/v1/academic-records/unseal/initiate", // POST
  unsealConfirm: () => "/core/api/v1/academic-records/unseal/confirm", // POST
  sealAuditTrail: () => "/core/api/v1/academic-records/seal-audit-trail", // GET
  pendingUnsealRequests: () =>
    "/core/api/v1/academic-records/unseal-requests?status=pending", // GET
} as const;
