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
  mapStaffGradeCell,
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

describe("mapStaffGradeCell — US-E18.44 staff-only rejection payload", () => {
  const rejected: GradeEntryResponseDto = {
    ...entry("ck", "6", "DRAFT"),
    rejectionReason: "Sai điểm cuối kỳ",
    rejectedBy: "admin-1",
    rejectedAt: "2026-08-05T02:00:00Z",
  };

  it("groups the 3 wire fields into a single `rejection` object", () => {
    expect(mapStaffGradeCell(rejected)).toEqual({
      value: 6,
      status: "DRAFT",
      rejection: {
        reason: "Sai điểm cuối kỳ",
        rejectedBy: "admin-1",
        rejectedAt: "2026-08-05T02:00:00Z",
      },
    });
  });

  it("OMITS the rejection key entirely when the wire carries no reason (absent ≠ empty)", () => {
    const cell = mapStaffGradeCell(entry("ck", "6"));
    expect(Object.keys(cell)).toEqual(["value", "status"]);
    expect("rejection" in cell).toBe(false);
  });

  it("treats a blank/whitespace-only reason as absent, never as an empty rejection", () => {
    const cell = mapStaffGradeCell({ ...rejected, rejectionReason: "   " });
    expect("rejection" in cell).toBe(false);
  });

  it("keeps rejectedBy/rejectedAt absent (not defaulted) when the wire omits them", () => {
    const cell = mapStaffGradeCell({
      ...entry("ck", "6"),
      rejectionReason: "Sai điểm",
    });
    expect(cell.rejection).toEqual({ reason: "Sai điểm" });
    expect(Object.keys(cell.rejection ?? {})).toEqual(["reason"]);
  });

  it("PRIVACY: mapGradeCell (student/parent read path) drops the fields even when present on the wire", () => {
    const cell = mapGradeCell(rejected);
    expect(Object.keys(cell)).toEqual(["value", "status"]);
    expect(JSON.stringify(cell)).not.toContain("Sai điểm");
    expect(JSON.stringify(cell)).not.toContain("admin-1");
  });
});

describe("mapStudentScoreRow", () => {
  it("carries the staff-only rejection payload onto the entry-path row", () => {
    const row = mapStudentScoreRow(
      {
        ...rowDto,
        entries: [
          entry("tx", "8"),
          entry("gk", "7"),
          {
            ...entry("ck", "6"),
            rejectionReason: "Sai điểm cuối kỳ",
            rejectedBy: "admin-1",
            rejectedAt: "2026-08-05T02:00:00Z",
          },
        ],
      },
      scheme,
    );
    expect(row.scores.ck.rejection?.reason).toBe("Sai điểm cuối kỳ");
    expect("rejection" in row.scores.tx).toBe(false);
  });

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
