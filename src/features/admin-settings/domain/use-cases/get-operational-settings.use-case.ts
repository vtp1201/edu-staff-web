import type { OperationalSettings } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AdminSettingsFailure } from "../failures/admin-settings.failure";
import type { IAdminSettingsRepository } from "../repositories/i-admin-settings.repository";

export type GetOperationalSettingsResult =
  | { ok: true; data: OperationalSettings }
  | { ok: false; error: AdminSettingsFailure };

export class GetOperationalSettingsUseCase {
  constructor(private readonly repo: IAdminSettingsRepository) {}

  async execute(): Promise<GetOperationalSettingsResult> {
    return this.repo.getOperationalSettings();
  }
}
