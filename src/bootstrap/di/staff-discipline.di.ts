import "server-only";

import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { decodeRoleClaim, decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { StaffDisciplineAuthContext } from "@/features/staff-discipline/domain/entities/staff-discipline-auth-context.entity";
import type { IStaffDisciplineRepository } from "@/features/staff-discipline/domain/repositories/i-staff-discipline.repository";
import { ApproveStaffConductNoteUseCase } from "@/features/staff-discipline/domain/use-cases/approve-staff-conduct-note.use-case";
import { ApproveStaffViolationUseCase } from "@/features/staff-discipline/domain/use-cases/approve-staff-violation.use-case";
import { CreateStaffViolationUseCase } from "@/features/staff-discipline/domain/use-cases/create-staff-violation.use-case";
import { ListStaffConductNotesUseCase } from "@/features/staff-discipline/domain/use-cases/list-staff-conduct-notes.use-case";
import { ListStaffViolationsUseCase } from "@/features/staff-discipline/domain/use-cases/list-staff-violations.use-case";
import { RejectStaffConductNoteUseCase } from "@/features/staff-discipline/domain/use-cases/reject-staff-conduct-note.use-case";
import { RejectStaffViolationUseCase } from "@/features/staff-discipline/domain/use-cases/reject-staff-violation.use-case";
import { resolveStaffDisciplineAuthContext } from "@/features/staff-discipline/domain/use-cases/resolve-staff-discipline-auth-context";
import { SetStaffConductNoteUseCase } from "@/features/staff-discipline/domain/use-cases/set-staff-conduct-note.use-case";
import { SubmitStaffConductNoteUseCase } from "@/features/staff-discipline/domain/use-cases/submit-staff-conduct-note.use-case";
import { SubmitStaffViolationUseCase } from "@/features/staff-discipline/domain/use-cases/submit-staff-violation.use-case";
import {
  SD_CURRENT_ADMIN_ID,
  SD_SELF_STAFF_ID,
} from "@/features/staff-discipline/infrastructure/repositories/mocks/fixtures";
import { MockStaffDisciplineRepository } from "@/features/staff-discipline/infrastructure/repositories/mocks/staff-discipline.mock.repository";

/**
 * Staff-discipline repository factory (per-request, US-E09.5).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** — same shape and same
 * class of justification as `discipline.di.ts` (US-E18.14) and
 * `staff-leave.di.ts` (US-E18.8). All 10 `core` conduct endpoints for the staff
 * track ARE shipped and ground-truthed BE-side (spec.md §6), but the web client
 * cannot reach them because of the **roster-UUID gap**: no live staff-roster
 * search endpoint resolves `staffMemberId` → display name/department, and
 * neither `StaffViolationResponse` nor `StaffConductNoteResponse` carries
 * `staffName`/`department` on the wire (cross-repo asks #9/#15/#22, spec.md §8
 * constraints). Every authoring form's staff-member field and every list row's
 * identity therefore depend on the fixed mock roster (FR-009/FR-013), which
 * makes a real repository unreachable today — so no real class exists here at
 * all. Forcing mock guards against the day the app-wide `USE_MOCK` flag flips to
 * `false` and would otherwise silently break both staff-discipline routes.
 */
async function makeRepo(): Promise<IStaffDisciplineRepository> {
  return new MockStaffDisciplineRepository();
}

export async function makeStaffDisciplineRepository(): Promise<IStaffDisciplineRepository> {
  return makeRepo();
}

/**
 * HIGH-RISK-grade: assemble the server-derived authorization context for EVERY
 * staff-discipline call (spec §"High-Risk-Grade Security Enforcement" pts. 1–3,
 * NFR-008). Role + member id are decoded from the httpOnly access token —
 * NEVER from client input.
 *
 * `mockRoleHint` is the calling ROUTE's role and is used ONLY when
 * `NEXT_PUBLIC_USE_MOCK=true`, because `decodeRoleClaim` then returns a
 * synthetic "admin" for any token (jwt.ts) — without the hint, local dev would
 * deny every principal mutation and would also break the teacher self-view. In
 * real mode the token claim wins and the hint is ignored entirely (proved by
 * `resolve-staff-discipline-auth-context.test.ts`).
 */
export async function makeStaffDisciplineAuthContext(
  mockRoleHint: "principal" | "teacher",
): Promise<StaffDisciplineAuthContext> {
  const token = (await getAccessToken()) ?? "";
  return resolveStaffDisciplineAuthContext({
    claimRole: decodeRoleClaim(token),
    claimMemberId: decodeSubClaim(token),
    useMock: USE_MOCK,
    mockRoleHint,
    mockMemberId: SD_CURRENT_ADMIN_ID,
    mockStaffMemberId: SD_SELF_STAFF_ID,
  });
}

// --- Violations (INT-001..INT-004) ------------------------------------------

export async function makeListStaffViolationsUseCase() {
  return new ListStaffViolationsUseCase(await makeRepo());
}

export async function makeCreateStaffViolationUseCase() {
  return new CreateStaffViolationUseCase(await makeRepo());
}

export async function makeSubmitStaffViolationUseCase() {
  return new SubmitStaffViolationUseCase(await makeRepo());
}

export async function makeApproveStaffViolationUseCase() {
  return new ApproveStaffViolationUseCase(await makeRepo());
}

export async function makeRejectStaffViolationUseCase() {
  return new RejectStaffViolationUseCase(await makeRepo());
}

// --- Conduct notes (INT-005..INT-008) ---------------------------------------

export async function makeListStaffConductNotesUseCase() {
  return new ListStaffConductNotesUseCase(await makeRepo());
}

export async function makeSetStaffConductNoteUseCase() {
  return new SetStaffConductNoteUseCase(await makeRepo());
}

export async function makeSubmitStaffConductNoteUseCase() {
  return new SubmitStaffConductNoteUseCase(await makeRepo());
}

export async function makeApproveStaffConductNoteUseCase() {
  return new ApproveStaffConductNoteUseCase(await makeRepo());
}

export async function makeRejectStaffConductNoteUseCase() {
  return new RejectStaffConductNoteUseCase(await makeRepo());
}
