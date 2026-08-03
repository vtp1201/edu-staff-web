import "server-only";
import type { AxiosInstance } from "axios";
import { STAFF_LEAVE_EP } from "@/bootstrap/endpoint/staff-leave.endpoint";
import {
  type ApiEnvelope,
  errorCodeOf,
  parseEnvelope,
  statusOf,
} from "@/bootstrap/lib/api-envelope";
import type { MemberSummary } from "@/features/iam-directory/domain/entities/member-summary.entity";
import type { IamDirectoryFailure } from "@/features/iam-directory/domain/failures/iam-directory.failure";
import type { Result } from "@/features/iam-directory/domain/use-cases/result";
import type { StaffLeaveRequestEntity } from "../../domain/entities/staff-leave-request.entity";
import type { StaffLeaveFailure } from "../../domain/failures/staff-leave.failure";
import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
  StaffLeaveResult,
} from "../../domain/repositories/i-staff-leave.repository";
import type {
  StaffLeaveResponseDto,
  StaffLeaveStateDto,
} from "../dtos/staff-leave-response.dto";
import {
  StaffLeaveMapper,
  WIRE_BY_STATUS,
} from "../mappers/staff-leave.mapper";

/**
 * Map a normalised ApiError to the staff-leave failure union (US-E09.3,
 * ground-truthed for US-E18.8 against `edu-api/services/core`'s
 * `internal/conduct/core/application/usecase/{approve,reject,list}_staff_leave_request*.go`
 * (all three call the shared `ApprovalTransition` domain service's
 * `ErrViolationForbidden()` — `VIOLATION_FORBIDDEN`, NOT `LEAVE_REQUEST_FORBIDDEN`,
 * which is emitted only by `submit_staff_leave_request.go`'s self-service path
 * this repository never calls) + `pkg/kit/response/error.go`'s `codeFromKey`
 * uppercasing — confirms decision `0008` UPPER_SNAKE holds for `core` (same as
 * US-E18.1/.2/.6/.7). Branch on error.code, never on message.
 */
export function toFailure(err: unknown): StaffLeaveFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "LEAVE_REQUEST_NOT_FOUND") {
    return { type: "not-found" };
  }
  if (code === "VIOLATION_FORBIDDEN" || code === "LEAVE_REQUEST_FORBIDDEN") {
    return { type: "forbidden" };
  }
  if (code === "VIOLATION_SAME_ACTOR") {
    return { type: "same-actor" };
  }
  if (code === "VIOLATION_INVALID_TRANSITION") {
    return { type: "already-processed" };
  }
  if (code === "VIOLATION_REJECTION_REASON_REQUIRED") {
    return { type: "missing-reject-reason" };
  }
  if (code === "LEAVE_REQUEST_INVALID_INPUT") {
    return { type: "reason-too-short" };
  }
  return { type: "network-error" };
}

/** Injected by `staff-leave.di.ts` — `iam-directory`'s batch member lookup. */
export type MemberDirectoryResolver = (
  memberIds: string[],
) => Promise<Result<MemberSummary[], IamDirectoryFailure>>;

/**
 * The screen has no server-side status paging: it loads every request once and
 * slices client-side. The tenant-wide list branch is `status`-sliced and
 * DEFAULTS to `SUBMITTED`, so "no filter" must fan out over all three states —
 * omitting `status` would silently return only the pending ones and leave the
 * "Đã duyệt" / "Từ chối" tabs permanently empty.
 */
const ALL_STATES: readonly StaffLeaveStateDto[] = [
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
];

/**
 * Real `core` staff-leave repository (US-E09.3, UN-MOCKED in US-E18.36).
 *
 * Wired at last: the three historical blockers are all closed.
 * 1. Tenant-wide oversight list — core US-149 made `staffMemberId` OPTIONAL on
 *    `GET /conduct/staff-leave-requests`; omitting it returns the tenant-wide
 *    list (ADMIN/MANAGER/SUPER_ADMIN, else `403 VIOLATION_FORBIDDEN`).
 * 2. `staffName` — IAM US-144's batch lookup, composed in `staff-leave.di.ts`
 *    exactly as `staffing` resolves assignment display names (US-E18.23).
 * 3. `department` + `leaveType` — core US-170 put both on the wire. BOTH are
 *    nullable, for DIFFERENT reasons, and neither null is repaired here: the
 *    mapper keeps them `null` and presentation renders a distinct placeholder
 *    for each (legacy-row gap vs ongoing no-department state).
 *
 * Fields the wire still does not carry are DERIVED, never invented:
 * `days` (inclusive span of the returned date range), `initials` / `avatarTone`
 * (from the resolved name / a stable id hash — decorative), `staffRole` (the
 * IAM directory role, `null` when unresolvable → the badge is omitted).
 */
