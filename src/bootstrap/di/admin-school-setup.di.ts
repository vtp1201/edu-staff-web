import "server-only";
import { ensureFreshSession } from "@/bootstrap/di/auth.di";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { ISchoolConfigRepository } from "@/features/admin-school-setup/domain/repositories/i-school-config.repository";
import { MockSchoolConfigRepository } from "@/features/admin-school-setup/infrastructure/repositories/mock-school-config.repository";
import { SchoolConfigRepository } from "@/features/admin-school-setup/infrastructure/repositories/school-config.repository";

export async function makeSchoolConfigRepository(): Promise<ISchoolConfigRepository> {
  if (USE_MOCK) {
    return new MockSchoolConfigRepository();
  }
  // Proactive refresh (decision 0018) — rotate the access token server-side
  // BEFORE the protected core call if it's about to expire, avoiding a wasted
  // 401. US-E18.0 gateway smoke found this was documented but never actually
  // called by any protected feature's DI factory; wiring it here proves the
  // pattern for this cluster. Every other real (non-mock) DI factory should
  // add the same call — see EPIC-OVERVIEW.md playbook step 6.
  await ensureFreshSession();
  const http = await createServerHttpClient();
  return new SchoolConfigRepository(http);
}
