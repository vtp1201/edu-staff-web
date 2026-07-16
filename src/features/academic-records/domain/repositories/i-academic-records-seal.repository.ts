import type {
  ClassOption,
  InitiateUnsealInput,
  SealAuditEntry,
  SealBatchKey,
  SealBatchResult,
  SealBatchStatus,
  SealedStudentOption,
  TenantAdminSummary,
  Term,
  UnsealRequest,
} from "../entities/seal-batch.entity";
import type { AcademicRecordsFailure } from "../failures/academic-records.failure";

/** Domain-internal Result — presentation only sees the Server-Action shape. */
export type SealResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AcademicRecordsFailure };

/**
 * US-E14.6 seal/unseal repository — a bounded concern SEPARATE from the
 * student-viewer `IAcademicRecordsRepository`. Keeps the read-only viewer
 * interface uncluttered by the admin bulk-seal + two-admin-unseal surface.
 */
export interface IAcademicRecordsSealRepository {
  listAvailableClasses(filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>>;
  getSealStatus(key: SealBatchKey): Promise<SealResult<SealBatchStatus>>;
  /**
   * Batch-seal a (class, term) — US-E18.13 wired REAL against
   * `POST .../academic-records/seal`. `actorId` is used by the mock repo for
   * its audit-actor lookup; the REAL repository does NOT put it on the wire
   * (server derives the actor from the Bearer token — bare POST, no body).
   */
  sealBatch(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchResult>>;
  getSealAuditTrail(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealAuditEntry[]>>;
  listSealedStudents(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealedStudentOption[]>>;
  getPendingUnsealRequests(): Promise<SealResult<UnsealRequest[]>>;
  initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealRequest>>;
  confirmUnseal(
    requestId: string,
    coSignerId: string | null,
  ): Promise<SealResult<{ request: UnsealRequest; fallback: boolean }>>;
  listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>>;
}