export class StaffLeaveRepository implements IStaffLeaveRepository {
  constructor(
    private readonly http: AxiosInstance,
    /**
     * Optional so wire-level tests can construct the repository with just an
     * http client. Absent = every row keeps the raw-`memberId` fallback (a
     * degraded display, never an error) — same contract as `staffing`.
     */
    private readonly resolveMembers?: MemberDirectoryResolver,
  ) {}

  /**
   * `memberId → MemberSummary` for a whole list, in ONE batch call.
   * Never throws and never fails the caller: a lookup error degrades to an
   * empty map, which the raw-id fallback covers.
   */
  private async memberMap(
    memberIds: string[],
  ): Promise<Map<string, MemberSummary>> {
    const out = new Map<string, MemberSummary>();
    if (!this.resolveMembers || memberIds.length === 0) return out;
    const result = await this.resolveMembers(memberIds);
    if (!result.ok) return out;
    for (const member of result.value) out.set(member.memberId, member);
    return out;
  }

  /** Fully page one `state` slice of the tenant-wide list (newest first). */
  private async fetchState(
    state: StaffLeaveStateDto,
  ): Promise<StaffLeaveResponseDto[]> {
    const out: StaffLeaveResponseDto[] = [];
    let cursor: string | undefined;
    do {
      const env = (await this.http.get(STAFF_LEAVE_EP.list, {
        // `staffMemberId` deliberately OMITTED — that selects the tenant-wide
        // oversight branch (core US-149).
        params: { status: state, ...(cursor ? { cursor } : {}) },
        raw: true,
      })) as unknown as ApiEnvelope<StaffLeaveResponseDto[]>;
      const { data, pagination } = parseEnvelope(env);
      out.push(...data);
      cursor =
        pagination?.hasMore && pagination.nextCursor
          ? pagination.nextCursor
          : undefined;
    } while (cursor);
    return out;
  }

  async listRequests(filter?: {
    status?: StaffLeaveRequestEntity["status"];
  }): Promise<StaffLeaveResult<StaffLeaveRequestEntity[]>> {
    try {
      const states = filter?.status
        ? [WIRE_BY_STATUS[filter.status]]
        : ALL_STATES;
      const slices = await Promise.all(
        states.map((state) => this.fetchState(state)),
      );
      const dtos = slices
        .flat()
        // Each slice is newest-first on its own; the merge needs one order.
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      const ids = dtos.flatMap((dto) =>
        dto.approverMemberId
          ? [dto.staffMemberId, dto.approverMemberId]
          : [dto.staffMemberId],
      );
      const members = await this.memberMap(ids);

      return {
        ok: true,
        value: dtos.map((dto) => StaffLeaveMapper.toEntity(dto, members)),
      };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async approve(id: string, staffId: string): Promise<StaffLeaveActionResult> {
    try {
      // `staffMemberId` is MANDATORY on the by-id routes — it completes the
      // storage key `(tenantId, staffMemberId, requestId)`.
      await this.http.post(STAFF_LEAVE_EP.approve(id), undefined, {
        params: { staffMemberId: staffId },
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }

  async reject(
    id: string,
    staffId: string,
    reason: string,
  ): Promise<StaffLeaveActionResult> {
    try {
      await this.http.post(
        STAFF_LEAVE_EP.reject(id),
        // Body key is `rejectionReason`, not `reason`.
        { rejectionReason: reason },
        { params: { staffMemberId: staffId } },
      );
      return { ok: true };
    } catch (err) {
      return { ok: false, error: toFailure(err) };
    }
  }
}
