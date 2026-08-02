import { describe, expect, it, vi } from "vitest";
import { UnavailableChildAttendanceRepository } from "./unavailable-child-attendance.repository";

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };

describe("UnavailableChildAttendanceRepository", () => {
  it("rejects with a typed forbidden failure", async () => {
    const repo = new UnavailableChildAttendanceRepository();
    await expect(repo.getChildAttendance("c1", RANGE)).rejects.toEqual({
      type: "forbidden",
    });
  });

  it("never touches the network (no fetch, no http client)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const repo = new UnavailableChildAttendanceRepository();
    await repo.getChildAttendance("c1", RANGE).catch(() => undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
