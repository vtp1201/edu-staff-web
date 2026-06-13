import type {
  GradePublishMode,
  SchoolConfig,
  SetupStatus,
} from "../../domain/entities/school-config.entity";
import type {
  SchoolConfigResponseDto,
  SetupStatusResponseDto,
} from "../dtos/school-config-response.dto";

const KNOWN_MODES: ReadonlySet<string> = new Set<GradePublishMode>([
  "SELF_PUBLISH",
  "ADMIN_APPROVAL",
]);

function toGradePublishMode(raw: string): GradePublishMode {
  // Validate against the known union; fall back to safe default on unexpected BE value.
  return KNOWN_MODES.has(raw) ? (raw as GradePublishMode) : "ADMIN_APPROVAL";
}

export function mapSchoolConfig(dto: SchoolConfigResponseDto): SchoolConfig {
  return {
    gradeLevelRange: dto.gradeLevelRange,
    operationalSettings: {
      gradePublishMode: toGradePublishMode(
        dto.operationalSettings.gradePublishMode,
      ),
    },
    activeClassCount: dto.activeClassCount,
  };
}

export function mapSetupStatus(dto: SetupStatusResponseDto): SetupStatus {
  return { ...dto };
}
