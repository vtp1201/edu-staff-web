import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  GradePublishMode,
  OperationalSettings,
} from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AdminSettingsFailure } from "../../domain/failures/admin-settings.failure";
import type { IAdminSettingsRepository } from "../../domain/repositories/i-admin-settings.repository";

// Module-level mutable seed: persists across calls within a server process so the
// mock toggle survives a save → re-fetch round-trip during development.
const _state: { gradePublishMode: GradePublishMode } = {
  gradePublishMode: "SELF_PUBLISH",
};

export class MockAdminSettingsRepository implements IAdminSettingsRepository {
  async getOperationalSettings(): Promise<
    | { ok: true; data: OperationalSettings }
    | { ok: false; error: AdminSettingsFailure }
  > {
    await mockDelay();
    return { ok: true, data: structuredClone(_state) };
  }

  async updateOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: AdminSettingsFailure }> {
    await mockDelay();
    _state.gradePublishMode = settings.gradePublishMode;
    return { ok: true };
  }
}
