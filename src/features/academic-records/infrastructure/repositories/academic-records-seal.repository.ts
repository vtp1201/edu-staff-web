import "server-only";
import type { AxiosInstance } from "axios";
import { ACADEMIC_RECORDS_EP } from "@/bootstrap/endpoint/academic-records.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { MemberSummary } from "@/features/iam-directory/domain/entities/member-summary.entity";
import type { IamDirectoryFailure } from "@/features/iam-directory/domain/failures/iam-directory.failure";
import type { Result } from "@/features/iam-directory/domain/use-cases/result";
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
import type { AcademicRecordsFailure } from "../../domain/failures/academic-records.failure";
import type {
  IAcademicRecordsSealRepository,
  SealResult,
} from "../../domain/repositories/i-academic-records-seal.repository";
import type {
  SealAcademicRecordResponseDto,
  SealedStudentListItemDto,
} from "../dtos/seal-response.dto";
import type {
  ApproveUnsealResponseDto,
  RequestUnsealResponseDto,
  SealStatusResponseDto,
  UnsealRequestListItemDto,
} from "../dtos/unseal-response.dto";
import {
  sealBatchResultMapper,
  sealedStudentMapper,
} from "../mappers/seal-batch.mapper";
import {
  sealStatusRollupMapper,
  unsealApproveResultMapper,
  unsealInitiateResultMapper,
  unsealRequestSummaryMapper,
} from "../mappers/unseal.mapper";

/**
 * Maps a normalised `ApiError` → seal failure union (US-E18.13 + US-E18.24).
 * Ground-truthed `AcademicRecords` error codes (`ERROR_CODES.md:449-467`,
 * `pkg/kit/response/error.go` `codeFromKey`, UPPER_SNAKE). Branch on `code`,
 * never on message. Code checks come BEFORE the generic status fallbacks so
 * `UNSEAL_REQUEST_NOT_FOUND` (404) resolves to `no-pending-request` rather than
 * the generic `not-found`.
 */
function toSealFailure(err: unknown): AcademicRecordsFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err) ?? 0;

  switch (code) {
    case "ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST":
      return { type: "unlocked-grades-exist" };
    case "ACADEMIC_RECORD_TOO_MANY_RESEALS":
      return { type: "too-many-reseals" };
    case "ACADEMIC_RECORD_NOT_SEALED":
      return { type: "not-sealed" };
    // 422 — empty/missing `reason` on initiate. Deliberately reuses
    // `reason-too-short` (same UX meaning "reason invalid"; the initiate form's
    // own MIN_UNSEAL_REASON_LENGTH check distinguishes empty client-side).
    case "UNSEAL_REASON_REQUIRED":
      return { type: "reason-too-short" };
    // 404 — approve target missing. Same meaning as the old mock-first check.
    case "UNSEAL_REQUEST_NOT_FOUND":
      return { type: "no-pending-request" };
    case "UNSEAL_REQUEST_ALREADY_APPROVED":
      return { type: "unseal-request-already-approved" };
    case "UNSEAL_REQUEST_INVALID_STATUS":
      return { type: "unseal-request-invalid-status" };
    case "UNSEAL_REQUEST_INVALID_CURSOR":
      return { type: "unseal-request-invalid-cursor" };
    default:
      break;
  }

  if (code === "ACADEMIC_RECORD_FORBIDDEN" || status === 403) {
    return { type: "forbidden" };
  }
  if (code === "ACADEMIC_RECORD_NOT_FOUND" || status === 404) {
    return { type: "not-found" };
  }
  if (code === "NETWORK_ERROR" || status >= 500) {
    return { type: "network-error" };
  }
  return { type: "unknown" };
}

/**
 * Resolves `memberId → displayName` for a listing page (decision 0017 —
 * cross-feature composition happens in `bootstrap/di/academic-records.di.ts`,
 * never inside this feature's own layers).
 */
export type MemberNameResolver = (
  memberIds: string[],
) => Promise<Result<MemberSummary[], IamDirectoryFailure>>;

