import "server-only";
import type { AxiosInstance } from "axios";
import type {
  ClassOption,
  InitiateUnsealInput,
  SealAuditEntry,
  SealBatchKey,
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
 * Real HTTP repository for the US-E14.6 seal/unseal surface.
 *
 * SCAFFOLD ONLY (decision 0014 mock-first): BE `core` US-064 has not shipped, so
 * the endpoints do not exist yet. Endpoint constants + DTO/mapper wiring are
 * intentionally documented here for contract-readiness, but every method throws
 * `not-implemented` until US-064 lands. While `NEXT_PUBLIC_USE_MOCK=true` the DI
 * factory selects `MockAcademicRecordsSealRepository`, so this class is unused.
 *
 * When US-064 ships: each method casts the interceptor-unwrapped payload
 * (`(await this.http.get(...)) as unknown as <Dto>`), maps via
 * `seal-batch.mapper.ts`, and normalizes `ApiError.code` → `AcademicRecordsFailure`.
 */
export class AcademicRecordsSealRepository
  implements IAcademicRecordsSealRepository
{
  constructor(private readonly http: AxiosInstance) {}

  private notImplemented(): never {
    throw new Error("not-implemented");
  }

  listAvailableClasses(_filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>> {
    return this.notImplemented();
  }

  getSealStatus(_key: SealBatchKey): Promise<SealResult<SealBatchStatus>> {
    return this.notImplemented();
  }

  sealBatch(
    _key: SealBatchKey,
    _actorId: string,
  ): Promise<SealResult<SealBatchStatus>> {
    return this.notImplemented();
  }

  getSealAuditTrail(
    _filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealAuditEntry[]>> {
    return this.notImplemented();
  }

  listSealedStudents(
    _filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealedStudentOption[]>> {
    return this.notImplemented();
  }

  getPendingUnsealRequests(): Promise<SealResult<UnsealRequest[]>> {
    return this.notImplemented();
  }

  initiateUnseal(
    _input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealRequest>> {
    return this.notImplemented();
  }

  confirmUnseal(
    _requestId: string,
    _coSignerId: string | null,
  ): Promise<SealResult<{ request: UnsealRequest; fallback: boolean }>> {
    return this.notImplemented();
  }

  listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>> {
    return this.notImplemented();
  }
}
