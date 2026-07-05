import type { SealBatchKey } from "../../domain/entities/seal-batch.entity";

/** Query-key factory (matches announcementKeys/notificationKeys convention).
 * Root `["academic-records","seal"]` is a distinct sub-namespace — safe to
 * invalidate broadly via the prefix. */
export const academicRecordSealKeys = {
  all: ["academic-records", "seal"] as const,

  sealStatus: (key: SealBatchKey) =>
    [
      "academic-records",
      "seal",
      "status",
      key.classId,
      key.term,
      key.year,
    ] as const,

  availableClasses: (term: string, year: string) =>
    ["academic-records", "seal", "classes", term, year] as const,

  auditTrail: () => ["academic-records", "seal", "audit-trail", "all"] as const,

  sealedStudents: () =>
    ["academic-records", "seal", "sealed-students", "all"] as const,

  pendingUnsealRequests: () =>
    ["academic-records", "seal", "unseal-requests", "pending"] as const,

  tenantAdmins: () => ["academic-records", "seal", "tenant-admins"] as const,
} as const;
