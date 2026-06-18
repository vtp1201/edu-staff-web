import { describe, expect, it } from "vitest";
import type {
  AssessmentSchemeResponseDto,
  GradeScaleResponseDto,
  SubjectForGradeDto,
} from "../dtos/assessment-scheme-response.dto";
import {
  mapAssessmentScheme,
  mapGradeScale,
  mapSubjectForGrade,
} from "./assessment-scheme.mapper";

describe("assessment-scheme mapper", () => {
  it("maps a grade-scale DTO to entity", () => {
    const dto: GradeScaleResponseDto = {
      type: "SCALE_10",
      maxScore: 10,
      bands: [
        { id: "gioi", label: "Giỏi", minThreshold: 8, colorToken: "success" },
        { id: "yeu", label: "Yếu", minThreshold: 0, colorToken: "error" },
      ],
    };
    const scale = mapGradeScale(dto);
    expect(scale.type).toBe("SCALE_10");
    expect(scale.maxScore).toBe(10);
    expect(scale.bands).toHaveLength(2);
    expect(scale.bands[0].colorToken).toBe("success");
  });

  it("falls back to safe defaults for unknown enum values", () => {
    const dto: GradeScaleResponseDto = {
      type: "WEIRD",
      maxScore: 10,
      bands: [{ id: "x", label: "X", minThreshold: 0, colorToken: "neon" }],
    };
    const scale = mapGradeScale(dto);
    expect(scale.type).toBe("SCALE_10");
    expect(scale.bands[0].colorToken).toBe("primary");
  });

  it("maps an assessment-scheme DTO to entity", () => {
    const dto: AssessmentSchemeResponseDto = {
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      columns: [
        { id: "tx", type: "TX", label: "TX", count: 2, weight: 20 },
        { id: "ck", type: "CK", label: "CK", count: 1, weight: 80 },
      ],
    };
    const scheme = mapAssessmentScheme(dto);
    expect(scheme.subjectId).toBe("subj-1");
    expect(scheme.columns).toHaveLength(2);
    expect(scheme.columns[1].type).toBe("CK");
  });

  it("maps a subject-for-grade DTO to entity", () => {
    const dto: SubjectForGradeDto = {
      id: "s1",
      name: "Toán",
      gradeLevel: 10,
      requiredAssessmentCount: 4,
    };
    const subject = mapSubjectForGrade(dto);
    expect(subject).toEqual(dto);
  });
});
