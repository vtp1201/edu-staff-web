import type { OperationalSettings } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AdminSettingsFailure } from "../failures/admin-settings.failure";
import type { IAdminSettingsRepository } from "../repositories/i-admin-settings.repository";

export type UpdateOperationalSettingsResult =
  | { ok: true }
  | { ok: false; error: AdminSettingsFailure };

export class UpdateOperationalSettingsUseCase {
  constructor(private readonly repo: IAdminSettingsRepository) {}

  async execute(
    settings: OperationalSettings,
  ): Promise<UpdateOperationalSettingsResult> {
    // Validate: gradePublishMode must be SELF_PUBLISH or ADMIN_APPROVAL.
    if (
      settings.gradePublishMode !== "SELF_PUBLISH" &&
      settings.gradePublishMode !== "ADMIN_APPROVAL"
    ) {
      return { ok: false, error: { type: "unknown" } };
    }
    return this.repo.updateOperationalSettings(settings);
  }
}
