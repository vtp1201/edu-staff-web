import type { OperationalSettings } from "@/features/admin-school-setup/domain/entities/school-config.entity";
import type { OperationalSettingsResponseDto } from "../dtos/operational-settings-response.dto";

export function mapOperationalSettings(
  dto: OperationalSettingsResponseDto,
): OperationalSettings {
  return {
    gradePublishMode:
      dto.gradePublishMode === "ADMIN_APPROVAL"
        ? "ADMIN_APPROVAL"
        : "SELF_PUBLISH",
  };
}
