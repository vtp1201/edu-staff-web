import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAcademicRecordsRepository } from "@/features/academic-records/domain/repositories/i-academic-records.repository";
import { GetAcademicRecordUseCase } from "@/features/academic-records/domain/use-cases/get-academic-record.use-case";
import { ListAcademicYearsUseCase } from "@/features/academic-records/domain/use-cases/list-academic-years.use-case";
import { AcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/academic-records.repository";
import { MockAcademicRecordsRepository } from "@/features/academic-records/infrastructure/repositories/mocks/academic-records.mock.repository";

async function makeRepository(): Promise<IAcademicRecordsRepository> {
  if (USE_MOCK) return new MockAcademicRecordsRepository();
  return new AcademicRecordsRepository(await createServerHttpClient());
}

export async function makeGetAcademicRecordUseCase(): Promise<GetAcademicRecordUseCase> {
  return new GetAcademicRecordUseCase(await makeRepository());
}

export async function makeListAcademicYearsUseCase(): Promise<ListAcademicYearsUseCase> {
  return new ListAcademicYearsUseCase(await makeRepository());
}