/**
 * Real HTTP repository for the seal/unseal surface.
 *
 * SIX methods are wired REAL: `sealBatch` (US-E18.13); `getSealStatus`,
 * `getPendingUnsealRequests`, `initiateUnseal` and `confirmUnseal` (US-E18.24,
 * once BE US-150 shipped the pending-request listing ADR `0055` said was
 * missing); and `listSealedStudents` (US-E18.43, once BE US-183 shipped the
 * per-student sealed listing — the LISTING half of ask #21).
 *
 * `listAvailableClasses`, `getSealAuditTrail` and `listTenantAdmins` remain
 * PERMANENTLY dormant (`notImplemented`): the first two have no endpoint
 * anywhere in `core`'s `AcademicRecords` tag — and `getSealAuditTrail` never
 * will, since the record stores only the LATEST seal cycle plus a reseal
 * counter, i.e. there is no multi-cycle seal/unseal event log (BE US-183
 * confirmed this; the unseal-REQUEST history is `getPendingUnsealRequests`) —
 * while the third cannot be served accurately by IAM (`MemberListItem.roles`
 * has no `SUPER_ADMIN`, so an ADMIN-only listing would under-count real
 * approvers and turn a legal compliance gate into a wrong answer). They are
 * never invoked on the real branch: the DI factory composes this class behind
 * `HybridAcademicRecordsSealRepository`, which routes those three to the mock.
 *
 * ⚠️ NOTE (carried forward from US-E18.13, applying to ALL SIX real methods —
 * `listSealedStudents` inherits it unchanged, US-E18.43):
 * `SealBatchKey.term` is `'HK1'`/`'HK2'` — a LABEL, not a real termId (UUID).
 * The class/term selector feeding it is itself mock-sourced (ADR 0055,
 * `listAvailableClasses`), so these calls are not meaningfully reachable
 * end-to-end until that selector is wired to the real calendar/term feature.
 * Do NOT assume `key.term`/`termId` is a valid UUID once the selector changes.
 * Wiring the HTTP call for real is still correct (it matches its five siblings
 * and pins the boundary for the day the selector is fixed) — but do NOT claim
 * end-to-end reachability. Additionally, the screen's current caller
 * (`academic-record-seal-container.tsx`) invokes `listSealedStudents()` with NO
 * filter, which this class+term-scoped endpoint cannot serve: that call fails
 * with `not-found` (no HTTP request) instead of faking an empty picker. Scoping
 * that query to the selected class/term is a UI change deliberately left out of
 * US-E18.43 (it would not become reachable anyway while `term` is a label).
 */
