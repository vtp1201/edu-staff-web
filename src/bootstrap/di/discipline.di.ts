import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { makeListMyTeacherClassesUseCase } from "@/bootstrap/di/teacher-class.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { LeaveDecisionAuthContext } from "@/features/discipline/domain/entities/leave-decision-auth-context.entity";
import type { IDisciplineRepository } from "@/features/discipline/domain/repositories/i-discipline.repository";
import { ApproveLeaveUseCase } from "@/features/discipline/domain/use-cases/approve-leave.use-case";
import { DeleteViolationUseCase } from "@/features/discipline/domain/use-cases/delete-violation.use-case";
import { GetChildConductSummaryUseCase } from "@/features/discipline/domain/use-cases/get-child-conduct-summary.use-case";
import { GetChildLeaveRequestsUseCase } from "@/features/discipline/domain/use-cases/get-child-leave-requests.use-case";
import { GetChildViolationsUseCase } from "@/features/discipline/domain/use-cases/get-child-violations.use-case";
import { GetChildrenUseCase } from "@/features/discipline/domain/use-cases/get-children.use-case";
import { GetConductSummaryUseCase } from "@/features/discipline/domain/use-cases/get-conduct-summary.use-case";
import { GetLeaveRequestsUseCase } from "@/features/discipline/domain/use-cases/get-leave-requests.use-case";
import { GetMyConductSummaryUseCase } from "@/features/discipline/domain/use-cases/get-my-conduct-summary.use-case";
import { GetMyLeaveRequestsUseCase } from "@/features/discipline/domain/use-cases/get-my-leave-requests.use-case";
import { GetMyViolationsUseCase } from "@/features/discipline/domain/use-cases/get-my-violations.use-case";
import { GetViolationsUseCase } from "@/features/discipline/domain/use-cases/get-violations.use-case";
import { OverrideConductGradeUseCase } from "@/features/discipline/domain/use-cases/override-conduct-grade.use-case";
import { RecordViolationUseCase } from "@/features/discipline/domain/use-cases/record-violation.use-case";
import { RejectLeaveUseCase } from "@/features/discipline/domain/use-cases/reject-leave.use-case";
import { SubmitChildLeaveRequestUseCase } from "@/features/discipline/domain/use-cases/submit-child-leave-request.use-case";
import { SubmitLeaveRequestUseCase } from "@/features/discipline/domain/use-cases/submit-leave-request.use-case";
import { DisciplineRepository } from "@/features/discipline/infrastructure/repositories/discipline.repository";
import { MockDisciplineRepository } from "@/features/discipline/infrastructure/repositories/mocks/discipline.mock.repository";

/**
 * Discipline repository factory (per-request) for every operation EXCEPT the
 * three GVCN leave-inbox ones (see `makeLeaveRepo` below).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.14) — the third
 * fully-blocked DI factory in this epic after `staff-leave.di.ts` (US-E18.8)
 * and `teaching-plan.di.ts` (US-E18.9). The real `DisciplineRepository`
 * exists only as permanent blocked stubs: two categorical blockers — no real
 * student-roster UUID lookup (roster stays mock-first, US-E18.5 / ask #9) and
 * no self-scope `classId` discovery for STUDENT or PARENT (ask #15 / #22) —
 * make EVERY operation in this feature unreachable on the real API (see the
 * `DisciplineRepository` class doc and
 * `docs/stories/epics/E18-be-wiring/US-E18.14-discipline-conduct-wiring/story.md`).
 * Forcing mock here guards against the day the app-wide `USE_MOCK` flag flips
 * to `false` and would otherwise silently break all four discipline screens.
 *
 * US-E24.11 carved out the leave-request branch ONLY — see `makeLeaveRepo`. If
 * you are tempted to make this function `USE_MOCK`-conditional too, read the
 * `DisciplineRepository` class doc first: everything routed through here is
 * still a permanent blocked stub.
 */
async function makeRepo(): Promise<IDisciplineRepository> {
  return new MockDisciplineRepository();
}

export async function makeDisciplineRepository(): Promise<IDisciplineRepository> {
  return makeRepo();
}

export async function makeGetViolationsUseCase() {
  return new GetViolationsUseCase(await makeRepo());
}

export async function makeRecordViolationUseCase() {
  return new RecordViolationUseCase(await makeRepo());
}

export async function makeDeleteViolationUseCase() {
  return new DeleteViolationUseCase(await makeRepo());
}

export async function makeGetConductSummaryUseCase() {
  return new GetConductSummaryUseCase(await makeRepo());
}

export async function makeOverrideConductGradeUseCase() {
  return new OverrideConductGradeUseCase(await makeRepo());
}

/* ── GVCN homeroom leave inbox — un-force-mocked by US-E24.11 ───────────── */

/**
 * Leave-request repository factory — an ORDINARY `USE_MOCK ? Mock : Real` gate
 * (decision `0014`), unlike `makeRepo()` above.
 *
 * Only three operations are reachable on the real API and they all live here:
 * `getLeaveRequests({ classId })`, `approveLeave`, `rejectLeave`. Neither
 * US-E18.14 blocker applies — core returns the student ids itself (so no roster
 * UUID lookup is needed; IAM's batch directory turns them into names) and the
 * caller is a TEACHER standing in a known `classId` (so no self-scope
 * discovery is needed).
 */
