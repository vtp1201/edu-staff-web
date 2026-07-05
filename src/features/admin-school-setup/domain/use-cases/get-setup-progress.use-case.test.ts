import { describe, expect, it } from "vitest";
import type { SetupStatus } from "../entities/school-config.entity";
import {
  getSetupProgress,
  roundStepPercent,
} from "./get-setup-progress.use-case";

const allFalse: SetupStatus = {
  gradeLevels: false,
  academicCalendar: false,
  subjects: false,
  assessmentScheme: false,
  classes: false,
};
const allTrue: SetupStatus = {
  gradeLevels: true,
  academicCalendar: true,
  subjects: true,
  assessmentScheme: true,
  classes: true,
};

describe("getSetupProgress", () => {
  it("returns 0% when nothing is done", () => {
    const r = getSetupProgress(allFalse);
    expect(r.completedCount).toBe(0);
    expect(r.percentComplete).toBe(0);
    expect(r.allDone).toBe(false);
  });
  it("returns 100% when all done", () => {
    const r = getSetupProgress(allTrue);
    expect(r.percentComplete).toBe(100);
    expect(r.allDone).toBe(true);
  });
  it("returns 40% when 2 of 5 done", () => {
    const r = getSetupProgress({
      ...allFalse,
      gradeLevels: true,
      academicCalendar: true,
    });
    expect(r.completedCount).toBe(2);
    expect(r.percentComplete).toBe(40);
  });
  it("totalCount is always 5", () => {
    expect(getSetupProgress(allFalse).totalCount).toBe(5);
  });

  describe("roundedPercent (integer for aria-valuenow)", () => {
    it("is 0 when nothing done", () => {
      expect(getSetupProgress(allFalse).roundedPercent).toBe(0);
    });
    it("is 40 when 2 of 5 done", () => {
      const r = getSetupProgress({
        ...allFalse,
        gradeLevels: true,
        academicCalendar: true,
      });
      expect(r.roundedPercent).toBe(40);
    });
    it("is 100 when all done", () => {
      expect(getSetupProgress(allTrue).roundedPercent).toBe(100);
    });
    it("is always an integer", () => {
      const r = getSetupProgress({ ...allFalse, gradeLevels: true });
      expect(Number.isInteger(r.roundedPercent)).toBe(true);
    });
  });

  describe("currentStep (1-based first-incomplete counter)", () => {
    it("is 1 when nothing done", () => {
      expect(getSetupProgress(allFalse).currentStep).toBe(1);
    });
    it("is 3 when first two steps done (2 of 5)", () => {
      const r = getSetupProgress({
        ...allFalse,
        gradeLevels: true,
        academicCalendar: true,
      });
      expect(r.currentStep).toBe(3);
    });
    it("points at the first non-complete step even when completion is non-sequential", () => {
      const r = getSetupProgress({
        ...allFalse,
        gradeLevels: false,
        academicCalendar: true,
      });
      // first incomplete is gradeLevels (index 0) → current = 1
      expect(r.currentStep).toBe(1);
    });
    it("equals totalCount when all done", () => {
      const r = getSetupProgress(allTrue);
      expect(r.currentStep).toBe(r.totalCount);
    });
  });
});

describe("roundStepPercent", () => {
  it("rounds 2/5 to 40", () => {
    expect(roundStepPercent(2, 5)).toBe(40);
  });
  it("rounds 1/3 to 33 (Math.round of 33.33)", () => {
    expect(roundStepPercent(1, 3)).toBe(33);
  });
  it("rounds 2/3 to 67 (Math.round of 66.67)", () => {
    expect(roundStepPercent(2, 3)).toBe(67);
  });
  it("returns 0 for a zero or negative total (no divide-by-zero)", () => {
    expect(roundStepPercent(0, 0)).toBe(0);
  });
});
