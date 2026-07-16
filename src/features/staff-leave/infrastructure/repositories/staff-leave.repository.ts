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
 * always constructs the mock repo. Ground-truthed against the real contract
 * (`edu-api/services/core/docs/openapi.yaml`
 * `/api/v1/conduct/staff-leave-requests*` + Go source), this screen cannot be
 * wired at all, not just path-fixed:
 *
 * 1. **No tenant-wide oversight list.** `GET` requires a mandatory
 *    `staffMemberId` query param (table partitions on
 *    `(tenantId, staffMemberId)`) — there is no "every staff member's pending
 *    requests" endpoint. This admin screen shows exactly that.
 * 2. **Even a single-member list is unusable.** `StaffLeaveRequestResponse`
 *    has zero display fields (no `staffName`/`department`/`leaveType` — the
 *    leave-*type* concept doesn't exist on the wire at all) and IAM has no
 *    batch/by-id profile lookup to backfill a name from `staffMemberId`
 *    (cross-repo ask #6/#7).
 * 3. `approve`/`reject` are therefore also unreachable: the only source of a
 *    valid `(id, staffMemberId)` pair is a list response, and that list is
 *    mock-sourced — a mock id will never resolve against the real BE.
 *
 * Cross-repo ask #13 logged in `EPIC-OVERVIEW.md`. These three methods are
 * permanent blocked stubs (mirrors `ClassManagementRepository.listTeachers()`,
 * US-E18.4) — never invoked, kept only to satisfy the interface. `toFailure`
 * above is kept correct + unit-tested for the day this unblocks.
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
