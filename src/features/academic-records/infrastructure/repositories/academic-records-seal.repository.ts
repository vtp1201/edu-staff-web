import "server-only";
import type { AxiosInstance } from "axios";
import { ACADEMIC_RECORDS_EP } from "@/bootstrap/endpoint/academic-records.endpoint";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
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
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../../domain/repositories/i-academic-records-seal.repository";
import type { SealAcademicRecordResponseDto } from "../dtos/seal-response.dto";
import { sealBatchResultMapper } from "../mappers/seal-batch.mapper";

/**
 * Maps a normalised {@link ApiError} → seal failure union (US-E18.13, ADR 0055).
 * Ground-truthed `AcademicRecords` error codes (`pkg/kit/response/error.go`
 * `codeFromKey`, UPPER_SNAKE). Branch on `code`, never message.
 */
function toSealFailure(err: unknown): AcademicRecordsFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;
  if (code === "ACADEMIC_RECORD_FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }
  if (code === "ACADEMIC_RECORD_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST") {
    return { type: "unlocked-grades-exist" };
  }
  if (code === "ACADEMIC_RECORD_TOO_MANY_RESEALS") {
    return { type: "too-many-reseals" };
  }
  if (code === "NETWORK_ERROR" || status >= 500) {
    return { type: "network-error" };
  }
  return { type: "unknown" };
}

/**
 * Real HTTP repository for the seal/unseal surface.
 *
 * US-E18.13 (ADR 0055): ONLY `sealBatch` is wired real (bare `POST` to the
 * class/term seal path, no request body — the server derives the actor from the
 * Bearer token and runs the "all grades locked" check server-side). Every other
 * method is PERMANENTLY dormant (`notImplemented`) — there is no BE listing/
 * discovery endpoint for the unseal workflow, and no year-grouped viewer shape
 * (see ADR 0055 + cross-repo ask #21). They are never invoked on the real
 * branch: the DI factory composes this class behind
 * `HybridAcademicRecordsSealRepository`, which routes every non-`sealBatch`
 * call to the mock repo. Kept here so the class satisfies the interface and the
 * real seal path is exercised in isolation.
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

  async sealBatch(
    key: SealBatchKey,
    _actorId: string,
  ): Promise<SealResult<SealBatchResult>> {
    try {
      // Bare POST, no body: `_actorId` stays in the domain signature (the mock
      // repo needs it) but the server derives the actor from the Bearer token.
      //
      // NOTE: `SealBatchKey.term` is 'HK1'/'HK2' (a label), NOT a real termId
      // (UUID). The class/term selector feeding this key is itself mock-sourced
      // (ADR 0055), so a real seal isn't meaningfully reachable end-to-end until
      // that selector is wired to the real calendar/term feature. Do NOT assume
      // `key.term` is a valid termId once the selector changes.
      const dto = (await this.http.post(
        ACADEMIC_RECORDS_EP.sealBatch(key.classId, key.term),
      )) as unknown as SealAcademicRecordResponseDto;
      return { ok: true, data: sealBatchResultMapper(dto) };
    } catch (err) {
      return { ok: false, error: toSealFailure(err) };
    }
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
