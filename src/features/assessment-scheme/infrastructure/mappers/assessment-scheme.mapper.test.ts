import { describe, expect, it } from "vitest";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import type {
  AssessmentSchemeResponseDto,
  GradeScaleResponseDto,
  SubjectForGradeDto,
} from "../dtos/assessment-scheme-response.dto";
import {
  mapAssessmentScheme,
  mapGradeScale,
  mapSubjectForGrade,
  toSetAssessmentSchemeRequestDto,
  toSetGradeScaleRequestDto,
} from "./assessment-scheme.mapper";

describe("assessment-scheme mapper — grade scale", () => {
  it("maps HE_10 response → SCALE_10 entity, maxScore from wire string", () => {
    const dto: GradeScaleResponseDto = {
      tenantId: "t1",
      scaleType: "HE_10",
      minValue: "0",
      maxValue: "10.0",
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    };
    const scale = mapGradeScale(dto);
    expect(scale.type).toBe("SCALE_10");
    expect(scale.maxScore).toBe(10);
    expect(scale.effectiveFrom).toBe("2024-09-01T00:00:00.000Z");
    // HE_10 carries no wire bands → falls back to the preset bands.
    expect(scale.bands).toEqual(GRADE_SCALE_PRESETS.SCALE_10.bands);
  });

  it("maps HE_4_GPA → SCALE_4 and falls back to preset maxScore when maxValue missing/NaN", () => {
    const dto: GradeScaleResponseDto = {
      tenantId: "t1",
      scaleType: "HE_4_GPA",
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    };
    const scale = mapGradeScale(dto);
    expect(scale.type).toBe("SCALE_4");
    expect(scale.maxScore).toBe(4);
    expect(scale.bands).toEqual(GRADE_SCALE_PRESETS.SCALE_4.bands);
  });

  it("derives bands from real letterGrades for LETTER_ABCD (rank → colorToken)", () => {
    const dto: GradeScaleResponseDto = {
      tenantId: "t1",
      scaleType: "LETTER_ABCD",
      maxValue: "100",
      letterGrades: [
        // deliberately unsorted to prove the mapper sorts desc by minScore
        { letter: "C", minScore: "70", maxScore: "79.9" },
        { letter: "A", minScore: "90", maxScore: "100" },
        { letter: "F", minScore: "0", maxScore: "59.9" },
        { letter: "B", minScore: "80", maxScore: "89.9" },
        { letter: "D", minScore: "60", maxScore: "69.9" },
      ],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    };
    const scale = mapGradeScale(dto);
    expect(scale.type).toBe("LETTER");
    expect(scale.bands.map((b) => b.label)).toEqual(["A", "B", "C", "D", "F"]);
    expect(scale.bands.map((b) => b.minThreshold)).toEqual([90, 80, 70, 60, 0]);
    expect(scale.bands.map((b) => b.colorToken)).toEqual([
      "success", // rank 0
      "primary", // rank 1
      "warning", // middle
      "warning", // middle
      "error", // last
    ]);
  });

  it("LETTER_ABCD with empty letterGrades falls back to LETTER preset bands", () => {
    const dto: GradeScaleResponseDto = {
      tenantId: "t1",
      scaleType: "LETTER_ABCD",
      letterGrades: [],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    };
    const scale = mapGradeScale(dto);
    expect(scale.type).toBe("LETTER");
    expect(scale.bands).toEqual(GRADE_SCALE_PRESETS.LETTER.bands);
  });

  it("assigns error to the last band and success to the first for a 2-band letter scale", () => {
    const dto: GradeScaleResponseDto = {
      tenantId: "t1",
      scaleType: "LETTER_ABCD",
      maxValue: "100",
      letterGrades: [
        { letter: "P", minScore: "50", maxScore: "100" },
        { letter: "F", minScore: "0", maxScore: "49.9" },
      ],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    };
    const scale = mapGradeScale(dto);
    expect(scale.bands.map((b) => b.colorToken)).toEqual(["success", "error"]);
  });

  it("round-trips scaleType both directions and encodes minValue/maxValue on write", () => {
    const req = toSetGradeScaleRequestDto(GRADE_SCALE_PRESETS.SCALE_10);
    expect(req.scaleType).toBe("HE_10");
    expect(req.minValue).toBe("0");
    expect(req.maxValue).toBe("10");
    expect(req.effectiveFrom).toBe(GRADE_SCALE_PRESETS.SCALE_10.effectiveFrom);
    // numeric scales omit letterGrades entirely
    expect(req.letterGrades).toBeUndefined();
  });

  it("populates letterGrades only for LETTER type, derived from bands", () => {
    const req = toSetGradeScaleRequestDto(GRADE_SCALE_PRESETS.LETTER);
    expect(req.scaleType).toBe("LETTER_ABCD");
    expect(req.letterGrades).toBeDefined();
    const grades = req.letterGrades ?? [];
    expect(grades.map((g) => g.letter)).toEqual(["A", "B", "C", "D", "F"]);
    // top band max = scale.maxScore; each lower band max = higher band min - 0.1
    expect(grades[0]).toEqual({
      letter: "A",
      minScore: "90.0",
      maxScore: "100.0",
    });
    expect(grades[1]).toEqual({
      letter: "B",
      minScore: "80.0",
      maxScore: "89.9",
    });
    expect(grades[4]).toEqual({
      letter: "F",
      minScore: "0.0",
      maxScore: "59.9",
    });
  });
});

