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

  it("defaults a new subject/term scheme to the TT22 preset", async () => {
    const result = await repo.getAssessmentScheme(
      "s10-toan",
      "2024-2025",
      "HK1",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.termId).toBe("HK1");
      const sum = result.data.columns.reduce((acc, c) => acc + c.weight, 0);
      expect(sum).toBe(100);
    }
  });

  it("persists a saved assessment scheme scoped by term", async () => {
    const scheme = {
      subjectId: "s10-toan",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [
        { id: "tx", type: "TX" as const, label: "TX", count: 3, weight: 40 },
        { id: "ck", type: "CK" as const, label: "CK", count: 1, weight: 60 },
      ],
    };
    await repo.saveAssessmentScheme(scheme);
    const read = await repo.getAssessmentScheme("s10-toan", "2024-2025", "HK1");
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.data.columns).toHaveLength(2);
      expect(read.data.columns[0].count).toBe(3);
    }
  });

  it("keys schemes by term — HK2 does not read back HK1's saved scheme", async () => {
    await repo.saveAssessmentScheme({
      subjectId: "s10-toan",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [
        { id: "tx", type: "TX" as const, label: "TX", count: 3, weight: 40 },
        { id: "ck", type: "CK" as const, label: "CK", count: 1, weight: 60 },
      ],
    });
    const hk2 = await repo.getAssessmentScheme("s10-toan", "2024-2025", "HK2");
    expect(hk2.ok).toBe(true);
    if (hk2.ok) {
      // HK2 falls back to the TT22 preset (3 columns), not HK1's 2-column save.
      expect(hk2.data.termId).toBe("HK2");
      expect(hk2.data.columns).toHaveLength(3);
    }
  });
});
