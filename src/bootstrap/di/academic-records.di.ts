import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAcademicRecordsRepository } from "@/features/academic-records/domain/repositories/i-academic-records.repository";
import type { IAcademicRecordsSealRepository } from "@/features/academic-records/domain/repositories/i-academic-records-seal.repository";
import { ConfirmUnsealUseCase } from "@/features/academic-records/domain/use-cases/confirm-unseal.use-case";
import { GetAcademicRecordUseCase } from "@/features/academic-records/domain/use-cases/get-academic-record.use-case";
import { GetSealAuditTrailUseCase } from "@/features/academic-records/domain/use-cases/get-seal-audit-trail.use-case";
import { GetSealStatusUseCase } from "@/features/academic-records/domain/use-cases/get-seal-status.use-case";
import { InitiateUnsealUseCase } from "@/features/academic-records/domain/use-cases/initiate-unseal.use-case";
import { ListAcademicYearsUseCase } from "@/features/academic-records/domain/use-cases/list-academic-years.use-case";
import { ListAvailableClassesUseCase } from "@/features/academic-records/domain/use-cases/list-available-classes.use-case";
import { ListPendingUnsealRequestsUseCase } from "@/features/academic-records/domain/use-cases/list-pending-unseal-requests.use-case";
import { ListSealedStudentsUseCase } from "@/features/academic-records/domain/use-cases/list-sealed-students.use-case";
import { ListTenantAdminsUseCase } from "@/features/academic-records/domain/use-cases/list-tenant-admins.use-case";
import { SealAcademicRecordUseCase } from "@/features/academic-records/domain/use-cases/seal-academic-record.use-case";
import { AcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/academic-records-seal.repository";
import { HybridAcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/academic-records-seal-hybrid.repository";
import { MockAcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records.mock.repository";
import { MockAcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records-seal.mock.repository";

/**
 * Read-only student/parent academic-record VIEWER repository factory
 * (per-request).
 *
 * **PERMANENTLY mock-first regardless of `USE_MOCK`** (US-E18.21, closing ADR
 * `0055` §Follow-Up's internal item) — same shape as `staff-leave.di.ts`
 * (US-E18.8), `teaching-plan.di.ts` (US-E18.9) and `feed.di.ts`/
 * `moderation.di.ts` (US-E18.20). The hold is a domain-model gap in `core`'s
 * real contract, NOT the app-wide mock toggle: the real
 * `AcademicRecordResponse` is keyed by `(classId, termId, studentMemberId)`
 * with a dynamic `gradeSnapshot` column array — no `(studentId, yearId?)`
 * lookup, no year-grouping, no fixed tx1/tx2/giuaKy/cuoiKy slots, no
 * student-identity fields (ADR 0055 §Context point 6). Remapping the viewer's
 * multi-year gradebook UI onto that shape is a `uiux`/`ba`-level model
 * redesign, not a wiring remap.
 *
 * Until then this factory must never hand out `AcademicRecordsRepository` —
 * flipping `NEXT_PUBLIC_USE_MOCK=false` app-wide would otherwise silently
 * break this screen. (That class is itself a permanent blocked stub now, see
 * its doc comment — this factory is the first of the two guards.)
 */
async function makeRepository(): Promise<IAcademicRecordsRepository> {
  return new MockAcademicRecordsRepository();
}

// US-E18.13 (ADR 0055) hybrid: `sealBatch` runs REAL; every other seal/unseal
// method (no BE listing/discovery endpoint — ask #21) delegates to the mock.
async function makeSealRepository(): Promise<IAcademicRecordsSealRepository> {
  const mock = new MockAcademicRecordsSealRepository();
  if (USE_MOCK) return mock;
  await ensureFreshSession(); // decision 0018, playbook step 6
  const real = new AcademicRecordsSealRepository(
    await createServerHttpClient(),
  );
  return new HybridAcademicRecordsSealRepository(real, mock);
}

export async function makeGetAcademicRecordUseCase(): Promise<GetAcademicRecordUseCase> {
  return new GetAcademicRecordUseCase(await makeRepository());
}

export async function makeListAcademicYearsUseCase(): Promise<ListAcademicYearsUseCase> {
  return new ListAcademicYearsUseCase(await makeRepository());
}

// ── US-E14.6 seal / unseal factories (per-request) ──────────────────────────

export async function makeListAvailableClassesUseCase(): Promise<ListAvailableClassesUseCase> {
  return new ListAvailableClassesUseCase(await makeSealRepository());
}

export async function makeGetSealStatusUseCase(): Promise<GetSealStatusUseCase> {
  return new GetSealStatusUseCase(await makeSealRepository());
}

export async function makeSealAcademicRecordUseCase(): Promise<SealAcademicRecordUseCase> {
  return new SealAcademicRecordUseCase(await makeSealRepository());
}

export async function makeGetSealAuditTrailUseCase(): Promise<GetSealAuditTrailUseCase> {
  return new GetSealAuditTrailUseCase(await makeSealRepository());
}

export async function makeListSealedStudentsUseCase(): Promise<ListSealedStudentsUseCase> {
  return new ListSealedStudentsUseCase(await makeSealRepository());
}

export async function makeListPendingUnsealRequestsUseCase(): Promise<ListPendingUnsealRequestsUseCase> {
  return new ListPendingUnsealRequestsUseCase(await makeSealRepository());
}

export async function makeInitiateUnsealUseCase(): Promise<InitiateUnsealUseCase> {
  return new InitiateUnsealUseCase(await makeSealRepository());
}

export async function makeConfirmUnsealUseCase(): Promise<ConfirmUnsealUseCase> {
  return new ConfirmUnsealUseCase(await makeSealRepository());
}

export async function makeListTenantAdminsUseCase(): Promise<ListTenantAdminsUseCase> {
  return new ListTenantAdminsUseCase(await makeSealRepository());
}
