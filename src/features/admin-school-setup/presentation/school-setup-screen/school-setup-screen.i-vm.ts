import type {
  GradePublishMode,
  SchoolConfig,
  SetupStatus,
} from "../../domain/entities/school-config.entity";
import type { GradeRangeValidationError } from "../../domain/use-cases/validate-grade-range.use-case";

export interface GradeLevelRangeFormVm {
  minGrade: string;
  maxGrade: string;
  error: GradeRangeValidationError | null;
  saving: boolean;
  saved: boolean;
  showNarrowingWarning: boolean;
}

export interface OperationalSettingsFormVm {
  selectedMode: GradePublishMode;
  saving: boolean;
  saved: boolean;
}

export interface OnboardingGuideVm {
  steps: Array<{
    key: keyof SetupStatus;
    labelKey: string;
    iconName: string;
    done: boolean;
    targetHref: string;
  }>;
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  allDone: boolean;
  guideOpen: boolean;
  showOnboarding: boolean;
}

export interface SchoolSetupScreenVm {
  config: SchoolConfig | null;
  setupStatus: SetupStatus | null;
  loading: boolean;
  error: string | null;
  gradeForm: GradeLevelRangeFormVm;
  modeForm: OperationalSettingsFormVm;
  guide: OnboardingGuideVm;
}
