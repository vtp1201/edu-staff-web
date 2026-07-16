import "server-only";
import type { AxiosInstance } from "axios";
import { errorCodeOf, statusOf } from "@/bootstrap/lib/api-envelope";
import type { PlanCell } from "../../domain/entities/plan-cell.entity";
import type { TeachingPlan } from "../../domain/entities/teaching-plan.entity";
import type { TeachingPlanFailure } from "../../domain/failures/teaching-plan.failure";
import type {
  ITeachingPlanRepository,
  PendingPlansFilter,
} from "../../domain/repositories/i-teaching-plan.repository";

/**
 * Map a normalised ApiError to the teaching-plan failure union.
 *
 * Ground-truthed for US-E18.9 against
 * `edu-api/services/core/docs/openapi.yaml` (`TeachingPlan (LMS)` tag) +
 * `internal/lms/teachingplan/core/domain/domainerror/errors.go` +
 * `pkg/kit/response/error.go`'s `codeFromKey` uppercasing (confirms decision
 * `0008` UPPER_SNAKE holds for `core`, same as US-E18.1/.2/.6/.7/.8). The
 * pre-US-E18.9 guessed taxonomy (`not-draft`/`not-submitted`/
 * `insufficient-cells`/`invalid-rejection-reason`) matched NONE of the real
 * codes — every real error would have silently fallen to `unknown`.
 *
 * Real codes: `teaching_plan_not_found` (404), `teaching_plan_invalid_status_transition`
 * (409, submit needs DRAFT / approve+reject need SUBMITTED),
 * `teaching_plan_not_owner` (403, submit by a non-owning teacher),
 * `teaching_plan_class_subject_not_found` (404, create-time),
 * `teaching_plan_teacher_not_assigned` (403, create-time — teacher not
 * assigned to the classSubject), `teaching_plan_forbidden` (403, wrong role).
 * Branch on `error.code`, never on message.
 */
export function toFailure(err: unknown): TeachingPlanFailure {
  const code = errorCodeOf(err);
  const status = statusOf(err);

  if (code === "NETWORK_ERROR" || status === undefined || status === 0) {
    return { type: "network-error" };
  }
  if (code === "TEACHING_PLAN_NOT_FOUND") {
    return { type: "not-found" };
  }
  if (code === "TEACHING_PLAN_INVALID_STATUS_TRANSITION") {
    return { type: "not-draft" };
  }
  if (
    code === "TEACHING_PLAN_NOT_OWNER" ||
    code === "TEACHING_PLAN_FORBIDDEN"
  ) {
    return { type: "unauthorized" };
  }
  if (code === "TEACHING_PLAN_CLASS_SUBJECT_NOT_FOUND") {
    return { type: "not-found" };
  }
  if (code === "TEACHING_PLAN_TEACHER_NOT_ASSIGNED") {
    return { type: "unauthorized" };
  }
  if (code === "FORBIDDEN" || code === "UNAUTHORIZED" || status === 403) {
    return { type: "unauthorized" };
  }
  // Note: `reject`'s 422 `VALIDATION_FAILED` (empty `rejectReason`) is a
  // framework-level code, not part of the 6-code domain taxonomy above —
  // intentionally left to fall through to `unknown` (tech-lead review,
  // US-E18.9). Revisit if/when this repo unblocks.
  return { type: "unknown", message: code };
}

