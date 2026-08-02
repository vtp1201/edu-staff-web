import { describe, expect, it, vi } from "vitest";
import type { AttendanceDateRange } from "../entities/attendance-date-range.entity";
import type { ChildAttendanceRecord } from "../entities/child-attendance-record.entity";
import type { IChildAttendanceRepository } from "../repositories/i-child-attendance.repository";
import {
  GetChildAttendanceUseCase,
  MAX_RANGE_DAYS,
} from "./get-child-attendance.use-case";

const RECORDS: ChildAttendanceRecord[] = [
  { date: "2026-08-01", status: "present" },
  { date: "2026-08-02", status: "late" },
];

function makeRepo(impl: IChildAttendanceRepository["getChildAttendance"]): {
  repo: IChildAttendanceRepository;
  spy: ReturnType<typeof vi.fn>;
} {
  const spy = vi.fn(impl);
  return { repo: { getChildAttendance: spy }, spy };
}

const AUG: AttendanceDateRange = {
  startDate: "2026-08-01",
  endDate: "2026-08-31",
};

describe("GetChildAttendanceUseCase", () => {
  it("returns the repository records on success", async () => {
    const { repo, spy } = makeRepo(async () => RECORDS);
    const result = await new GetChildAttendanceUseCase(repo).execute("c1", AUG);

    expect(result).toEqual({ ok: true, data: RECORDS });
    expect(spy).toHaveBeenCalledWith("c1", AUG);
  });

  it("rejects an inverted range WITHOUT calling the repository", async () => {
    const { repo, spy } = makeRepo(async () => RECORDS);
    const result = await new GetChildAttendanceUseCase(repo).execute("c1", {
      startDate: "2026-08-31",
      endDate: "2026-08-01",
    });

    expect(result).toEqual({
      ok: false,
      error: { type: "invalid-date-range" },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("accepts an equal start/end day (single-day range)", async () => {
    const { repo, spy } = makeRepo(async () => []);
    const result = await new GetChildAttendanceUseCase(repo).execute("c1", {
      startDate: "2026-08-01",
      endDate: "2026-08-01",
    });

    expect(result).toEqual({ ok: true, data: [] });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it(`accepts exactly ${MAX_RANGE_DAYS} days and rejects one more`, async () => {
    // 2024 is a leap year → 2024-01-01..2024-12-31 is exactly 366 days.
    const { repo, spy } = makeRepo(async () => []);
    const useCase = new GetChildAttendanceUseCase(repo);

    const atLimit = await useCase.execute("c1", {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    expect(atLimit).toEqual({ ok: true, data: [] });

    const overLimit = await useCase.execute("c1", {
      startDate: "2024-01-01",
      endDate: "2025-01-01",
    });
    expect(overLimit).toEqual({
      ok: false,
      error: { type: "date-range-too-large" },
    });
    // only the in-range call reached the repository
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("passes a typed repository rejection through unchanged", async () => {
    const { repo } = makeRepo(async () => {
      throw { type: "forbidden" };
    });
    const result = await new GetChildAttendanceUseCase(repo).execute("c1", AUG);

    expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("maps an untyped rejection to network-error", async () => {
    const { repo } = makeRepo(async () => {
      throw new Error("boom");
    });
    const result = await new GetChildAttendanceUseCase(repo).execute("c1", AUG);

    expect(result).toEqual({ ok: false, error: { type: "network-error" } });
  });
});
