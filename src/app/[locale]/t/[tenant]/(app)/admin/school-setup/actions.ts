"use server";
import { makeSchoolConfigRepository } from "@/bootstrap/di/admin-school-setup.di";
import type { GradePublishMode } from "@/features/admin-school-setup/domain/entities/school-config.entity";

export async function saveGradeLevelRangeAction(range: {
  minGrade: number;
  maxGrade: number;
}) {
  const repo = await makeSchoolConfigRepository();
  const result = await repo.saveGradeLevelRange(range);
  if (!result.ok) return { ok: false as const, errorKey: result.error.type };
  return { ok: true as const };
}

export async function saveOperationalSettingsAction(mode: GradePublishMode) {
  const repo = await makeSchoolConfigRepository();
  const result = await repo.saveOperationalSettings({ gradePublishMode: mode });
  if (!result.ok) return { ok: false as const, errorKey: result.error.type };
  return { ok: true as const };
}
