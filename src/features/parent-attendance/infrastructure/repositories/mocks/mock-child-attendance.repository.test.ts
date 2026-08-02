import { describe, expect, it } from "vitest";
import type { AttendanceStatus } from "@/features/attendance/domain/entities/attendance-status.entity";
import { isWeekend } from "./child-attendance-fixtures";
import { MockChildAttendanceRepository } from "./mock-child-attendance.repository";

const AUG_2026 = { startDate: "2026-08-01", endDate: "2026-08-31" };

describe("MockChildAttendanceRepository", () => {
  it("returns only dates inside the requested range, ascending", async () => {
    const records =
      await new MockChildAttendanceRepository().getChildAttendance("c1", {
        startDate: "2026-08-10",
        endDate: "2026-08-14",
      });

    expect(records.map((r) => r.date)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
    ]);
  });

  it("skips weekends (no school-day record)", async () => {
    const records =
      await new MockChildAttendanceRepository().getChildAttendance(
        "c1",
        AUG_2026,
      );

    expect(records.every((r) => !isWeekend(r.date))).toBe(true);
    // 2026-08-01 is a Saturday and 2026-08-02 a Sunday.
    expect(records.map((r) => r.date)).not.toContain("2026-08-01");
    expect(records[0].date).toBe("2026-08-03");
  });

  it("renders every status at least once over a full month", async () => {
    const records =
      await new MockChildAttendanceRepository().getChildAttendance(
        "c1",
        AUG_2026,
      );
    const seen = new Set<AttendanceStatus>(records.map((r) => r.status));

    expect([...seen].sort()).toEqual([
      "absent",
      "excusedAbsent",
      "late",
      "present",
    ]);
  });

  it("is deterministic for the same child+range and differs per child", async () => {
    const repo = new MockChildAttendanceRepository();
    const a1 = await repo.getChildAttendance("c1", AUG_2026);
    const a2 = await repo.getChildAttendance("c1", AUG_2026);
    const b = await repo.getChildAttendance("c2", AUG_2026);

    expect(a1).toEqual(a2);
    expect(a1.map((r) => r.status)).not.toEqual(b.map((r) => r.status));
  });

  it("drops classId — records carry only date + status", async () => {
    const records =
      await new MockChildAttendanceRepository().getChildAttendance(
        "c1",
        AUG_2026,
      );

    expect(Object.keys(records[0]).sort()).toEqual(["date", "status"]);
  });

  it("returns an empty list for a weekend-only range", async () => {
    const records =
      await new MockChildAttendanceRepository().getChildAttendance("c1", {
        startDate: "2026-08-01",
        endDate: "2026-08-02",
      });

    expect(records).toEqual([]);
  });
});
