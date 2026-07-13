import { describe, expect, it, vi } from "vitest";
import type { ReportsSummaryEntity } from "../entities/reports-summary.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";
import { GetReportsSummaryUseCase } from "./get-reports-summary.use-case";

function makeRepo(
  overrides: Partial<IPrincipalReportsRepository> = {},
): IPrincipalReportsRepository {
  return {
    getReportsSummary: vi.fn(),
    getSubjectAverages: vi.fn(),
    getAttendanceTrend: vi.fn(),
    getPeriodicReports: vi.fn(),
    generateReport: vi.fn(),
    ...overrides,
  };
}

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

describe("GetReportsSummaryUseCase", () => {
  it("delegates to repo.getReportsSummary with the given termId", async () => {
    const getReportsSummary = vi.fn().mockResolvedValue(summary);
    const repo = makeRepo({ getReportsSummary });
    const result = await new GetReportsSummaryUseCase(repo).execute("HK1");
    expect(getReportsSummary).toHaveBeenCalledWith("HK1");
    expect(result).toEqual(summary);
  });

  it("passes through trend fields verbatim, including null (no baseline-omission logic in domain)", async () => {
    const repo = makeRepo({
      getReportsSummary: vi.fn().mockResolvedValue(summary),
    });
    const result = await new GetReportsSummaryUseCase(repo).execute("HK2");
    expect(result.incidentCountTrend).toBeNull();
    expect(result.totalStudentsTrend).toBe(2.1);
  });

  it("rethrows a repository failure unchanged (no swallow)", async () => {
    const repo = makeRepo({
      getReportsSummary: vi.fn().mockRejectedValue({ type: "network-error" }),
    });
    await expect(
      new GetReportsSummaryUseCase(repo).execute("FULL_YEAR"),
    ).rejects.toEqual({ type: "network-error" });
  });
});
