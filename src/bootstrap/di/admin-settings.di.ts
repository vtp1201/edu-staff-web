import "server-only";
import { createServerHttpClient } from "@/bootstrap/lib/http.server";
import { USE_MOCK } from "@/bootstrap/lib/mock";
import type { IAdminSettingsRepository } from "@/features/admin-settings/domain/repositories/i-admin-settings.repository";
import { AdminSettingsRepository } from "@/features/admin-settings/infrastructure/repositories/admin-settings.repository";
import { MockAdminSettingsRepository } from "@/features/admin-settings/infrastructure/repositories/mock-admin-settings.repository";

export async function makeAdminSettingsRepository(): Promise<IAdminSettingsRepository> {
  if (USE_MOCK) {
    return new MockAdminSettingsRepository();
  }
  const http = await createServerHttpClient();
  return new AdminSettingsRepository(http);
}
