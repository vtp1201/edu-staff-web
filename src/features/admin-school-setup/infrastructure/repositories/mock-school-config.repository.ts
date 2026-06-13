import "server-only";
import { mockDelay } from "@/bootstrap/lib/mock";
import type {
  GradeLevelRange,
  OperationalSettings,
  SchoolConfig,
  SetupStatus,
} from "../../domain/entities/school-config.entity";
import type { SchoolSetupFailure } from "../../domain/failures/school-setup.failure";
import type { ISchoolConfigRepository } from "../../domain/repositories/i-school-config.repository";

const _state: { config: SchoolConfig; status: SetupStatus } = {
  config: {
    gradeLevelRange: { minGrade: 10, maxGrade: 12 },
    operationalSettings: { gradePublishMode: "ADMIN_APPROVAL" },
    activeClassCount: 18,
  },
  status: {
    gradeLevels: true,
    academicCalendar: true,
    subjects: false,
    assessmentScheme: false,
    classes: false,
  },
};

export class MockSchoolConfigRepository implements ISchoolConfigRepository {
  async getConfig(): Promise<
    { ok: true; data: SchoolConfig } | { ok: false; error: SchoolSetupFailure }
  > {
    await mockDelay(200);
    return { ok: true, data: structuredClone(_state.config) };
  }

  async getSetupStatus(): Promise<
    { ok: true; data: SetupStatus } | { ok: false; error: SchoolSetupFailure }
  > {
    await mockDelay(200);
    return { ok: true, data: structuredClone(_state.status) };
  }

  async saveGradeLevelRange(
    range: GradeLevelRange,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    await mockDelay(300);
    _state.config.gradeLevelRange = range;
    _state.status.gradeLevels = true;
    return { ok: true };
  }

  async saveOperationalSettings(
    settings: OperationalSettings,
  ): Promise<{ ok: true } | { ok: false; error: SchoolSetupFailure }> {
    await mockDelay(300);
    _state.config.operationalSettings = settings;
    return { ok: true };
  }
}
