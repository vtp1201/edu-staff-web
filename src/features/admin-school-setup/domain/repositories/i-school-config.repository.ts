import type {
  GradeLevelRange,
  OperationalSettings,
  SchoolConfig,
  SetupStatus,
} from "../entities/school-config.entity";
import type { SchoolSetupFailure } from "../failures/school-setup.failure";

/** Minimal school identity record (name + optional address). */
export interface SchoolBasics {
  name: string;
  address?: string;
}

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
  createSchool(
    input: SchoolBasics,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }>;
  getCurrentSchool(): Promise<
    { ok: true; data: SchoolBasics } | { ok: false; error: SchoolSetupFailure }
  >;
}
