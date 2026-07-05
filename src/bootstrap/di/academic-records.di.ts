import "server-only";
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
import { AcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/academic-records.repository";
import { AcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/academic-records-seal.repository";
import { MockAcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records.mock.repository";
import { MockAcademicRecordsSealRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records-seal.mock.repository";

async function makeRepository(): Promise<IAcademicRecordsRepository> {
  if (USE_MOCK) return new MockAcademicRecordsRepository();
  return new AcademicRecordsRepository(await createServerHttpClient());
}

async function makeSealRepository(): Promise<IAcademicRecordsSealRepository> {
  if (USE_MOCK) return new MockAcademicRecordsSealRepository();
  return new AcademicRecordsSealRepository(await createServerHttpClient());
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
