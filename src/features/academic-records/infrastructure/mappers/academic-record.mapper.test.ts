import { describe, expect, it } from "vitest";
import type { AcademicRecordResponseDto } from "../dtos/academic-record-response.dto";
import { academicRecordMapper } from "./academic-record.mapper";

function makeDto(
  overrides: Partial<AcademicRecordResponseDto> = {},
): AcademicRecordResponseDto {
  return {
    studentId: "std-001",
    studentName: "Nguyễn Minh Khoa",
    studentCode: "NDU-2009-0184",
    dateOfBirth: "2009-04-12",
    currentClassId: "10A1",
    currentSchoolYear: "2025-2026",
    sealed: false,
    sealedAt: null,
    sealedBy: null,
    years: [
      {
        yearId: "2023-2024",
        yearLabel: "2023 — 2024",
        classId: "8A1",
        grade: 8,
        isCurrent: false,
        terms: [
          {
            termId: "HK1",
            status: "SEALED",
            classId: "8A1",
            conductGrade: "Tot",
            sealedAt: "2024-01-10",
            sealedBy: "GVCN",
            unsealedAt: null,
            unsealReason: null,
            subjects: [
              {
                subjectId: "math",
                subjectName: "Toán",
                tx1: 8,
                tx2: 9,
                giuaKy: 7,
                cuoiKy: 10,
              },
              {
                subjectId: "lit",
                subjectName: "Ngữ Văn",
                tx1: 6,
                tx2: 6,
                giuaKy: 6,
                cuoiKy: 6,
              },
            ],
          },
          {
            termId: "HK2",
            status: "SEALED",
            classId: "8A1",
            conductGrade: "Tot",
            sealedAt: "2024-05-20",
            sealedBy: "GVCN",
            unsealedAt: null,
            unsealReason: null,
            subjects: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("academicRecordMapper", () => {
  it("computes weighted termAvg per subject", () => {
    const rec = academicRecordMapper(makeDto());
    const math = rec.years[0].terms[0].subjects[0];
    // (8+9+14+30)/7 = 8.714…
    expect(math.termAvg).toBeCloseTo(8.71, 2);
  });

  it("computes rankBand from termAvg", () => {
    const rec = academicRecordMapper(makeDto());
    expect(rec.years[0].terms[0].subjects[0].rankBand).toBe("gioi"); // 8.71 ≥ 8
    expect(rec.years[0].terms[0].subjects[1].rankBand).toBe("trung-binh"); // 6.0 → ≥5,<6.5
  });

  it("computes term GPA as the average of subject termAvgs", () => {
    const rec = academicRecordMapper(makeDto());
    // subjects: 8.71 and 6.0 → (8.714 + 6)/2 ≈ 7.36
    expect(rec.years[0].terms[0].gpa).toBeCloseTo(7.36, 1);
  });

  it("derives year seal status from terms", () => {
    const rec = academicRecordMapper(makeDto());
    expect(rec.years[0].sealStatus).toBe("all_sealed");
  });

  it("marks record sealed only when all years are all_sealed", () => {
    const rec = academicRecordMapper(makeDto());
    expect(rec.sealed).toBe(true);
  });

  it("does not seal a record with an unsealed term", () => {
    const dto = makeDto();
    dto.years[0].terms[1].status = "UNSEALED";
    const rec = academicRecordMapper(dto);
    expect(rec.years[0].sealStatus).toBe("unsealed_in_year");
    expect(rec.sealed).toBe(false);
  });

  it("yields null termAvg and gpa when subject scores are all null", () => {
    const dto = makeDto();
    dto.years[0].terms[0].subjects = [
      {
        subjectId: "math",
        subjectName: "Toán",
        tx1: null,
        tx2: null,
        giuaKy: null,
        cuoiKy: null,
      },
    ];
    dto.years[0].terms[1].subjects = [];
    const rec = academicRecordMapper(dto);
    expect(rec.years[0].terms[0].subjects[0].termAvg).toBeNull();
    expect(rec.years[0].terms[0].gpa).toBeNull();
  });

  it("returns sealed=false for a record with no years", () => {
    const rec = academicRecordMapper(makeDto({ years: [] }));
    expect(rec.sealed).toBe(false);
  });
});
