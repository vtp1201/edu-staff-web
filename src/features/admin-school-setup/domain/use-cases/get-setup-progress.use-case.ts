import type { SetupStatus } from "../entities/school-config.entity";

export interface SetupProgress {
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  /** Math.round of percentComplete — always an integer (for aria-valuenow). */
  roundedPercent: number;
  /**
   * 1-based counter for "BƯỚC N/M": index of the first non-complete step + 1.
   * If all steps are complete, equals totalCount.
   */
  currentStep: number;
  allDone: boolean;
}

/** Pure integer percentage helper (guards divide-by-zero). */
export function roundStepPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
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
  const firstIncomplete = steps.findIndex((done) => !done);
  const currentStep = firstIncomplete === -1 ? totalCount : firstIncomplete + 1;
  return {
    completedCount,
    totalCount,
    percentComplete: (completedCount / totalCount) * 100,
    roundedPercent: roundStepPercent(completedCount, totalCount),
    currentStep,
    allDone: completedCount === totalCount,
  };
}
