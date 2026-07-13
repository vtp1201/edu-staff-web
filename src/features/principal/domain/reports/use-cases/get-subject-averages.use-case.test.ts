import { describe, expect, it, vi } from "vitest";
import type { SubjectAverageEntity } from "../entities/subject-average.entity";
import type { IPrincipalReportsRepository } from "../repositories/i-principal-reports.repository";
import { GetSubjectAveragesUseCase } from "./get-subject-averages.use-case";

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

const subjects: SubjectAverageEntity[] = [
  { subjectId: "s-math", subjectName: "Toán", average: 7.8 },
];

describe("GetSubjectAveragesUseCase", () => {
  it("delegates to repo.getSubjectAverages with the given termId", async () => {
    const getSubjectAverages = vi.fn().mockResolvedValue(subjects);
    const repo = makeRepo({ getSubjectAverages });
    const result = await new GetSubjectAveragesUseCase(repo).execute("HK1");
    expect(getSubjectAverages).toHaveBeenCalledWith("HK1");
    expect(result).toEqual(subjects);
  });

  it("passes an empty array through untouched (empty-state belongs to presentation)", async () => {
    const repo = makeRepo({
      getSubjectAverages: vi.fn().mockResolvedValue([]),
    });
    const result = await new GetSubjectAveragesUseCase(repo).execute("HK2");
    expect(result).toEqual([]);
  });

  it("rethrows a repository failure unchanged", async () => {
    const repo = makeRepo({
      getSubjectAverages: vi.fn().mockRejectedValue({ type: "network-error" }),
    });
    await expect(
      new GetSubjectAveragesUseCase(repo).execute("HK2"),
    ).rejects.toEqual({ type: "network-error" });
  });
});
