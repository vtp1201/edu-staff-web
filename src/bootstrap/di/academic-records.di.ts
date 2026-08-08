import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { makeBatchResolveMembersUseCase } from "@/bootstrap/di/iam-directory.di";
import { makeSubjectCatalogueRepository } from "@/bootstrap/di/subject-catalogue.di";
import { getAccessToken } from "@/bootstrap/lib/auth-token.server";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { decodeSubClaim } from "@/bootstrap/lib/jwt";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAcademicRecordsRepository } from "@/features/academic-records/domain/repositories/i-academic-records.repository";
import type { IAcademicRecordsSealRepository } from "@/features/academic-records/domain/repositories/i-academic-records-seal.repository";
import { ConfirmUnsealUseCase } from "@/features/academic-records/domain/use-cases/confirm-unseal.use-case";
import { GetAcademicRecordUseCase } from "@/features/academic-records/domain/use-cases/get-academic-record.use-case";
import { GetSealAuditTrailUseCase } from "@/features/academic-records/domain/use-cases/get-seal-audit-trail.use-case";
import { GetSealStatusUseCase } from "@/features/academic-records/domain/use-cases/get-seal-status.use-case";
import { InitiateUnsealUseCase } from "@/features/academic-records/domain/use-cases/initiate-unseal.use-case";
import { ListAvailableClassesUseCase } from "@/features/academic-records/domain/use-cases/list-available-classes.use-case";
import { ListPendingUnsealRequestsUseCase } from "@/features/academic-records/domain/use-cases/list-pending-unseal-requests.use-case";
import { ListSealedStudentsUseCase } from "@/features/academic-records/domain/use-cases/list-sealed-students.use-case";
import { ListTenantAdminsUseCase } from "@/features/academic-records/domain/use-cases/list-tenant-admins.use-case";
import { SealAcademicRecordUseCase } from "@/features/academic-records/domain/use-cases/seal-academic-record.use-case";
import { AcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/academic-records.repository";
import { AcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/academic-records-seal.repository";
import { HybridAcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/academic-records-seal-hybrid.repository";
import { MockAcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records.mock.repository";
import { MockAcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records-seal.mock.repository";

/**
 * Read-only student/parent academic-record VIEWER repository factory
 * (per-request). **US-E18.54 removed the permanent mock-force** this factory
 * carried since US-E18.21 (ADR 0055 §Context #6): the standard
 * `USE_MOCK ? Mock : Real` gate is back.
 *
 * What changed is the MODEL, not a path. BE's 2026-08-07 answer confirmed the
 * aggregate stays `(classId, termId, studentMemberId)` FOREVER — but pointed at
 * `GET /members/{memberId}/academic-records` (BE US-064), which was already
 * shipped and simply never consumed. The viewer's year dimension is grouped
 * CLIENT-SIDE (`buildAcademicRecord`) off the row's own `academicYear`, which
 * BE denormalized in US-E18.56 (ask #47 / migration 051). That REMOVED the
 * `classId → academicYearLabel` enrollment point-read this factory used to
 * compose — the join that could never resolve for a PARENT (no class-context
 * read in `core` admits that role) and cost one extra call per distinct class.
 *
 * ONE collaborator is still composed here (decision 0017 — cross-aggregate
 * joins belong in `bootstrap/di`, never inside a repository), FAIL-SOFT so a
 * decoration failure can never take the record read down with it: `subjectId →
 * name` via the subject catalogue (`GET /subjects`, readable by any
 * authenticated member). Without it the table's subject column would have to
 * show a uuid — it shows an i18n placeholder instead.
 */
async function makeRepository(): Promise<IAcademicRecordsRepository> {
  if (USE_MOCK) return new MockAcademicRecordsRepository();
  // Proactive refresh (decision 0018, playbook step 6).
  await ensureFreshSession();
  const http = await createServerHttpClient();
  const subjects = await makeSubjectCatalogueRepository();
  const resolveSubjectNames = async () => {
    const names = new Map<string, string>();
    const result = await subjects.listAllSubjects();
    if (result.ok) for (const s of result.value) names.set(s.id, s.name);
    return names;
  };
  return new AcademicRecordsRepository(http, resolveSubjectNames);
}

/**
 * The signed-in caller's own memberId, from the access-token `sub` claim — the
 * student self-view's `memberId`, which the client must never supply. Mirrors
 * `grades.di.ts`'s `resolveCurrentMemberId`.
 */
export async function resolveCurrentMemberId(): Promise<string | null> {
  const token = await getAccessToken();
  return token ? decodeSubClaim(token) : null;
}

/**
 * US-E18.13 + US-E18.24 + US-E18.43 hybrid: SIX methods run REAL (`sealBatch`,
 * `getSealStatus`, `getPendingUnsealRequests`, `initiateUnseal`,
 * `confirmUnseal` — BE US-150 shipped the listing endpoint ADR `0055` said was
 * missing — plus `listSealedStudents`, BE US-183). The remaining three
 * (`listAvailableClasses`, `getSealAuditTrail`, `listTenantAdmins`) delegate to
 * the mock: no BE endpoint exists for the first two (and `getSealAuditTrail`
 * never will — `core` stores only the latest seal cycle plus a reseal counter, so
 * there is no multi-cycle seal event log), and IAM cannot answer the third
 * accurately (`MemberListItem.roles` has no `SUPER_ADMIN`, so an ADMIN-only
 * listing would under-count real approvers on a legal compliance gate).
 *
 * Unseal-request AND sealed-student display names are resolved by COMPOSING
 * `iam-directory`'s `BatchResolveMembersUseCase` (IAM US-144, wired in
 * US-E18.23) — ONE batch call per listing page, chunked at 50 ids inside that
 * module. The same injected resolver serves both real listings. `bootstrap/di`,
 * not a feature's domain, is where composing across features belongs (decision
 * 0017, same precedent as `staffing.di.ts`). The mock branch never reaches it:
 * its fixtures already carry inline names.
 */
async function makeSealRepository(): Promise<IAcademicRecordsSealRepository> {
  const mock = new MockAcademicRecordsSealRepository();
  if (USE_MOCK) return mock;
  await ensureFreshSession(); // decision 0018, playbook step 6
  const resolveMembers = await makeBatchResolveMembersUseCase();
  const real = new AcademicRecordsSealRepository(
    await createServerHttpClient(),
    (memberIds) => resolveMembers.execute(memberIds),
  );
  return new HybridAcademicRecordsSealRepository(real, mock);
}

export async function makeGetAcademicRecordUseCase(): Promise<GetAcademicRecordUseCase> {
  return new GetAcademicRecordUseCase(await makeRepository());
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
