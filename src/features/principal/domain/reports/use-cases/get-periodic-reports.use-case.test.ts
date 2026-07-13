import { describe, expect, it, vi } from "vitest";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";
import { GetPeriodicReportsUseCase } from "./get-periodic-reports.use-case";

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

const page = {
  items: [
    {
      id: "r1",
      name: "Báo cáo sơ kết Học kỳ I",
      term: "HK1" as const,
      createdAt: "2026-01-10T00:00:00.000Z",
      status: "ready" as const,
    },
  ],
  nextCursor: null,
  hasMore: false,
};

describe("GetPeriodicReportsUseCase", () => {
  it("delegates to repo.getPeriodicReports with termId and cursor", async () => {
    const getPeriodicReports = vi.fn().mockResolvedValue(page);
    const repo = makeRepo({ getPeriodicReports });
    const result = await new GetPeriodicReportsUseCase(repo).execute(
      "HK1",
      "cur-1",
    );
    expect(getPeriodicReports).toHaveBeenCalledWith("HK1", "cur-1");
    expect(result).toEqual(page);
  });

  it("passes an empty page through untouched", async () => {
    const empty = { items: [], nextCursor: null, hasMore: false };
    const repo = makeRepo({
      getPeriodicReports: vi.fn().mockResolvedValue(empty),
    });
    const result = await new GetPeriodicReportsUseCase(repo).execute("HK2");
    expect(result.items).toEqual([]);
  });

  it("rethrows a repository failure unchanged", async () => {
    const repo = makeRepo({
      getPeriodicReports: vi.fn().mockRejectedValue({ type: "network-error" }),
    });
    await expect(
      new GetPeriodicReportsUseCase(repo).execute("HK2"),
    ).rejects.toEqual({ type: "network-error" });
  });
});
