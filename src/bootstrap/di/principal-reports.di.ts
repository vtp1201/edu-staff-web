import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IPrincipalReportsRepository } from "@/features/principal/domain/reports/repositories/i-principal-reports.repository";
import { GenerateReportUseCase } from "@/features/principal/domain/reports/use-cases/generate-report.use-case";
import { GetAttendanceTrendUseCase } from "@/features/principal/domain/reports/use-cases/get-attendance-trend.use-case";
import { GetPeriodicReportsUseCase } from "@/features/principal/domain/reports/use-cases/get-periodic-reports.use-case";
import { GetReportsSummaryUseCase } from "@/features/principal/domain/reports/use-cases/get-reports-summary.use-case";
import { GetSubjectAveragesUseCase } from "@/features/principal/domain/reports/use-cases/get-subject-averages.use-case";
import { MockPrincipalReportsRepository } from "@/features/principal/infrastructure/reports/repositories/mocks/mock-principal-reports.repository";
import { PrincipalReportsRepository } from "@/features/principal/infrastructure/reports/repositories/principal-reports.repository";

async function makeRepo(): Promise<IPrincipalReportsRepository> {
  if (USE_MOCK) return new MockPrincipalReportsRepository();
  return new PrincipalReportsRepository(await createServerHttpClient());
}

export async function makeGetReportsSummaryUseCase() {
  return new GetReportsSummaryUseCase(await makeRepo());
}

export async function makeGetSubjectAveragesUseCase() {
  return new GetSubjectAveragesUseCase(await makeRepo());
}

export async function makeGetAttendanceTrendUseCase() {
  return new GetAttendanceTrendUseCase(await makeRepo());
}

export async function makeGetPeriodicReportsUseCase() {
  return new GetPeriodicReportsUseCase(await makeRepo());
}

export async function makeGenerateReportUseCase() {
  return new GenerateReportUseCase(await makeRepo());
}
