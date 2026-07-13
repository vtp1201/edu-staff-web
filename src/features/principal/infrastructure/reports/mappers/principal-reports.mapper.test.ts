import { describe, expect, it } from "vitest";
import type { ReportsSummaryResponseDto } from "../dtos/reports-summary-response.dto";
import { PrincipalReportsMapper } from "./principal-reports.mapper";

describe("PrincipalReportsMapper.toSummary", () => {
  it("maps every field and preserves non-null trends", () => {
    const dto: ReportsSummaryResponseDto = {
      totalStudents: 1248,
      totalStudentsTrend: 2.1,
      schoolAverage: 7.42,
      schoolAverageTrend: 0.8,
      attendanceRate: 96.4,
      attendanceRateTrend: -0.5,
      incidentCount: 23,
      incidentCountTrend: -12,
    };
    expect(PrincipalReportsMapper.toSummary(dto)).toEqual(dto);
  });

  it("preserves null trend fields (no baseline) as null, not 0", () => {
    const dto: ReportsSummaryResponseDto = {
      totalStudents: 1248,
      totalStudentsTrend: null,
      schoolAverage: 7.42,
      schoolAverageTrend: null,
      attendanceRate: 96.4,
      attendanceRateTrend: null,
      incidentCount: 23,
      incidentCountTrend: null,
    };
    const entity = PrincipalReportsMapper.toSummary(dto);
    expect(entity.totalStudentsTrend).toBeNull();
    expect(entity.incidentCountTrend).toBeNull();
  });
});

describe("PrincipalReportsMapper — list/chart shapes", () => {
  it("maps a subject-average dto", () => {
    expect(
      PrincipalReportsMapper.toSubjectAverage({
        subjectId: "s-math",
        subjectName: "Toán",
        average: 7.8,
      }),
    ).toEqual({ subjectId: "s-math", subjectName: "Toán", average: 7.8 });
  });

  it("maps an attendance-trend point", () => {
    expect(
      PrincipalReportsMapper.toAttendanceTrendPoint({
        weekLabel: "T1",
        rate: 97.2,
      }),
    ).toEqual({ weekLabel: "T1", rate: 97.2 });
  });

  it("maps a report list item, preserving term + status literals", () => {
    const entity = PrincipalReportsMapper.toReportListItem({
      id: "r1",
      name: "Báo cáo",
      term: "FULL_YEAR",
      createdAt: "2026-07-01T00:00:00.000Z",
      status: "generating",
    });
    expect(entity.term).toBe("FULL_YEAR");
    expect(entity.status).toBe("generating");
  });
});
