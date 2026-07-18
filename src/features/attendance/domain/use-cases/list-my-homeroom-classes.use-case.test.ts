import { describe, expect, it, vi } from "vitest";
import type { IAttendanceRepository } from "../repositories/i-attendance.repository";
import { ListMyHomeroomClassesUseCase } from "./list-my-homeroom-classes.use-case";

function makeRepo(
  over: Partial<IAttendanceRepository> = {},
): IAttendanceRepository {
  return {
    getMyHomeroomClasses: vi.fn(),
    getClassAttendance: vi.fn(),
    saveClassAttendance: vi.fn(),
    getAttendanceHistory: vi.fn(),
    ...over,
  };
}

describe("ListMyHomeroomClassesUseCase", () => {
  it("delegates to repo.getMyHomeroomClasses()", async () => {
    const classes = [{ id: "c-1", name: "10A1" }];
    const repo = makeRepo({
      getMyHomeroomClasses: vi.fn().mockResolvedValue(classes),
    });
    const uc = new ListMyHomeroomClassesUseCase(repo);

    const result = await uc.execute();

    expect(repo.getMyHomeroomClasses).toHaveBeenCalled();
    expect(result).toBe(classes);
  });
});
