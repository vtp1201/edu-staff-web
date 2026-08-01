import "server-only";
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
} from "../../domain/entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../../domain/repositories/i-academic-records-seal.repository";

/**
 * US-E18.13 + US-E18.24 hybrid facade — wires the FIVE genuinely-real
 * operations (`sealBatch`, plus `getSealStatus`/`getPendingUnsealRequests`/
 * `initiateUnseal`/`confirmUnseal` once BE US-150 shipped the listing endpoint
 * ADR `0055` said was missing) to the real HTTP adapter, while the FOUR
 * permanently-dormant methods (no BE endpoint at all, or — for
 * `listTenantAdmins` — no accurate IAM answer, see the real repo's doc comment)
 * delegate to the in-memory mock. Chosen over a per-method
 * `if (USE_MOCK)` branch inside one class so the real adapter stays a pure,
 * single-purpose HTTP client and the mock stays the single source of truth for
 * every mocked method's state (mirrors how `grades.di.ts` composes a real repo
 * with injected collaborators rather than branching per-method).
 */
export class HybridAcademicRecordsSealRepository
  implements IAcademicRecordsSealRepository
{
  constructor(
    private readonly real: IAcademicRecordsSealRepository,
    private readonly mock: IAcademicRecordsSealRepository,
  ) {}

  // ── REAL (5) ─────────────────────────────────────────────────────────────
  sealBatch(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchResult>> {
    return this.real.sealBatch(key, actorId);
  }

  getSealStatus(key: SealBatchKey): Promise<SealResult<SealStatusRollup>> {
    return this.real.getSealStatus(key);
  }

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
  > {
    return this.real.getPendingUnsealRequests(classId, termId, opts);
  }

  initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealInitiateResult>> {
    return this.real.initiateUnseal(input);
  }

  confirmUnseal(
    requestId: string,
    coSignerId: string | null,
    classId: string,
    termId: string,
  ): Promise<SealResult<UnsealApproveResult>> {
    return this.real.confirmUnseal(requestId, coSignerId, classId, termId);
  }

  // ── MOCK (4 — permanently dormant real BE, ADR 0055) ─────────────────────
  listAvailableClasses(filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>> {
    return this.mock.listAvailableClasses(filter);
  }

  getSealAuditTrail(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealAuditEntry[]>> {
    return this.mock.getSealAuditTrail(filter);
  }

  listSealedStudents(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealedStudentOption[]>> {
    return this.mock.listSealedStudents(filter);
  }

  listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>> {
    return this.mock.listTenantAdmins();
  }
}
