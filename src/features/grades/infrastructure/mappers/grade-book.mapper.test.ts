import { describe, expect, it } from "vitest";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  GradeBookResponseDto,
  GradeBookRowDto,
} from "../dtos/grade-book-response.dto";
import { mapGradeBook, mapGradeBookRow } from "./grade-book.mapper";

const scheme: AssessmentScheme = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  columns: [
    { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
    { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

const rowDto: GradeBookRowDto = {
  studentId: "hs-001",
  studentName: "Nguyễn Văn An",
  studentCode: "HS001",
  scores: { tx: 8, gk: 8, ck: 9 },
  average: null,
  conductGrade: "Tot",
  publishStatus: "PUBLISHED",
};

describe("mapGradeBookRow", () => {
  it("recomputes the weighted average from scores + scheme weights", () => {
    // 8*20 + 8*30 + 9*50 = 160 + 240 + 450 = 850 / 100 = 8.5
    const row = mapGradeBookRow(rowDto, scheme);
    expect(row.average).toBe(8.5);
  });

  it("preserves conduct grade and publish status", () => {
    const row = mapGradeBookRow(rowDto, scheme);
    expect(row.conductGrade).toBe("Tot");
    expect(row.publishStatus).toBe("PUBLISHED");
  });

  it("returns null average when a column score is missing", () => {
    const row = mapGradeBookRow(
      { ...rowDto, scores: { tx: 8, gk: 8, ck: null } },
      scheme,
    );
    expect(row.average).toBeNull();
  });

  it("falls back to TB for an unknown conduct grade", () => {
    const row = mapGradeBookRow(
      { ...rowDto, conductGrade: "X" as GradeBookRowDto["conductGrade"] },
      scheme,
    );
    expect(row.conductGrade).toBe("TB");
  });
});

describe("mapGradeBook", () => {
  it("maps the envelope fields and injects scheme + publishMode", () => {
    const dto: GradeBookResponseDto = {
      classSubjectId: "cs-001",
      term: "HK1",
      className: "10A1",
      subjectName: "Toán",
      rows: [rowDto],
    };
    const book = mapGradeBook(dto, scheme, "SELF_PUBLISH");
    expect(book.classSubjectId).toBe("cs-001");
    expect(book.className).toBe("10A1");
    expect(book.subjectName).toBe("Toán");
    expect(book.publishMode).toBe("SELF_PUBLISH");
    expect(book.scheme).toBe(scheme);
    expect(book.rows).toHaveLength(1);
    expect(book.rows[0].average).toBe(8.5);
  });
});
