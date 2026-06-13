import { describe, expect, it } from "vitest";
import type { SetupStatus } from "../entities/school-config.entity";
import { getSetupProgress } from "./get-setup-progress.use-case";

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
});
