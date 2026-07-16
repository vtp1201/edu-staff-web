import { describe, expect, it } from "vitest";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  GradeSheetResponseDto,
  StudentScoreRowDto,
} from "../dtos/grades-response.dto";
import { mapGradeSheet, mapStudentScoreRow } from "./grades.mapper";

const scheme: AssessmentScheme = {
  subjectId: "subj-1",
  yearLabel: "2024-2025",
  termId: "HK1",
  columns: [
    { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
    { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

const rowDto: StudentScoreRowDto = {
  studentId: "s1",
  studentName: "Nguyễn Văn An",
  studentCode: "HS001",
  scores: { tx: 8, gk: 7, ck: 9 },
  average: 8.2,
  publishStatus: "DRAFT",
};

describe("grades.mapper", () => {
  it("maps a row's identity and scores correctly", () => {
    const row = mapStudentScoreRow(rowDto, scheme);
    expect(row.studentId).toBe("s1");
    expect(row.studentName).toBe("Nguyễn Văn An");
    expect(row.scores).toEqual({ tx: 8, gk: 7, ck: 9 });
  });

  it("maps a null score and recomputes average to null", () => {
    const row = mapStudentScoreRow(
      { ...rowDto, scores: { tx: 8, gk: null, ck: 9 }, average: null },
      scheme,
    );
    expect(row.scores.gk).toBeNull();
    expect(row.average).toBeNull();
  });

  it("recomputes the average from scores via the scheme", () => {
    const row = mapStudentScoreRow(rowDto, scheme);
    expect(row.average).toBe(8.2);
  });

  it("maps an unknown publishStatus string to a safe default", () => {
    const row = mapStudentScoreRow(
      { ...rowDto, publishStatus: "weird" },
      scheme,
    );
    expect(row.publishStatus).toBe("DRAFT");
  });

  it("maps PENDING_APPROVAL publishStatus to the union", () => {
    const row = mapStudentScoreRow(
      { ...rowDto, publishStatus: "PENDING_APPROVAL" },
      scheme,
    );
    expect(row.publishStatus).toBe("PENDING_APPROVAL");
  });

  it("maps a full grade sheet with scheme and publishMode", () => {
    const dto: GradeSheetResponseDto = {
      classSubjectId: "cs-001",
      term: "HK1",
      rows: [rowDto],
    };
    const sheet = mapGradeSheet(dto, scheme, "ADMIN_APPROVAL");
    expect(sheet.classSubjectId).toBe("cs-001");
    expect(sheet.scheme).toBe(scheme);
    expect(sheet.publishMode).toBe("ADMIN_APPROVAL");
    expect(sheet.rows).toHaveLength(1);
  });
});
