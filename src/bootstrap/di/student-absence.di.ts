import "server-only";

import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim, decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { StudentAbsenceAuthContext } from "@/features/student-absences/domain/entities/student-absence-auth-context.entity";
import type { IStudentAbsenceRepository } from "@/features/student-absences/domain/repositories/i-student-absence.repository";
import { EditStudentAbsenceUseCase } from "@/features/student-absences/domain/use-cases/edit-student-absence.use-case";
import { FlagStudentAbsenceUseCase } from "@/features/student-absences/domain/use-cases/flag-student-absence.use-case";
import { toBareCalendarDate } from "@/features/student-absences/domain/use-cases/is-future-date";
import { ListStudentAbsencesUseCase } from "@/features/student-absences/domain/use-cases/list-student-absences.use-case";
import { RecordStudentAbsenceUseCase } from "@/features/student-absences/domain/use-cases/record-student-absence.use-case";
import { resolveStudentAbsenceAuthContext } from "@/features/student-absences/domain/use-cases/resolve-student-absence-auth-context";
import {
  SA_PRINCIPAL_MEMBER_ID,
  SA_TEACHER_CLASS_ID,
  SA_TEACHER_MEMBER_ID,
  SA_TODAY,
} from "@/features/student-absences/infrastructure/repositories/mocks/fixtures";
import { MockStudentAbsenceRepository } from "@/features/student-absences/infrastructure/repositories/mocks/student-absence.mock.repository";

/** The route's role — teacher routes hint `"teacher"`, principal `"principal"`. */
export type StudentAbsenceRoleHint = "teacher" | "principal";

/**
 * Student-absence repository factory (per-request, US-E09.6).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** — same shape and same class
 * of justification as `staff-discipline.di.ts` (US-E09.5) and `discipline.di.ts`
 * (US-E18.14). All 4 `core` student-absence endpoints ARE shipped and
 * ground-truthed BE-side (spec.md §6), but the web client cannot reach them
 * because of the **roster-UUID gap**: no roster-search endpoint resolves
 * `studentMemberId`/`classId` → student/class display name, and
 * `StudentAbsenceResponse` carries no `studentName`/`className` on the wire
 * (cross-repo asks #9/#15/#22, spec.md §8). The record form's student picker and
 * every list row's identity therefore depend on the fixed mock roster
 * (`SA_STUDENT_ROSTER`, FR-010), which makes a real repository unreachable
 * end-to-end today — so no real class exists here at all. Forcing mock guards
 * against the day the app-wide `USE_MOCK` flag flips to `false` and would
 * otherwise silently break both absence routes.
 */
async function makeRepo(
  authCtx: StudentAbsenceAuthContext,
): Promise<IStudentAbsenceRepository> {
  return new MockStudentAbsenceRepository(authCtx, { today: absenceToday() });
}

/**
 * The "today" bound for the future-date guard (FR-002/NFR-009). While the feature
 * is mock-first this is the FIXED mock today, so the seeded fixtures, the date
 * picker's `max`, and the server-side re-check all agree — a real clock would
 * make the seed rows drift into "the future" and break the demo/tests. The real
 * wiring story swaps this for `toBareCalendarDate(new Date())`.
 */
export function absenceToday(): string {
  return USE_MOCK ? SA_TODAY : toBareCalendarDate(new Date());
}

/**
 * HIGH-RISK-grade: assemble the server-derived authorization context for EVERY
 * student-absence call (spec §"High-Risk-Grade Security Enforcement" pts. 1–2,
 * NFR-008). Role + member id are decoded from the httpOnly access token — NEVER
 * from client input — and the result is CONSTRUCTOR-injected into the repository,
 * so no call site can substitute a different acting role or homeroom.
 *
 * `mockRoleHint` is the calling ROUTE's role and is used ONLY when
 * `NEXT_PUBLIC_USE_MOCK=true`, because `decodeRoleClaim` then returns a synthetic
 * "admin" for any token (`jwt.ts`) — without the hint, local dev would deny every
 * teacher record/edit and every principal flag. In real mode the token claim wins
 * and the hint is ignored entirely (proved by
 * `resolve-student-absence-auth-context.test.ts`).
 *
 * `claimHomeroomClassId` is `null` in real mode on purpose: no homeroom claim
 * exists on today's IAM token and no class-assignment lookup is reachable, so the
 * resolver fails CLOSED (`classId: ""`), which the repository treats as "owns no
 * class" for every record/edit check.
 */
export async function makeStudentAbsenceAuthContext(
  mockRoleHint: StudentAbsenceRoleHint,
): Promise<StudentAbsenceAuthContext> {
  const token = (await getAccessToken()) ?? "";
  return resolveStudentAbsenceAuthContext({
    claimRole: decodeRoleClaim(token),
    claimMemberId: decodeSubClaim(token),
    claimHomeroomClassId: null,
    useMock: USE_MOCK,
    mockRoleHint,
    mockMemberId:
      mockRoleHint === "teacher"
        ? SA_TEACHER_MEMBER_ID
        : SA_PRINCIPAL_MEMBER_ID,
    mockClassId: SA_TEACHER_CLASS_ID,
  });
}

export async function makeStudentAbsenceRepository(
  authCtx: StudentAbsenceAuthContext,
): Promise<IStudentAbsenceRepository> {
  return makeRepo(authCtx);
}

// --- Use-case factories (INT-001..004) --------------------------------------

export async function makeListStudentAbsencesUseCase(
  authCtx: StudentAbsenceAuthContext,
) {
  return new ListStudentAbsencesUseCase(await makeRepo(authCtx));
}

export async function makeRecordStudentAbsenceUseCase(
  authCtx: StudentAbsenceAuthContext,
) {
  return new RecordStudentAbsenceUseCase(
    await makeRepo(authCtx),
    absenceToday(),
  );
}

export async function makeEditStudentAbsenceUseCase(
  authCtx: StudentAbsenceAuthContext,
) {
  return new EditStudentAbsenceUseCase(await makeRepo(authCtx));
}

export async function makeFlagStudentAbsenceUseCase(
  authCtx: StudentAbsenceAuthContext,
) {
  return new FlagStudentAbsenceUseCase(await makeRepo(authCtx));
}
