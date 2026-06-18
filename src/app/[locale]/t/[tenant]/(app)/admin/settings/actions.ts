"use server";
import { makeAdminSettingsRepository } from "@/bootstrap/di/admin-settings.di";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";

export async function updateModeAction(
  mode: GradePublishMode,
): Promise<{ ok: boolean; errorKey?: string }> {
  const repo = await makeAdminSettingsRepository();
  const result = await repo.updateOperationalSettings({
    gradePublishMode: mode,
  });
  if (!result.ok) return { ok: false, errorKey: result.error.type };
  return { ok: true };
}
