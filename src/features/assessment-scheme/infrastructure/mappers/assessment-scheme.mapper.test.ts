import { describe, expect, it } from "vitest";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import type {
  AssessmentSchemeResponseDto,
  GradeScaleResponseDto,
  SubjectListItemDto,
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
    // No `bands` on this payload (tenant never customised) → preset fallback.
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

  /**
   * US-E18.49 (BE US-189): `bands` are REAL and persisted on numeric scales.
   * The pre-US-189 mapper always returned the hardcoded preset for HE_10 /
   * HE_4_GPA, silently discarding whatever the admin had saved.
   */
  it("reads real wire bands for HE_10 instead of the preset (string minThreshold → number)", () => {
    const scale = mapGradeScale({
      tenantId: "t1",
      scaleType: "HE_10",
      minValue: "0",
      maxValue: "10.0",
      bands: [
        { label: "Đạt", minThreshold: "5.0" },
        { label: "Chưa đạt", minThreshold: "0" },
      ],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    });
    expect(scale.bands.map((b) => b.label)).toEqual(["Đạt", "Chưa đạt"]);
    expect(scale.bands.map((b) => b.minThreshold)).toEqual([5, 0]);
    expect(scale.bands.map((b) => b.colorToken)).toEqual(["success", "error"]);
    expect(scale.bands).not.toEqual(GRADE_SCALE_PRESETS.SCALE_10.bands);
    expect(scale.bands.map((b) => b.id)).toEqual(["band-1", "band-2"]);
  });

  it("reads real wire bands for HE_4_GPA and re-sorts them highest-first", () => {
    const scale = mapGradeScale({
      tenantId: "t1",
      scaleType: "HE_4_GPA",
      minValue: "0",
      maxValue: "4.0",
      // deliberately unsorted — the mapper must not trust wire order
      bands: [
        { label: "C", minThreshold: "2.0" },
        { label: "A", minThreshold: "3.5" },
        { label: "F", minThreshold: "0" },
      ],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    });
    expect(scale.type).toBe("SCALE_4");
    expect(scale.bands.map((b) => b.label)).toEqual(["A", "C", "F"]);
    expect(scale.bands.map((b) => b.minThreshold)).toEqual([3.5, 2, 0]);
  });

  it("falls back to the preset only when the numeric response carries no bands (absent, null or empty)", () => {
    const base = {
      tenantId: "t1",
      scaleType: "HE_10" as const,
      maxValue: "10.0",
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    };
    // Go serialises an empty slice as `null` (the field has no `omitempty`).
    expect(mapGradeScale({ ...base, bands: null }).bands).toEqual(
      GRADE_SCALE_PRESETS.SCALE_10.bands,
    );
    expect(mapGradeScale({ ...base, bands: [] }).bands).toEqual(
      GRADE_SCALE_PRESETS.SCALE_10.bands,
    );
  });

  it("ignores an unparseable wire threshold rather than inventing a 0 band", () => {
    const scale = mapGradeScale({
      tenantId: "t1",
      scaleType: "HE_10",
      maxValue: "10.0",
      bands: [
        { label: "Đạt", minThreshold: "n/a" },
        { label: "Chưa đạt", minThreshold: "0" },
      ],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    });
    expect(scale.bands).toEqual(GRADE_SCALE_PRESETS.SCALE_10.bands);
  });

  it("never reads bands on a LETTER_ABCD response (letterGrades stay authoritative)", () => {
    const scale = mapGradeScale({
      tenantId: "t1",
      scaleType: "LETTER_ABCD",
      maxValue: "100",
      letterGrades: [
        { letter: "A", minScore: "90", maxScore: "100" },
        { letter: "F", minScore: "0", maxScore: "89.9" },
      ],
      // The BE rejects this combination, but a defensive mapper must not let a
      // stray `bands` array override the letter grades.
      bands: [{ label: "Nonsense", minThreshold: "1" }],
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    });
    expect(scale.bands.map((b) => b.label)).toEqual(["A", "F"]);
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

  it("serialises bands for a numeric scale, highest-first, as wire decimal strings", () => {
    const req = toSetGradeScaleRequestDto({
      type: "SCALE_10",
      maxScore: 10,
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      bands: [
        // unsorted + untrimmed on purpose
        { id: "b", label: " Chưa đạt ", minThreshold: 0, colorToken: "error" },
        { id: "a", label: "Đạt", minThreshold: 5, colorToken: "success" },
      ],
    });
    expect(req.bands).toEqual([
      { label: "Đạt", minThreshold: "5" },
      { label: "Chưa đạt", minThreshold: "0" },
    ]);
    expect(req.letterGrades).toBeUndefined();
  });

  it("preserves sub-0.1 precision on a numeric-scale threshold (no rounding)", () => {
    const req = toSetGradeScaleRequestDto({
      type: "SCALE_4",
      maxScore: 4,
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      bands: [
        { id: "a", label: "A", minThreshold: 3.25, colorToken: "success" },
      ],
    });
    expect(req.bands).toEqual([{ label: "A", minThreshold: "3.25" }]);
  });

  it("serialises bands for SCALE_4 too (the wire cares about the scale type, not the range)", () => {
    const req = toSetGradeScaleRequestDto(GRADE_SCALE_PRESETS.SCALE_4);
    expect(req.scaleType).toBe("HE_4_GPA");
    expect(req.bands?.map((b) => b.minThreshold)).toEqual([
      "3.7",
      "3.3",
      "3",
      "2.7",
      "2",
      "1",
      "0",
    ]);
  });

  it("NEVER sends bands for LETTER_ABCD (BE 422s that combination)", () => {
    const req = toSetGradeScaleRequestDto(GRADE_SCALE_PRESETS.LETTER);
    expect(req.bands).toBeUndefined();
    expect(JSON.stringify(req)).not.toContain("bands");
  });

  it("omits bands entirely for a numeric scale that has none", () => {
    const req = toSetGradeScaleRequestDto({
      type: "SCALE_10",
      maxScore: 10,
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      bands: [],
    });
    expect(req.bands).toBeUndefined();
  });

  it("round-trips a customised numeric scale: write → read yields the same labels/thresholds", () => {
    const saved = toSetGradeScaleRequestDto({
      type: "SCALE_10",
      maxScore: 10,
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      bands: [
        { id: "x", label: "Xuất sắc", minThreshold: 9, colorToken: "success" },
        { id: "d", label: "Đạt", minThreshold: 5, colorToken: "primary" },
        { id: "c", label: "Chưa đạt", minThreshold: 0, colorToken: "error" },
      ],
    });
    const reread = mapGradeScale({
      tenantId: "t1",
      scaleType: saved.scaleType,
      minValue: saved.minValue,
      maxValue: saved.maxValue,
      bands: saved.bands,
      effectiveFrom: saved.effectiveFrom,
      updatedAt: "2024-09-02T00:00:00.000Z",
    });
    expect(reread.bands.map((b) => [b.label, b.minThreshold])).toEqual([
      ["Xuất sắc", 9],
      ["Đạt", 5],
      ["Chưa đạt", 0],
    ]);
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

  /**
   * US-E18.49 (BE US-189): `requiredCount` is REAL. It is OMITTED from the
   * response when unspecified — that absence is a distinct state and must map
   * to `null`, never to a fabricated `1` (the pre-US-189 hardcode).
   */
  it("reads requiredCount into count when the wire carries it", () => {
    const scheme = mapAssessmentScheme({
      ...dto,
      columns: dto.columns.map((c) => ({ ...c, requiredCount: 3 })),
    });
    expect(scheme.columns.map((c) => c.count)).toEqual([3, 3, 3]);
  });

  it("maps an OMITTED requiredCount to null — never defaults it to 1", () => {
    const scheme = mapAssessmentScheme(dto);
    expect(scheme.columns.map((c) => c.count)).toEqual([null, null, null]);
    expect(scheme.columns.some((c) => c.count === 1)).toBe(false);
  });

  it("maps requiredCount per column independently (set on one, unset on another)", () => {
    const scheme = mapAssessmentScheme({
      ...dto,
      columns: [
        { ...dto.columns[1], requiredCount: 4 }, // tx, ordinal 1
        { ...dto.columns[2] }, // gk, ordinal 2 — omitted
        { ...dto.columns[0], requiredCount: 1 }, // ck, ordinal 3
      ],
    });
    expect(scheme.columns.map((c) => c.count)).toEqual([4, null, 1]);
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
      {
        name: "Thường xuyên",
        columnType: "TX",
        coefficient: 2,
        ordinal: 1,
        requiredCount: 2,
      },
      {
        name: "Cuối kỳ",
        columnType: "CK",
        coefficient: 8,
        ordinal: 2,
        requiredCount: 1,
      },
    ]);
  });

  it("OMITS requiredCount (not null) for a column whose count is unset", () => {
    const req = toSetAssessmentSchemeRequestDto({
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [
        { id: "tx", type: "TX", label: "TX", count: null, weight: 40 },
        { id: "ck", type: "CK", label: "CK", count: 5, weight: 60 },
      ],
    });
    expect(Object.keys(req.columns[0])).toEqual([
      "name",
      "columnType",
      "coefficient",
      "ordinal",
    ]);
    expect("requiredCount" in req.columns[0]).toBe(false);
    expect(req.columns[1].requiredCount).toBe(5);
  });

  it("round-trips requiredCount: write → read preserves set and unset alike", () => {
    const req = toSetAssessmentSchemeRequestDto({
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [
        { id: "tx", type: "TX", label: "TX", count: 4, weight: 40 },
        { id: "ck", type: "CK", label: "CK", count: null, weight: 60 },
      ],
    });
    const reread = mapAssessmentScheme({
      ...dto,
      columns: req.columns.map((c, i) => ({
        columnId: `c${i}`,
        name: c.name,
        columnType: c.columnType,
        coefficient: c.coefficient,
        ordinal: c.ordinal,
        ...(c.requiredCount !== undefined
          ? { requiredCount: c.requiredCount }
          : {}),
      })),
    });
    expect(reread.columns.map((c) => c.count)).toEqual([4, null]);
  });

  it("never includes subjectId / yearLabel / termId in the request body", () => {
    const req = toSetAssessmentSchemeRequestDto({
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [{ id: "tx", type: "TX", label: "TX", count: 3, weight: 100 }],
    });
    const serialized = JSON.stringify(req);
    expect(serialized).not.toContain("subjectId");
    expect(serialized).not.toContain("yearLabel");
    expect(serialized).not.toContain("termId");
    // the domain field is `count`; the wire field is `requiredCount`
    expect(serialized).not.toContain('"count"');
    expect(req.columns[0].coefficient).toBe(10);
  });
});

describe("assessment-scheme mapper — subjects (real GET /subjects, US-E18.42)", () => {
  const wire: SubjectListItemDto = {
    subjectId: "s1",
    tenantId: "t1",
    subjectParentId: "p1",
    name: "Toán",
    code: "TOAN",
    gradeLevel: 10,
    status: "ACTIVE",
    createdAt: "2024-09-01T00:00:00.000Z",
    updatedAt: "2024-09-01T00:00:00.000Z",
  };

  it("renames subjectId → id and unnests master.requiredExamCount", () => {
    expect(
      mapSubjectForGrade({ ...wire, master: { requiredExamCount: 4 } }),
    ).toEqual({
      id: "s1",
      name: "Toán",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    });
  });

  it("collapses an absent master and a 0 requiredExamCount to null", () => {
    expect(mapSubjectForGrade(wire).requiredAssessmentCount).toBeNull();
    expect(
      mapSubjectForGrade({ ...wire, master: { requiredExamCount: 0 } })
        .requiredAssessmentCount,
    ).toBeNull();
  });

  it("drops wire-only fields the entity does not carry", () => {
    const entity = mapSubjectForGrade(wire);
    expect(Object.keys(entity).sort()).toEqual([
      "gradeLevel",
      "id",
      "name",
      "requiredAssessmentCount",
    ]);
  });
});
