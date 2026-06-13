import type {
  GradeLevelRange,
  OperationalSettings,
  SchoolConfig,
  SetupStatus,
} from "../entities/school-config.entity";
import type { SchoolSetupFailure } from "../failures/school-setup.failure";

export interface ISchoolConfigRepository {
  getConfig(): Promise<
    { ok: true; data: SchoolConfig } | { ok: false; error: SchoolSetupFailure }
  >;
  getSetupStatus(): Promise<
    { ok: true; data: SetupStatus } | { ok: false; error: SchoolSetupFailure }
  >;
  saveGradeLevelRange(
    range: GradeLevelRange,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }>;
  saveOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }>;
}
