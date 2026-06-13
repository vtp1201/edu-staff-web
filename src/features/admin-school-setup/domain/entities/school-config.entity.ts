export type GradePublishMode = "SELF_PUBLISH" | "ADMIN_APPROVAL";

export interface GradeLevelRange {
  minGrade: number;
  maxGrade: number;
}

export interface OperationalSettings {
  gradePublishMode: GradePublishMode;
}

export interface SchoolConfig {
  gradeLevelRange: GradeLevelRange | null;
  operationalSettings: OperationalSettings;
  activeClassCount: number;
}

export interface SetupStatus {
  gradeLevels: boolean;
  academicCalendar: boolean;
  subjects: boolean;
  assessmentScheme: boolean;
  classes: boolean;
}

export const GRADE_LEVEL_PRESETS = [
  { id: "primary", min: 1, max: 5, labelKey: "presetPrimary" },
  { id: "secondary", min: 6, max: 9, labelKey: "presetSecondary" },
  { id: "highschool", min: 10, max: 12, labelKey: "presetHighSchool" },
  { id: "k12", min: 1, max: 12, labelKey: "presetK12" },
] as const;
