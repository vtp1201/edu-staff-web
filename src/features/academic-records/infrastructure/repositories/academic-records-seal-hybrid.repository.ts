import "server-only";
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
} from "../../domain/entities/seal-batch.entity";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../../domain/repositories/i-academic-records-seal.repository";

/**
 * US-E18.13 (ADR 0055) hybrid facade — wires the ONE genuinely-real operation
 * (`sealBatch`, `POST .../academic-records/seal`) to the real HTTP adapter while
 * every permanently-dormant method (no BE listing/discovery endpoint exists —
 * cross-repo ask #21) delegates to the in-memory mock. Chosen over a per-method
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

  // ── REAL ─────────────────────────────────────────────────────────────────
  sealBatch(
    key: SealBatchKey,
    actorId: string,
  ): Promise<SealResult<SealBatchResult>> {
    return this.real.sealBatch(key, actorId);
  }

  // ── MOCK (permanently dormant real BE — ADR 0055) ──────────────────────────
  listAvailableClasses(filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>> {
    return this.mock.listAvailableClasses(filter);
  }

  getSealStatus(key: SealBatchKey): Promise<SealResult<SealBatchStatus>> {
    return this.mock.getSealStatus(key);
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

  getPendingUnsealRequests(): Promise<SealResult<UnsealRequest[]>> {
    return this.mock.getPendingUnsealRequests();
  }

  initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealRequest>> {
    return this.mock.initiateUnseal(input);
  }

  confirmUnseal(
    requestId: string,
    coSignerId: string | null,
  ): Promise<SealResult<{ request: UnsealRequest; fallback: boolean }>> {
    return this.mock.confirmUnseal(requestId, coSignerId);
  }

  listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>> {
    return this.mock.listTenantAdmins();
  }
}
