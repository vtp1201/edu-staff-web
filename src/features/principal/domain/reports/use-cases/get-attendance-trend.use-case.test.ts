import { describe, expect, it, vi } from "vitest";
import type { AttendanceTrendPointEntity } from "../entities/attendance-trend-point.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";
import { GetAttendanceTrendUseCase } from "./get-attendance-trend.use-case";

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

const weeks: AttendanceTrendPointEntity[] = [{ weekLabel: "T1", rate: 97.2 }];

describe("GetAttendanceTrendUseCase", () => {
  it("delegates to repo.getAttendanceTrend with the given termId", async () => {
    const getAttendanceTrend = vi.fn().mockResolvedValue(weeks);
    const repo = makeRepo({ getAttendanceTrend });
    const result = await new GetAttendanceTrendUseCase(repo).execute("HK1");
    expect(getAttendanceTrend).toHaveBeenCalledWith("HK1");
    expect(result).toEqual(weeks);
  });

  it("passes an empty array through untouched", async () => {
    const repo = makeRepo({
      getAttendanceTrend: vi.fn().mockResolvedValue([]),
    });
    const result = await new GetAttendanceTrendUseCase(repo).execute("HK2");
    expect(result).toEqual([]);
  });

  it("rethrows a repository failure unchanged", async () => {
    const repo = makeRepo({
      getAttendanceTrend: vi.fn().mockRejectedValue({ type: "network-error" }),
    });
    await expect(
      new GetAttendanceTrendUseCase(repo).execute("HK2"),
    ).rejects.toEqual({ type: "network-error" });
  });
});
