import "server-only";
import type { AxiosInstance } from "axios";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { StaffLeaveRequestEntity } from "../../domain/entities/staff-leave-request.entity";
import type { StaffLeaveFailure } from "../../domain/failures/staff-leave.failure";
import type {
  IStaffLeaveRepository,
  StaffLeaveActionResult,
  StaffLeaveResult,
} from "../../domain/repositories/i-staff-leave.repository";

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

/**
 * Real `core` staff-leave repository (US-E09.3 / US-E18.8).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** — `staff-leave.di.ts`
 * always constructs the mock repo.
 *
 * RATIONALE REVISED in US-E18.23. Two of the three original blockers are GONE;
 * only the third survives, and it alone is still decisive:
 *
 * 1. ~~No tenant-wide oversight list~~ — **RESOLVED by core US-149.**
 *    `staffMemberId` is now OPTIONAL on
 *    `GET /core/api/v1/conduct/staff-leave-requests`; omitting it returns the
 *    tenant-wide list (ADMIN/MANAGER/SUPER_ADMIN, else
 *    `403 VIOLATION_FORBIDDEN`), sliced by `status` (default `submitted` —
 *    the wire has no literal `pending`).
 * 2. ~~No way to backfill `staffName`~~ — **RESOLVED by IAM US-144.**
 *    `staffMemberId` is now resolvable through `iam-directory`'s batch lookup,
 *    exactly as `staffing` resolves its assignment `memberName` (US-E18.23).
 * 3. **STILL BLOCKING — `department` and `leaveType` have no wire source.**
 *    `StaffLeaveRequestResponse` carries `requestId`, `staffMemberId`,
 *    `startDate`, `endDate`, `reason`, `state`, `selfApproved`,
 *    `approverMemberId`, `createdAt`, `updatedAt` — and nothing else
 *    (re-ground-truthed 2026-08-01: 0 candidate fields; the openapi
 *    description states `leaveType` is intentionally out of scope pending
 *    product decision OQ-149-01). Both fields are REQUIRED, non-optional on
 *    `StaffLeaveRequestEntity`, and the shipped card does an unguarded lookup
 *    on each (`LEAVE_TYPE_META[request.leaveType]` would be `undefined` and
 *    crash; `department` is interpolated with no fallback). Unlike
 *    `memberName`, no raw id can stand in — a leave *category* is a missing
 *    concept, not a missing label, and inventing one is forbidden.
 *
 * Wiring the other two halves alone would produce a part-real/part-fabricated
 * row, which is worse than either clean option — so the screen stays fully
 * mock and the narrow gap is filed as cross-repo ask **#41** (ask #13 is
 * partially resolved; see `EPIC-OVERVIEW.md`). These three methods remain
 * permanent blocked stubs, never invoked, kept only to satisfy the interface.
 * `toFailure` above is kept correct + unit-tested for the day this unblocks.
 */
export class StaffLeaveRepository implements IStaffLeaveRepository {
  // Kept for constructor-signature parity with every other repo (test callers
  // do `new StaffLeaveRepository(http)`) even though every method below is a
  // permanent blocked stub — see class doc above.
  // biome-ignore lint/complexity/noUselessConstructor: signature parity, see comment above.
  constructor(_http: AxiosInstance) {}

  async listRequests(_filter?: {
    status?: StaffLeaveRequestEntity["status"];
  }): Promise<StaffLeaveResult<StaffLeaveRequestEntity[]>> {
    return { ok: false, error: { type: "network-error" } };
  }

  async approve(_id: string): Promise<StaffLeaveActionResult> {
    return { ok: false, error: { type: "network-error" } };
  }

  async reject(_id: string, _reason: string): Promise<StaffLeaveActionResult> {
    return { ok: false, error: { type: "network-error" } };
  }
}
