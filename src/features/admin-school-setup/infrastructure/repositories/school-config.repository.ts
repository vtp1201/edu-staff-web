import "server-only";
import type { AxiosInstance } from "axios";
import { SCHOOL_SETUP_EP } from "@/bootstrap/endpoint/admin-school-setup.endpoint";
import { errorCodeOf } from "@/bootstrap/lib/api-envelope";
import type {
  GradeLevelRange,
  OperationalSettings,
  SchoolConfig,
  SetupStatus,
} from "../../domain/entities/school-config.entity";
import type { SchoolSetupFailure } from "../../domain/failures/school-setup.failure";
import type {
  ISchoolConfigRepository,
  SchoolBasics,
} from "../../domain/repositories/i-school-config.repository";
import type {
  SchoolConfigResponseDto,
  SetupStatusResponseDto,
} from "../dtos/school-config-response.dto";
import {
  mapSchoolConfig,
  mapSetupStatus,
} from "../mappers/school-config.mapper";

/**
 * Map a normalised {@link ApiError} (via its UPPER_SNAKE `code`) to the
 * school-setup failure union. Branch on `code`, never on the localised message.
 */
function mapSchoolFailure(err: unknown): SchoolSetupFailure {
  const code = errorCodeOf(err);
  switch (code) {
    case "SCHOOL_NOT_FOUND":
      return { type: "not-found" };
    case "SCHOOL_ALREADY_EXISTS":
      return { type: "already-exists" };
    case "SCHOOL_FORBIDDEN":
      return { type: "forbidden" };
    // Tenant claim missing/invalid on the caller's token (e.g. pre-tenant-
    // selection session reaching a protected core route) — same "no valid
    // access to this tenant's school" UX as SCHOOL_FORBIDDEN (US-E18.0 gateway
    // smoke finding: real gateway returned this code, previously fell to
    // "unknown"; core/docs/ERROR_CODES.md: `SCHOOL_INVALID_TENANT_ID`, 400).
    case "SCHOOL_INVALID_TENANT_ID":
      return { type: "forbidden" };
    case "SCHOOL_GRADE_LEVEL_RANGE_INVALID":
      return { type: "grade-level-range-invalid" };
    case "SCHOOL_GRADE_LEVEL_RANGE_NARROWING_BLOCKED":
      return { type: "narrowing-blocked" };
    case "NETWORK_ERROR":
      return { type: "network-error" };
    default:
      return { type: "unknown" };
  }
}

export class SchoolConfigRepository implements ISchoolConfigRepository {
  constructor(private readonly http: AxiosInstance) {}

  async getConfig(): Promise<
    { ok: true; data: SchoolConfig } | { ok: false; error: SchoolSetupFailure }
  > {
    try {
      const data = (await this.http.get(
        SCHOOL_SETUP_EP.config,
      )) as unknown as SchoolConfigResponseDto;
      return { ok: true, data: mapSchoolConfig(data) };
    } catch (err) {
      return { ok: false, error: mapSchoolFailure(err) };
    }
  }

  async getSetupStatus(): Promise<
    { ok: true; data: SetupStatus } | { ok: false; error: SchoolSetupFailure }
  > {
    try {
      const data = (await this.http.get(
        SCHOOL_SETUP_EP.setupStatus,
      )) as unknown as SetupStatusResponseDto;
      return { ok: true, data: mapSetupStatus(data) };
    } catch (err) {
      return { ok: false, error: mapSchoolFailure(err) };
    }
  }

  async saveGradeLevelRange(
    range: GradeLevelRange,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    try {
      await this.http.put(SCHOOL_SETUP_EP.gradeLevels, range);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapSchoolFailure(err) };
    }
  }

  async saveOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    try {
      await this.http.put(SCHOOL_SETUP_EP.operationalSettings, settings);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapSchoolFailure(err) };
    }
  }

  async createSchool(
    input: SchoolBasics,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    try {
      await this.http.post(SCHOOL_SETUP_EP.schools, input);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: mapSchoolFailure(err) };
    }
  }

  async getCurrentSchool(): Promise<
    { ok: true; data: SchoolBasics } | { ok: false; error: SchoolSetupFailure }
  > {
    try {
      const data = (await this.http.get(
        SCHOOL_SETUP_EP.currentSchool,
      )) as unknown as SchoolBasics;
      return { ok: true, data: { name: data.name, address: data.address } };
    } catch (err) {
      return { ok: false, error: mapSchoolFailure(err) };
    }
  }
}
