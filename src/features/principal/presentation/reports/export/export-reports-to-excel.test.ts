import { describe, expect, it } from "vitest";
import type { ReportsSummaryEntity } from "@/features/principal/domain/reports/entities/reports-summary.entity";
import {
  buildReportsCsv,
  type ExportReportsInput,
  type ExportReportsLabels,
} from "./export-reports-to-excel";

const labels: ExportReportsLabels = {
  title: "Báo cáo tổng hợp",
  statsHeading: "Chỉ số chung",
  totalStudents: "Tổng số học sinh",
  schoolAverage: "Điểm TB toàn trường",
  attendanceRate: "Tỷ lệ chuyên cần",
  incidents: "Vi phạm trong kỳ",
  subjectsHeading: "Điểm TB theo môn",
  subjectCol: "Môn",
  averageCol: "Điểm TB",
  attendanceHeading: "Chuyên cần theo tuần",
  weekCol: "Tuần",
  rateCol: "Tỷ lệ (%)",
  reportsHeading: "Báo cáo định kỳ",
  nameCol: "Tên báo cáo",
  createdAtCol: "Ngày tạo",
  statusCol: "Trạng thái",
  statusReady: "Sẵn sàng",
  statusGenerating: "Đang tạo",
};

const summary: ReportsSummaryEntity = {
  totalStudents: 1248,
  totalStudentsTrend: 2.1,
  schoolAverage: 7.42,
  schoolAverageTrend: 0.8,
  attendanceRate: 96.4,
  attendanceRateTrend: -0.5,
  incidentCount: 23,
  incidentCountTrend: null,
};

const input: ExportReportsInput = {
  termLabel: "Học kỳ II",
  summary,
  subjects: [{ subjectId: "s1", subjectName: "Toán", average: 7.8 }],
  weeks: [{ weekLabel: "T1", rate: 97.2 }],
  reports: [
    {
      id: "r1",
      name: "Báo cáo, sơ kết",
      term: "HK2",
      createdAt: "2026-03-20T02:00:00.000Z",
      status: "ready",
    },
  ],
};

describe("buildReportsCsv", () => {
  it("includes the term-scoped title and all four section values", () => {
    const csv = buildReportsCsv(input, labels);
    expect(csv).toContain("Báo cáo tổng hợp — Học kỳ II");
    expect(csv).toContain("1248");
    expect(csv).toContain("Toán");
    expect(csv).toContain("7.8");
    expect(csv).toContain("97.2");
    expect(csv).toContain("Sẵn sàng");
  });

  it("escapes cells containing commas (RFC-4180)", () => {
    const csv = buildReportsCsv(input, labels);
    // "Báo cáo, sơ kết" has a comma → must be wrapped in quotes.
    expect(csv).toContain('"Báo cáo, sơ kết"');
  });

  it("is deterministic (same input → same output)", () => {
    expect(buildReportsCsv(input, labels)).toBe(buildReportsCsv(input, labels));
  });

  it("throws rather than emit a partial file when summary is missing", () => {
    const bad = {
      ...input,
      summary: undefined as unknown as ReportsSummaryEntity,
    };
    expect(() => buildReportsCsv(bad, labels)).toThrow();
  });
});
