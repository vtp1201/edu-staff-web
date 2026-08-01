import type {
  ClassOption,
  InitiateUnsealInput,
  SealAuditEntry,
  SealBatchKey,
  SealBatchResult,
  SealedStudentOption,
  SealStatusRollup,
  TenantAdminSummary,
  Term,
  UnsealApproveResult,
  UnsealInitiateResult,
  UnsealRequestStatus,
  UnsealRequestSummary,
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
  /**
   * US-E18.24 — REAL class+term seal rollup
   * (`GET .../academic-records/seal-status`). Returns the narrow
   * {@link SealStatusRollup}; the mock maps its richer internal
   * `SealBatchStatus` onto this same boundary shape.
   */
  getSealStatus(key: SealBatchKey): Promise<SealResult<SealStatusRollup>>;
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
  /**
   * US-E18.24 — REAL cursor-paginated listing
   * (`GET /classes/{classId}/terms/{termId}/academic-records/unseal-requests`).
   * Class+term-scoped: there is NO tenant-wide unseal listing on the wire.
   * `status` defaults to `"PENDING"` (server-side default, case-insensitive).
   */
  getPendingUnsealRequests(
    classId: string,
    termId: string,
    opts?: {
      status?: UnsealRequestStatus;
      cursor?: string | null;
      limit?: number;
    },
  ): Promise<
    SealResult<{
      items: UnsealRequestSummary[];
      nextCursor: string | null;
      hasMore: boolean;
    }>
  >;
  /** US-E18.24 — REAL `POST .../unseal-requests` (body `{studentMemberId, reason}`). */
  initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealInitiateResult>>;
  /**
   * US-E18.24 — REAL bare `POST /academic-records/unseal-requests/{id}/approve`.
   * `coSignerId` stays a domain-signature parameter (the mock needs it for its
   * audit actor) but is NOT on the wire — the server derives the approver from
   * the Bearer token, same precedent as `sealBatch`. `classId`/`termId` scope
   * the use-case's two-admin pre-check listing, not the approve call itself.
   */
  confirmUnseal(
    requestId: string,
    coSignerId: string | null,
    classId: string,
    termId: string,
  ): Promise<SealResult<UnsealApproveResult>>;
  listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>>;
}
