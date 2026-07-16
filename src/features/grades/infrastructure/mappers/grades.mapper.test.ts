import { describe, expect, it } from "vitest";
import type { AssessmentScheme } from "@/features/assessment-scheme/domain/entities/assessment-scheme.entity";
import type {
  GradeEntryResponseDto,
  ListGradesResponseDto,
  StudentGradeRowResponseDto,
} from "../dtos/grades-response.dto";
import {
  mapGradeCell,
  mapGradeSheet,
  mapStudentScoreRow,
} from "./grades.mapper";

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

function entry(
  columnId: string,
  value: string,
  status: GradeEntryResponseDto["status"] = "DRAFT",
): GradeEntryResponseDto {
  return {
    classId: "class-1",
    subjectId: "subj-1",
    termId: "HK1",
    studentMemberId: "s1",
    columnId,
    value,
    status,
    enteredBy: "teacher-1",
    enteredAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const rowDto: StudentGradeRowResponseDto = {
  studentMemberId: "s1",
  entries: [entry("tx", "8"), entry("gk", "7"), entry("ck", "9")],
  termAverage: "8.2",
};

describe("mapGradeCell", () => {
  it("maps value + status from a GradeEntryResponse", () => {
    expect(mapGradeCell(entry("tx", "8.5", "PUBLISHED"))).toEqual({
      value: 8.5,
      status: "PUBLISHED",
    });
  });
});

describe("mapStudentScoreRow", () => {
  it("maps a row's identity and per-cell scores correctly", () => {
    const row = mapStudentScoreRow(rowDto, scheme);
    expect(row.studentId).toBe("s1");
    expect(row.scores).toEqual({
      tx: { value: 8, status: "DRAFT" },
      gk: { value: 7, status: "DRAFT" },
      ck: { value: 9, status: "DRAFT" },
    });
  });

  it("fills a missing column entry with a null/DRAFT cell", () => {
    const row = mapStudentScoreRow(
      { ...rowDto, entries: [entry("tx", "8"), entry("ck", "9")] },
      scheme,
    );
    expect(row.scores.gk).toEqual({ value: null, status: "DRAFT" });
    expect(row.average).toBeNull();
  });

  it("recomputes the average from cell values via the scheme (ignores wire termAverage)", () => {
    const row = mapStudentScoreRow(rowDto, scheme);
    expect(row.average).toBe(8.2);
  });

  it("preserves a non-DRAFT per-cell status", () => {
    const row = mapStudentScoreRow(
      {
        ...rowDto,
        entries: [
          entry("tx", "8", "LOCKED"),
          entry("gk", "7", "PUBLISHED"),
          entry("ck", "9", "PENDING_APPROVAL"),
        ],
      },
      scheme,
    );
    expect(row.scores.tx.status).toBe("LOCKED");
    expect(row.scores.gk.status).toBe("PUBLISHED");
    expect(row.scores.ck.status).toBe("PENDING_APPROVAL");
  });
});

describe("mapGradeSheet", () => {
  it("maps the envelope fields and injects scheme + publishMode + year", () => {
    const dto: ListGradesResponseDto = {
      classId: "class-1",
      subjectId: "subj-1",
      termId: "HK1",
      columns: [],
      students: [rowDto],
    };
    const sheet = mapGradeSheet(dto, scheme, "ADMIN_APPROVAL", "2025-2026");
    expect(sheet.classId).toBe("class-1");
    expect(sheet.subjectId).toBe("subj-1");
    expect(sheet.termId).toBe("HK1");
    expect(sheet.academicYearLabel).toBe("2025-2026");
    expect(sheet.scheme).toBe(scheme);
    expect(sheet.publishMode).toBe("ADMIN_APPROVAL");
    expect(sheet.rows).toHaveLength(1);
  });
});
