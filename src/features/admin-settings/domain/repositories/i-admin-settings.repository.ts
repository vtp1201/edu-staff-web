import type { OperationalSettings } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AdminSettingsFailure } from "../failures/admin-settings.failure";

export interface IAdminSettingsRepository {
  getOperationalSettings(): Promise<
    | { ok: true; data: OperationalSettings }
    | { ok: false; error: AdminSettingsFailure }
  >;
  updateOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: AdminSettingsFailure }>;
}
