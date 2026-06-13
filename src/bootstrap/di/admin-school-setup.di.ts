import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ISchoolConfigRepository } from "@/features/admin-school-setup/domain/repositories/i-school-config.repository";
import { MockSchoolConfigRepository } from "@/features/admin-school-setup/infrastructure/repositories/mock-school-config.repository";
import { SchoolConfigRepository } from "@/features/admin-school-setup/infrastructure/repositories/school-config.repository";

export async function makeSchoolConfigRepository(): Promise<ISchoolConfigRepository> {
  if (USE_MOCK) {
    return new MockSchoolConfigRepository();
  }
  const http = await createServerHttpClient();
  return new SchoolConfigRepository(http);
}