describe("assessment-scheme mapper — scheme", () => {
  const dto: AssessmentSchemeResponseDto = {
    tenantId: "t1",
    subjectId: "subj-1",
    academicYearLabel: "2024-2025",
    termId: "HK1",
    columns: [
      // out of order to prove ordinal sort
      {
        columnId: "ck",
        name: "Cuối kỳ",
        columnType: "CK",
        coefficient: 5,
        ordinal: 3,
      },
      {
        columnId: "tx",
        name: "Thường xuyên",
        columnType: "TX",
        coefficient: 2,
        ordinal: 1,
      },
      {
        columnId: "gk",
        name: "Giữa kỳ",
        columnType: "GK",
        coefficient: 3,
        ordinal: 2,
      },
    ],
    updatedAt: "2024-09-02T00:00:00.000Z",
  };

  it("maps response → entity, mapping academicYearLabel/termId and sorting by ordinal", () => {
    const scheme = mapAssessmentScheme(dto);
    expect(scheme.subjectId).toBe("subj-1");
    expect(scheme.yearLabel).toBe("2024-2025");
    expect(scheme.termId).toBe("HK1");
    expect(scheme.columns.map((c) => c.id)).toEqual(["tx", "gk", "ck"]);
    expect(scheme.columns.map((c) => c.label)).toEqual([
      "Thường xuyên",
      "Giữa kỳ",
      "Cuối kỳ",
    ]);
    expect(scheme.columns.map((c) => c.type)).toEqual(["TX", "GK", "CK"]);
  });

  it("scales coefficient → weight (×10) on read", () => {
    const scheme = mapAssessmentScheme(dto);
    expect(scheme.columns.map((c) => c.weight)).toEqual([20, 30, 50]);
  });

  it("defaults count to a fixed 1 on read (no wire representation)", () => {
    const scheme = mapAssessmentScheme(dto);
    expect(scheme.columns.every((c) => c.count === 1)).toBe(true);
  });

  it("scales weight → coefficient (÷10) and derives ordinal from array index on write", () => {
    const req = toSetAssessmentSchemeRequestDto({
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [
        { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
        { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 80 },
      ],
    });
    expect(req.columns).toEqual([
      { name: "Thường xuyên", columnType: "TX", coefficient: 2, ordinal: 1 },
      { name: "Cuối kỳ", columnType: "CK", coefficient: 8, ordinal: 2 },
    ]);
  });

  it("never includes count / subjectId / yearLabel / termId in the request body", () => {
    const req = toSetAssessmentSchemeRequestDto({
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [{ id: "tx", type: "TX", label: "TX", count: 3, weight: 100 }],
    });
    const serialized = JSON.stringify(req);
    expect(serialized).not.toContain("count");
    expect(serialized).not.toContain("subjectId");
    expect(serialized).not.toContain("yearLabel");
    expect(serialized).not.toContain("termId");
    expect(req.columns[0].coefficient).toBe(10);
  });
});

describe("assessment-scheme mapper — subjects (unchanged)", () => {
  it("maps a subject-for-grade DTO to entity", () => {
    const dto: SubjectForGradeDto = {
      id: "s1",
      name: "Toán",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    };
    expect(mapSubjectForGrade(dto)).toEqual(dto);
  });
});
