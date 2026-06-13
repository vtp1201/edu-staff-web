import type { SetupStatus } from "../entities/school-config.entity";

export interface SetupProgress {
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  allDone: boolean;
}

export function getSetupProgress(status: SetupStatus): SetupProgress {
  const steps = [
    status.gradeLevels,
    status.academicCalendar,
    status.subjects,
    status.assessmentScheme,
    status.classes,
  ];
  const completedCount = steps.filter(Boolean).length;
  const totalCount = steps.length;
  return {
    completedCount,
    totalCount,
    percentComplete: (completedCount / totalCount) * 100,
    allDone: completedCount === totalCount,
  };
}