export class AcademicRecordsSealRepository
  implements IAcademicRecordsSealRepository
{
  constructor(
    private readonly http: AxiosInstance,
    /**
     * Optional so wire-level tests can construct the repository with just an
     * http client. Absent = every row keeps the raw-id fallback — a degraded
     * display, never an error (same convention as `staffing.repository.ts`).
     */
    private readonly resolveMembers?: MemberNameResolver,
  ) {}

  private notImplemented(): never {
    throw new Error("not-implemented");
  }

  /**
   * `memberId → displayName` for a whole page in ONE batch call. Never throws
   * and never fails the caller: a lookup error degrades to an empty map, which
   * the mapper's raw-id fallback then covers.
   */
  private async memberNameMap(
    memberIds: string[],
  ): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    if (!this.resolveMembers || memberIds.length === 0) return names;

    const result = await this.resolveMembers(memberIds);
    if (!result.ok) return names;
    for (const m of result.value) names.set(m.memberId, m.displayName);
    return names;
  }

  listAvailableClasses(_filter: {
    term: Term;
    year: string;
  }): Promise<SealResult<ClassOption[]>> {
    return this.notImplemented();
  }

  async getSealStatus(
    key: SealBatchKey,
  ): Promise<SealResult<SealStatusRollup>> {
    try {
      const dto = (await this.http.get(
        ACADEMIC_RECORDS_EP.sealStatus(key.classId, key.term),
      )) as unknown as SealStatusResponseDto;
      return { ok: true, data: sealStatusRollupMapper(dto, key) };
    } catch (err) {
      return { ok: false, error: toSealFailure(err) };
    }
  }

  async sealBatch(
    key: SealBatchKey,
    _actorId: string,
  ): Promise<SealResult<SealBatchResult>> {
    try {
      // Bare POST, no body: `_actorId` stays in the domain signature (the mock
      // repo needs it) but the server derives the actor from the Bearer token
      // and performs the "all grades locked" check server-side.
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

  /**
   * US-E18.43 (BE US-183) — the currently-SEALED subset of a class roster, the
   * per-student companion to `getSealStatus`. UNPAGINATED (bounded by the
   * roster) and already narrowed server-side, so there is no cursor to drain and
   * no `raw: true` needed.
   *
   * The endpoint is class+term PATH-scoped: an incomplete key addresses no
   * resource, so it fails with `not-found` and performs NO HTTP call rather than
   * quietly returning an empty picker (the screen's current caller passes no
   * filter — see the reachability note on this class).
   *
   * `year` is not on the wire and not in the path; like `getSealStatus` the
   * caller's key is re-attached by the mapper. Display names come from ONE
   * deduped IAM batch lookup — an unresolved id degrades to the raw id.
   */
  async listSealedStudents(
    filter?: Partial<SealBatchKey>,
  ): Promise<SealResult<SealedStudentOption[]>> {
    const { classId, term, year } = filter ?? {};
    if (!classId || !term) {
      return { ok: false, error: { type: "not-found" } };
    }
    const key: SealBatchKey = { classId, term, year: year ?? "" };

    try {
      const rows = (await this.http.get(
        ACADEMIC_RECORDS_EP.sealedStudents(classId, term),
      )) as unknown as SealedStudentListItemDto[];

      const nameMap = await this.memberNameMap([
        ...new Set(rows.map((r) => r.studentMemberId)),
      ]);

      return {
        ok: true,
        data: rows.map((dto) => sealedStudentMapper(dto, key, nameMap)),
      };
    } catch (err) {
      return { ok: false, error: toSealFailure(err) };
    }
  }

  async getPendingUnsealRequests(
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
    try {
      // `raw: true` is a CONFIG-level sibling of `params` (never nested inside
      // it) — the interceptor then skips unwrapping so `meta.pagination`
      // survives for the cursor.
      const envelope = (await this.http.get(
        ACADEMIC_RECORDS_EP.unsealRequests(classId, termId),
        {
          params: {
            // The server defaults to PENDING and accepts either case; we send
            // it explicitly so the request is self-describing in logs.
            status: opts?.status ?? "PENDING",
            cursor: opts?.cursor ?? undefined,
            limit: opts?.limit,
          },
          raw: true,
        },
      )) as unknown as ApiEnvelope<UnsealRequestListItemDto[]>;
      const { data, pagination } = parseEnvelope(envelope);

      // ONE deduped batch lookup covering BOTH id columns of the whole page —
      // never one call per row (`core` ships raw UUIDs by design).
      const nameMap = await this.memberNameMap([
        ...new Set(data.flatMap((r) => [r.studentMemberId, r.requestedBy])),
      ]);

      return {
        ok: true,
        data: {
          items: data.map((dto) => unsealRequestSummaryMapper(dto, nameMap)),
          nextCursor: pagination?.nextCursor ?? null,
          hasMore: pagination?.hasMore ?? false,
        },
      };
    } catch (err) {
      return { ok: false, error: toSealFailure(err) };
    }
  }

  async initiateUnseal(
    input: InitiateUnsealInput,
  ): Promise<SealResult<UnsealInitiateResult>> {
    try {
      // Unlike `sealBatch`/approve this POST DOES carry a body — exactly the
      // two `RequestUnsealRequest` fields. `initiatorId` is NOT sent (the
      // server records the requester from the Bearer token).
      const dto = (await this.http.post(
        ACADEMIC_RECORDS_EP.unsealRequests(input.classId, input.term),
        {
          studentMemberId: input.studentId,
          reason: input.reason.trim(),
        },
      )) as unknown as RequestUnsealResponseDto;
      return { ok: true, data: unsealInitiateResultMapper(dto) };
    } catch (err) {
      return { ok: false, error: toSealFailure(err) };
    }
  }

  async confirmUnseal(
    requestId: string,
    _coSignerId: string | null,
    _classId: string,
    _termId: string,
  ): Promise<SealResult<UnsealApproveResult>> {
    try {
      // Bare POST: `requestId` is a path param, there is no body.
      // `_coSignerId` stays a domain-signature parameter (the mock needs it for
      // its audit actor) but is NOT on the wire — the server derives the
      // approver from the Bearer token and computes `selfApproved` itself.
      // `_classId`/`_termId` only scope the use-case's pre-check listing.
      const dto = (await this.http.post(
        ACADEMIC_RECORDS_EP.unsealApprove(requestId),
      )) as unknown as ApproveUnsealResponseDto;
      return { ok: true, data: unsealApproveResultMapper(dto) };
    } catch (err) {
      return { ok: false, error: toSealFailure(err) };
    }
  }

  listTenantAdmins(): Promise<SealResult<TenantAdminSummary[]>> {
    return this.notImplemented();
  }
}
