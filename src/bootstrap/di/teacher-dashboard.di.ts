import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import { GetTeacherDashboardUseCase } from "@/features/teacher/domain/use-cases/get-teacher-dashboard.use-case";
import { MockTeacherDashboardRepository } from "@/features/teacher/infrastructure/repositories/mock-teacher-dashboard.repository";
import { TeacherDashboardRepository } from "@/features/teacher/infrastructure/repositories/teacher-dashboard.repository";

export async function makeGetTeacherDashboardUseCase() {
  const repo = USE_MOCK
    ? new MockTeacherDashboardRepository()
    : new TeacherDashboardRepository(await createServerHttpClient());
  return new GetTeacherDashboardUseCase(repo);
}
