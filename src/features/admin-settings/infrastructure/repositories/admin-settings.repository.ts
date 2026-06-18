import "server-only";
import type { AxiosInstance } from "axios";
import { SCHOOL_SETUP_EP } from "@/bootstrap/endpoint/admin-school-setup.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type { OperationalSettings } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { AdminSettingsFailure } from "../../domain/failures/admin-settings.failure";
import type { IAdminSettingsRepository } from "../../domain/repositories/i-admin-settings.repository";
import type { OperationalSettingsResponseDto } from "../dtos/operational-settings-response.dto";
import { mapOperationalSettings } from "../mappers/operational-settings.mapper";

/**
 * Map a normalised {@link ApiError} (via its UPPER_SNAKE `code`) to the
 * admin-settings failure union. Branch on `code`, never on the localised message.
 */
function mapFailure(err: unknown): AdminSettingsFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "SCHOOL_NOT_FOUND":
      return { type: "not-found" };
    case "SCHOOL_FORBIDDEN":
      return { type: "forbidden" };
    case "NETWORK_ERROR":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}

export class AdminSettingsRepository implements IAdminSettingsRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getOperationalSettings(): Promise<
    | { ok: true; data: OperationalSettings }
    | { ok: false; error: AdminSettingsFailure }
  > {
    try {
      const data = (await this.http.get(
        SCHOOL_SETUP_EP.operationalSettings,
      )) as unknown as OperationalSettingsResponseDto;
      return { ok: true, data: mapOperationalSettings(data) };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }

  async updateOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: AdminSettingsFailure }> {
    try {
      await this.http.put(SCHOOL_SETUP_EP.operationalSettings, {
        gradePublishMode: settings.gradePublishMode,
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapFailure(err) };
    }
  }
}