async function makeLeaveRepo(): Promise<IDisciplineRepository> {
  if (USE_MOCK) return new MockDisciplineRepository();
  // decision 0018 — proactive refresh BEFORE the protected core calls.
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const batchResolve = await makeBatchResolveMembersUseCase();
  const resolveNames = async (memberIds: string[]) => {
    const names = new Map<string, string>();
    const result = await batchResolve.execute(memberIds);
    if (result.ok)
      for (const m of result.value) names.set(m.memberId, m.displayName);
    return names;
  };
  return new DisciplineRepository(http, resolveNames);
}

/**
 * HIGH-RISK: the server-derived authorization context for approve/reject
 * (decision `0063`). THE ONLY place it is assembled.
 *
 * - `role` comes from the httpOnly token's claim — never a prop or a param.
 * - `homeroomClassIds` comes from the teacher's OWN class list (the same real
 *   read the class hub already performs), filtered to the classes where they
 *   are the GVCN. Composing across features is legitimate here and only here:
 *   `bootstrap/di` IS the composition root.
 *
 * Every failure path yields an EMPTY scope, never a wildcard: an unreadable
 * token or a failed class read must deny, not widen.
 *
 * Mock mode pins the role to `teacher` — and ONLY mock mode — because
 * `decodeRoleClaim` returns a synthetic `"admin"` for any token when
 * `NEXT_PUBLIC_USE_MOCK=true` (`jwt.ts`), which would deny every decision in
 * local dev. Same posture as `staff-discipline.di.ts`'s `mockRoleHint`: in real
 * mode the claim always wins and the hint does not exist. The SCOPE half is
 * never hinted — it comes from the (mock or real) class list either way.
 */
export async function makeLeaveDecisionAuthContext(): Promise<LeaveDecisionAuthContext> {
  const token = (await getAccessToken()) ?? "";
  let homeroomClassIds: string[] = [];
  try {
    const result = await (await makeListMyTeacherClassesUseCase()).execute();
    if (result.ok) {
      homeroomClassIds = result.data
        .filter((c) => c.roles.includes("homeroom"))
        .map((c) => c.id);
    }
  } catch {
    // Deny by default — a scope we could not read is not a scope we may assume.
  }
  const role = USE_MOCK ? "teacher" : (decodeRoleClaim(token) ?? "student");
  return { role, homeroomClassIds };
}

export async function makeGetLeaveRequestsUseCase() {
  return new GetLeaveRequestsUseCase(await makeLeaveRepo());
}

/** Legacy multi-class dashboards only (`/teacher/discipline`,
 *  `/principal/discipline`) — they cannot derive a class scope, so they call
 *  `execute()` without an `authCtx`. Class-scoped surfaces MUST use
 *  {@link makeDecideLeaveUseCases} instead. */
export async function makeApproveLeaveUseCase() {
  return new ApproveLeaveUseCase(await makeLeaveRepo());
}

/** See {@link makeApproveLeaveUseCase}. */
export async function makeRejectLeaveUseCase() {
  return new RejectLeaveUseCase(await makeLeaveRepo());
}

/**
 * The class-scoped decision bundle. Returning `{ approve, reject, authCtx }`
 * together is the enforcement mechanism: a Server Action cannot construct the
 * use-case without also holding the context it must thread (same shape as
 * `period-log.di.ts`'s mutation factories). Both use-cases share ONE repository
 * instance, so a single action costs one http client, not two.
 */
export async function makeDecideLeaveUseCases() {
  const [repo, authCtx] = await Promise.all([
    makeLeaveRepo(),
    makeLeaveDecisionAuthContext(),
  ]);
  return {
    approve: new ApproveLeaveUseCase(repo),
    reject: new RejectLeaveUseCase(repo),
    authCtx,
  };
}

// --- Student / parent self-service (US-E09.2) ---

export async function makeGetMyConductSummaryUseCase() {
  return new GetMyConductSummaryUseCase(await makeRepo());
}

export async function makeGetMyViolationsUseCase() {
  return new GetMyViolationsUseCase(await makeRepo());
}

export async function makeGetMyLeaveRequestsUseCase() {
  return new GetMyLeaveRequestsUseCase(await makeRepo());
}

export async function makeSubmitLeaveRequestUseCase() {
  return new SubmitLeaveRequestUseCase(await makeRepo());
}

// --- Parent multi-child view (US-E09.4) ---

export async function makeGetChildrenUseCase() {
  return new GetChildrenUseCase(await makeRepo());
}

export async function makeGetChildConductSummaryUseCase() {
  return new GetChildConductSummaryUseCase(await makeRepo());
}

export async function makeGetChildViolationsUseCase() {
  return new GetChildViolationsUseCase(await makeRepo());
}

export async function makeGetChildLeaveRequestsUseCase() {
  return new GetChildLeaveRequestsUseCase(await makeRepo());
}

export async function makeSubmitChildLeaveRequestUseCase() {
  return new SubmitChildLeaveRequestUseCase(await makeRepo());
}
