import { describe, expect, it, vi } from "vitest";
import type { TeacherClassKpi } from "../entities/teacher-class.entity";
import type {
  ClassResult,
  ITeacherClassRepository,
} from "../repositories/i-teacher-class.repository";
import { GetHomeroomKpiUseCase } from "./get-homeroom-kpi.use-case";

function makeRepo(
  result: ClassResult<Partial<TeacherClassKpi>>,
): ITeacherClassRepository & {
  getHomeroomKpi: ReturnType<typeof vi.fn>;
} {
  const getHomeroomKpi = vi.fn().mockResolvedValue(result);
  return {
    listMyClasses: vi.fn(),
    getClassStudents: vi.fn(),
    getHomeroomKpi,
  } as unknown as ITeacherClassRepository & {
    getHomeroomKpi: ReturnType<typeof vi.fn>;
  };
}

describe("GetHomeroomKpiUseCase (US-E24.7)", () => {
  it("forwards the class id to the repository", async () => {
    const repo = makeRepo({ ok: true, data: { openViolations: 2 } });
    await new GetHomeroomKpiUseCase(repo).execute("cls-10a1");
    expect(repo.getHomeroomKpi).toHaveBeenCalledWith("cls-10a1");
  });

  it("returns the partial KPI as-is (a missing field stays undefined)", async () => {
    const repo = makeRepo({
      ok: true,
      data: { openViolations: 3, pendingLeave: 0, demoFields: [] },
    });
    const res = await new GetHomeroomKpiUseCase(repo).execute("cls-10a1");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.openViolations).toBe(3);
      expect(res.data.attendanceRate).toBeUndefined();
    }
  });

  it("forwards a repository failure without translating it", async () => {
    const repo = makeRepo({ ok: false, error: { type: "unauthorized" } });
    const res = await new GetHomeroomKpiUseCase(repo).execute("cls-10a1");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });
});
