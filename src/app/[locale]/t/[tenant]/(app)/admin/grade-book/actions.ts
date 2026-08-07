"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/bootstrap/auth-guard";
import {
  makeApproveColumnEntryUseCase,
  makeListPendingApprovalBatchesUseCase,
  makeLockTermUseCase,
  makeRejectColumnEntryUseCase,
} from "@/bootstrap/di/grades.di";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import type { GradesFailure } from "@/features/grades/domain/failures/grades.failure";
import type { PendingApprovalPageResult } from "@/features/grades/presentation/grade-entry-screen/grade-entry-screen.i-vm";

/**
 * Both ADMIN/MANAGER grade-view routes. The two namespaces are separate because
 * the role guards are strict-equality (`principal/layout.tsx` vs
 * `admin/layout.tsx`), but they render the SAME screen off the SAME data, so a
 * mutation from either must invalidate both.
 */
const PATHS = [
  "/[locale]/t/[tenant]/(app)/admin/grade-book",
  "/[locale]/t/[tenant]/(app)/principal/grade-book",
];

/**
 * Roles allowed to approve/reject/lock grades (BE US-184: ADMIN/MANAGER). Both
 * BE enums collapse onto the `principal` appRole via `ROLE_ENUM_TO_APP`;
 * `admin` covers the platform-admin token and mock mode.
 */
const APPROVER_ROLES = ["principal", "admin"] as const;

type LockResult =
  | { ok: true; lockedCount: number }
  | { ok: false; errorKey: GradesFailure["type"] };

type ActionResult =
  | { ok: true }
  | { ok: false; errorKey: GradesFailure["type"] };

function isFailure(x: unknown): x is GradesFailure {
  return typeof x === "object" && x !== null && "type" in x;
}

/**
 * Irreversible admin/manager bulk-lock (US-E18.12, ADR 0054 §3.2/§4).
 *
 * The `requireRole` gate was added in US-E18.44: a Server Action is a publicly
 * callable endpoint, so relying on the route layout's guard alone left an
 * irreversible mutation reachable by any authenticated session that invoked the
 * action directly. `core` enforces its own 403 on top.
 */
export async function lockTermAction(
  key: ClassSubjectTermKey,
): Promise<LockResult> {
  const guard = await requireRole(APPROVER_ROLES);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeLockTermUseCase(key);
  const result = await useCase.execute(key);
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  for (const path of PATHS) revalidatePath(path, "page");
  return { ok: true, lockedCount: result.lockedCount };
}

/**
 * US-E18.44 (BE US-184) — reject / request revision on ONE `PENDING_APPROVAL`
 * cell (`PENDING_APPROVAL → DRAFT` + a required reason ≤500 chars).
 *
 * Lives here rather than under `teacher/grades` because the reject affordance is
 * only ever mounted on the ADMIN/MANAGER grade view (`/principal/grade-book`,
 * `/admin/grade-book`) — the `teacher` namespace layout redirects a principal/
 * admin session away, so an action mounted there could never be reached by a
 * caller allowed to use it.
 *
 * The ADMIN/MANAGER gate is re-checked HERE with the server-derived role claim,
 * BEFORE any DI/HTTP call; the approver VM's presence of `rejectEntryAction`
 * only decides whether the UI renders the affordance.
 */
export async function rejectEntryAction(
  key: ClassSubjectTermKey,
  studentId: string,
  columnId: string,
  reason: string,
): Promise<ActionResult> {
  const guard = await requireRole(APPROVER_ROLES);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeRejectColumnEntryUseCase(key);
  const result = await useCase.execute(key, studentId, columnId, reason);
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  for (const path of PATHS) revalidatePath(path, "page");
  return { ok: true };
}

/**
 * US-E18.46 (BE `ApproveGradeUseCase`) — approve ONE `PENDING_APPROVAL` cell
 * (`PENDING_APPROVAL → PUBLISHED`). No reason, no body: approval is
 * unqualified, so nothing but the target is threaded through.
 *
 * Same gate + same home as `rejectEntryAction`, for the same reason: the
 * affordance is only ever mounted on the two ADMIN/MANAGER grade views, and the
 * VM's mere possession of this action decides UI VISIBILITY only — the
 * server-derived role claim is re-checked HERE, before any DI/HTTP call,
 * because a Server Action is a publicly callable endpoint.
 */
export async function approveEntryAction(
  key: ClassSubjectTermKey,
  studentId: string,
  columnId: string,
): Promise<ActionResult> {
  const guard = await requireRole(APPROVER_ROLES);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeApproveColumnEntryUseCase(key);
  const result = await useCase.execute(key, studentId, columnId);
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  for (const path of PATHS) revalidatePath(path, "page");
  return { ok: true };
}

/**
 * US-E18.46 (BE US-186) — one page of the tenant-wide pending-approval rollup.
 * Drives both "load more" and the section's retry (`cursor: null` = first
 * page).
 *
 * READ-only, but still `requireRole`-gated: the rollup discloses tenant-wide
 * which classes have ungraded/unapproved work, which is exactly the oversight
 * view BE restricts to ADMIN/MANAGER (`isAdminOrManager` — the SAME gate as
 * approve/reject). It performs no `revalidatePath`: it returns data to a client
 * component, it does not mutate anything.
 */
export async function loadPendingApprovalPageAction(
  cursor: string | null,
): Promise<PendingApprovalPageResult> {
  const guard = await requireRole(APPROVER_ROLES);
  if (!guard.ok) return { ok: false, errorKey: "forbidden" };

  const useCase = await makeListPendingApprovalBatchesUseCase();
  const result = await useCase.execute({ cursor: cursor ?? undefined });
  if (isFailure(result)) {
    return { ok: false, errorKey: result.type };
  }
  return { ok: true, page: result };
}
