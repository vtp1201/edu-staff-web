import "server-only";
import type { AxiosInstance } from "axios";
import { SCHOOL_SETUP_EP } from "@/bootstrap/endpoint/admin-school-setup.endpoint";
import type {
  GradeLevelRange,
  OperationalSettings,
  SchoolConfig,
  SetupStatus,
} from "../../domain/entities/school-config.entity";
import type { SchoolSetupFailure } from "../../domain/failures/school-setup.failure";
import type { ISchoolConfigRepository } from "../../domain/repositories/i-school-config.repository";
import type {
  SchoolConfigResponseDto,
  SetupStatusResponseDto,
} from "../dtos/school-config-response.dto";
import {
  mapSchoolConfig,
  mapSetupStatus,
} from "../mappers/school-config.mapper";

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
    } catch {
      return { ok: false, error: { type: "network-error" } };
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
    } catch {
      return { ok: false, error: { type: "network-error" } };
    }
  }

  async saveGradeLevelRange(
    range: GradeLevelRange,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    try {
      await this.http.put(SCHOOL_SETUP_EP.gradeLevels, range);
      return { ok: true };
    } catch {
      return { ok: false, error: { type: "network-error" } };
    }
  }

  async saveOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    try {
      await this.http.put(SCHOOL_SETUP_EP.operationalSettings, settings);
      return { ok: true };
    } catch {
      return { ok: false, error: { type: "network-error" } };
    }
  }
}
