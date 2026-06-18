import { beforeEach, describe, expect, it } from "vitest";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import { MockAssessmentSchemeRepository } from "./mock-assessment-scheme.repository";

describe("MockAssessmentSchemeRepository", () => {
  let repo: MockAssessmentSchemeRepository;

  beforeEach(() => {
    repo = new MockAssessmentSchemeRepository();
  });

  it("returns a default grade scale", async () => {
    const result = await repo.getGradeScale();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bands.length).toBeGreaterThan(0);
    }
  });

  it("persists a saved grade scale across reads", async () => {
    const next = GRADE_SCALE_PRESETS.SCALE_4;
    const saveResult = await repo.saveGradeScale(next);
    expect(saveResult.ok).toBe(true);

    const read = await repo.getGradeScale();
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.data.type).toBe("SCALE_4");
    }
  });

  it("lists subjects for known grade levels", async () => {
    const result = await repo.listSubjectsForGrade(10);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.length).toBe(5);
      expect(result.data.every((s) => s.gradeLevel === 10)).toBe(true);
    }
  });

  it("returns an empty list for an unknown grade level", async () => {
    const result = await repo.listSubjectsForGrade(99);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });

  it("defaults a new subject scheme to the TT22 preset", async () => {
    const result = await repo.getAssessmentScheme("s10-toan", "2024-2025");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const sum = result.data.columns.reduce((acc, c) => acc + c.weight, 0);
      expect(sum).toBe(100);
    }
  });

  it("persists a saved assessment scheme", async () => {
    const scheme = {
      subjectId: "s10-toan",
      yearLabel: "2024-2025",
      columns: [
        { id: "tx", type: "TX" as const, label: "TX", count: 3, weight: 40 },
        { id: "ck", type: "CK" as const, label: "CK", count: 1, weight: 60 },
      ],
    };
    await repo.saveAssessmentScheme(scheme);
    const read = await repo.getAssessmentScheme("s10-toan", "2024-2025");
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.data.columns).toHaveLength(2);
      expect(read.data.columns[0].count).toBe(3);
    }
  });
});
