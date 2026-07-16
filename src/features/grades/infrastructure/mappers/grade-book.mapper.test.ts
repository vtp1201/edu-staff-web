import { describe, expect, it } from "vitest";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  ListGradesResponseDto,
  StudentGradeRowResponseDto,
  SubjectTermGradesResponseDto,
} from "../dtos/grade-book-response.dto";
import type { GradeEntryResponseDto } from "../dtos/grades-response.dto";
import { mapGradeBook, mapSubjectTermGroup } from "./grade-book.mapper";

const scheme: AssessmentScheme = {
  subjectId: "subj-toan-10",
  yearLabel: "2024-2025",
  termId: "HK1",
  columns: [
    { id: "tx", type: "TX", label: "Thường xuyên", count: 2, weight: 20 },
    { id: "gk", type: "GK", label: "Giữa kỳ", count: 1, weight: 30 },
    { id: "ck", type: "CK", label: "Cuối kỳ", count: 1, weight: 50 },
  ],
};

function entry(
  columnId: string,
  value: string,
  status: GradeEntryResponseDto["status"] = "PUBLISHED",
): GradeEntryResponseDto {
  return {
    classId: "class-1",
    subjectId: "subj-toan-10",
    termId: "HK1",
    studentMemberId: "hs-001",
    columnId,
    value,
    status,
    enteredBy: "teacher-1",
    enteredAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const rowDto: StudentGradeRowResponseDto = {
  studentMemberId: "hs-001",
  entries: [entry("tx", "8"), entry("gk", "8"), entry("ck", "9")],
  termAverage: "8.5",
};

describe("mapGradeBook", () => {
  it("maps the envelope fields and injects scheme + publishMode", () => {
    const dto: ListGradesResponseDto = {
      classId: "class-1",
      subjectId: "subj-toan-10",
      termId: "HK1",
      columns: [],
      students: [rowDto],
    };
    const book = mapGradeBook(
      dto,
      scheme,
      "SELF_PUBLISH",
      "10A1",
      "Toán",
      "2025-2026",
    );
    expect(book.classId).toBe("class-1");
    expect(book.className).toBe("10A1");
    expect(book.subjectName).toBe("Toán");
    expect(book.academicYearLabel).toBe("2025-2026");
    expect(book.publishMode).toBe("SELF_PUBLISH");
    expect(book.scheme).toBe(scheme);
    expect(book.rows).toHaveLength(1);
    // 8*20 + 8*30 + 9*50 = 160+240+450 = 850/100 = 8.5
    expect(book.rows[0].average).toBe(8.5);
    // conductGrade has no wire source — defaults, doc'd gap.
    expect(book.rows[0].conductGrade).toBe("TB");
  });

  it("returns null average when a column entry is missing", () => {
    const dto: ListGradesResponseDto = {
      classId: "class-1",
      subjectId: "subj-toan-10",
      termId: "HK1",
      columns: [],
      students: [{ ...rowDto, entries: [entry("tx", "8"), entry("gk", "8")] }],
    };
    const book = mapGradeBook(
      dto,
      scheme,
      "SELF_PUBLISH",
      "10A1",
      "Toán",
      "2025-2026",
    );
    expect(book.rows[0].average).toBeNull();
  });
});

describe("mapSubjectTermGroup", () => {
  it("maps a self-view (subject, term) group into a single-row GradeBook", () => {
    const group: SubjectTermGradesResponseDto = {
      subjectId: "subj-toan-10",
      termId: "HK1",
      entries: [entry("tx", "8"), entry("gk", "8"), entry("ck", "9")],
    };
    const book = mapSubjectTermGroup(
      group,
      scheme,
      "SELF_PUBLISH",
      "hs-001",
      "2025-2026",
      "",
      "subj-toan-10",
    );
    expect(book.subjectId).toBe("subj-toan-10");
    expect(book.termId).toBe("HK1");
    expect(book.rows).toHaveLength(1);
    expect(book.rows[0].studentId).toBe("hs-001");
    expect(book.rows[0].average).toBe(8.5);
  });
});
