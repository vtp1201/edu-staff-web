import { describe, expect, it, vi } from "vitest";
import type { ReportListItemEntity } from "../entities/report-list-item.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";
import { GenerateReportUseCase } from "./generate-report.use-case";

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

const generating: ReportListItemEntity = {
  id: "r-new",
  name: "Báo cáo tổng kết",
  term: "HK2",
  createdAt: "2026-07-13T00:00:00.000Z",
  status: "generating",
};

describe("GenerateReportUseCase", () => {
  it("delegates to repo.generateReport(termId)", async () => {
    const generateReport = vi.fn().mockResolvedValue(generating);
    const repo = makeRepo({ generateReport });
    const result = await new GenerateReportUseCase(repo).execute("HK2");
    expect(generateReport).toHaveBeenCalledWith("HK2");
    expect(result).toEqual(generating);
  });

  it("returned entity always has status 'generating' (INT-005 contract guard)", async () => {
    const repo = makeRepo({
      generateReport: vi.fn().mockResolvedValue(generating),
    });
    const result = await new GenerateReportUseCase(repo).execute("HK2");
    expect(result.status).toBe("generating");
  });

  it("rethrows a repository failure unchanged, synthesizes no partial row", async () => {
    const repo = makeRepo({
      generateReport: vi.fn().mockRejectedValue({ type: "generation-failed" }),
    });
    await expect(
      new GenerateReportUseCase(repo).execute("HK2"),
    ).rejects.toEqual({ type: "generation-failed" });
  });
});
