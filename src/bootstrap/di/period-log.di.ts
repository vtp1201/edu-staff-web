import "server-only";

import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeMemberId, decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { PeriodLogAuthContext } from "@/features/period-log/domain/entities/period-log-auth-context.entity";
import type { IPeriodLogRepository } from "@/features/period-log/domain/repositories/i-period-log.repository";
import { DeletePeriodLogUseCase } from "@/features/period-log/domain/use-cases/delete-period-log.use-case";
import { DeletePeriodPrepUseCase } from "@/features/period-log/domain/use-cases/delete-period-prep.use-case";
import { GetWeekPeriodLogsUseCase } from "@/features/period-log/domain/use-cases/get-week-period-logs.use-case";
import { GetWeekPeriodPrepsUseCase } from "@/features/period-log/domain/use-cases/get-week-period-preps.use-case";
import { SavePeriodLogUseCase } from "@/features/period-log/domain/use-cases/save-period-log.use-case";
import { SavePeriodPrepUseCase } from "@/features/period-log/domain/use-cases/save-period-prep.use-case";
import { MockPeriodLogRepository } from "@/features/period-log/infrastructure/repositories/mocks/period-log.mock.repository";
import { PeriodLogRepository } from "@/features/period-log/infrastructure/repositories/period-log.repository";
import { MOCK_SLOT_TEACHER_MEMBER_ID } from "@/features/timetable/infrastructure/repositories/mocks/fixtures";

/**
 * Period-log / period-prep composition root (US-E24.9). Ordinary
 * `USE_MOCK ? Mock : Real` gate — both core sub-resources are shipped and
 * wireable (BE US-232/US-233), so nothing here is force-mocked.
 */
async function makeRepo(): Promise<IPeriodLogRepository> {
  if (USE_MOCK) return new MockPeriodLogRepository();
  // Proactive refresh (decision 0018) before the protected core calls.
  await ensureFreshSession();
  return new PeriodLogRepository(await createServerHttpClient());
}

/**
 * HIGH-RISK: the server-derived authorization context (decision 0063). Both
 * fields come from the httpOnly access token — never from a prop, a form field
 * or a search param.
 *
 * `memberId` uses `decodeMemberId` (decision 0074) because core keys every
 * `*MemberId` — here the slot's `teacherMemberId` — by the tenant-scoped claim.
 * An unreadable token yields `""`, which `ownsSlot()` can never match:
 * deny-by-default. `role` defaults to the least-privileged value for the same
 * reason (it is carried for shape parity today; the check itself is the id
 * comparison — see the entity's doc).
 *
 * Mock mode: `decodeMemberId` reads a real claim, which local mock tokens do
 * not carry, so it would deny every write in the demo. The seeded demo
 * teacher's id — the SAME constant the mock timetable stamps on her slots — is
 * substituted, and only when `USE_MOCK` is on. In real mode the claim always
 * wins (same posture as `staff-discipline.di.ts`'s `mockRoleHint`).
 */
export async function makePeriodLogAuthContext(): Promise<PeriodLogAuthContext> {
  const token = (await getAccessToken()) ?? "";
  if (USE_MOCK) {
    return { role: "teacher", memberId: MOCK_SLOT_TEACHER_MEMBER_ID };
  }
  return {
    role: decodeRoleClaim(token) ?? "student",
    memberId: decodeMemberId(token) ?? "",
  };
}

export async function makeGetWeekPeriodLogsUseCase() {
  return new GetWeekPeriodLogsUseCase(await makeRepo());
}

export async function makeGetWeekPeriodPrepsUseCase() {
  return new GetWeekPeriodPrepsUseCase(await makeRepo());
}

/**
 * The four MUTATION factories return `{ useCase, authCtx }` rather than a bare
 * use-case: `execute()` cannot be called without threading the context, so a
 * Server Action physically cannot forget the guard.
 */
export async function makeSavePeriodLogUseCase() {
  const [repo, authCtx] = await Promise.all([
    makeRepo(),
    makePeriodLogAuthContext(),
  ]);
  return { useCase: new SavePeriodLogUseCase(repo), authCtx };
}

export async function makeDeletePeriodLogUseCase() {
  const [repo, authCtx] = await Promise.all([
    makeRepo(),
    makePeriodLogAuthContext(),
  ]);
  return { useCase: new DeletePeriodLogUseCase(repo), authCtx };
}

export async function makeSavePeriodPrepUseCase() {
  const [repo, authCtx] = await Promise.all([
    makeRepo(),
    makePeriodLogAuthContext(),
  ]);
  return { useCase: new SavePeriodPrepUseCase(repo), authCtx };
}

export async function makeDeletePeriodPrepUseCase() {
  const [repo, authCtx] = await Promise.all([
    makeRepo(),
    makePeriodLogAuthContext(),
  ]);
  return { useCase: new DeletePeriodPrepUseCase(repo), authCtx };
}