/**
 * Real `core`/`lms` teaching-plan repository (US-E11.4 / US-E18.9).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** — `teaching-plan.di.ts`
 * always constructs the mock repo (second fully-blocked factory in this epic
 * after `staff-leave.di.ts`, US-E18.8). Ground-truthed against the real
 * contract (`edu-api/services/core/docs/openapi.yaml` `TeachingPlan (LMS)` +
 * Go source), the teacher weekly-grid screen cannot be wired at all, not just
 * path-fixed:
 *
 * 1. **Composite-key granularity mismatch.** The web domain keys a plan by
 *    `(subjectId, classId, term)` — one plan per term (HKI/HKII). The real
 *    key is `(classSubjectId, academicYear, planId)` — one plan spans the
 *    FULL academic year, no term dimension exists on the wire at all.
 *    `classSubjectId` itself is resolvable (`CLASS_EP.classSubjects(classId)`,
 *    same fan-out `principal-teachers.repository.ts` already uses) but
 *    collapsing/expanding term↔academicYear is a product decision, not a
 *    lossless infra remap — out of scope for a `normal`-lane wiring US (same
 *    reasoning the epic applies to Wave 3's semantic remaps).
 * 2. **No period axis on the wire.** `WeeklyEntryResponse` is
 *    `{ weekNumber, topic, notes }` — one entry per week. The web grid is
 *    `weeks × periodsPerWeek`; there is no way to address an individual
 *    `(week, period)` cell server-side.
 * 3. **No endpoint to edit an existing plan's entries at all.** `create`
 *    (`POST /api/v1/lms/teaching-plans`) accepts the full `weeklyEntries`
 *    array once; there is no `PUT`/`PATCH` to replace or append entries
 *    afterward — confirmed by reading `routes.go` (only
 *    `POST /`, `GET /`, `GET /:id`, `PUT /:id/{submit,approve,reject}` are
 *    mounted). The domain entity `TeachingPlan.UpdateEntries()`
 *    (`core/domain/entity/teaching_plan.go`) exists and is unit-tested but is
 *    **dead code** — never called by any use-case or handler. This is the
 *    direct answer to the epic table's "`/cells` cần decision": it is not a
 *    missing path segment to nest, it is a missing HTTP surface entirely.
 *    Web's per-cell autosave (`savePlanCell`) therefore has zero real
 *    equivalent.
 * 4. **No `REJECTED` status.** Real `status` is `DRAFT | SUBMITTED | APPROVED`
 *    only; reject transitions the plan back to `DRAFT` with `rejectReason`
 *    set. Web renders `REJECTED` as a first-class status (badge + banner).
 * 5. **No fill-ratio validation concept.** `create` only requires
 *    `weeklyEntries: minItems 1`; web's `insufficient-cells` (≥50% filled)
 *    submit-gate has no wire equivalent.
 *
 * Cross-repo ask #14 logged in `EPIC-OVERVIEW.md` (wire `UpdateEntries()` to a
 * `PUT` endpoint while `DRAFT`, the cheapest unblock — the domain method
 * already exists). Every method below is a permanent blocked stub (mirrors
 * `StaffLeaveRepository`, US-E18.8) — never invoked, kept only to satisfy the
 * interface. `toFailure` above is kept correct + unit-tested for the day this
 * unblocks.
 */
export class TeachingPlanRepository implements ITeachingPlanRepository {
  // Kept for constructor-signature parity with every other repo (test callers
  // do `new TeachingPlanRepository(http)`) even though every method below is
  // a permanent blocked stub — see class doc above.
  // biome-ignore lint/complexity/noUselessConstructor: signature parity, see comment above.
  constructor(_http: AxiosInstance) {}

  async getTeachingPlan(
    _subjectId: string,
    _classId: string,
    _term: string,
  ): Promise<TeachingPlan | null> {
    const failure: TeachingPlanFailure = { type: "network-error" };
    throw failure;
  }

  async savePlanCell(_planId: string, _cell: PlanCell): Promise<TeachingPlan> {
    const failure: TeachingPlanFailure = { type: "network-error" };
    throw failure;
  }

  async submitPlan(_planId: string): Promise<TeachingPlan> {
    const failure: TeachingPlanFailure = { type: "network-error" };
    throw failure;
  }

  async approvePlan(_planId: string): Promise<TeachingPlan> {
    const failure: TeachingPlanFailure = { type: "network-error" };
    throw failure;
  }

  async rejectPlan(_planId: string, _reason: string): Promise<TeachingPlan> {
    const failure: TeachingPlanFailure = { type: "network-error" };
    throw failure;
  }

  async listPendingPlans(_filter: PendingPlansFilter): Promise<TeachingPlan[]> {
    const failure: TeachingPlanFailure = { type: "network-error" };
    throw failure;
  }
}
