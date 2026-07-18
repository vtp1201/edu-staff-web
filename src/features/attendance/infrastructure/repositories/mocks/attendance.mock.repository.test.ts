import { describe, expect, it } from "vitest";
import { MockAttendanceRepository } from "./attendance.mock.repository";

describe("MockAttendanceRepository", () => {
  it("models the class+date, 4-state, no-period contract", async () => {
    const repo = new MockAttendanceRepository();
    const classes = await repo.getMyHomeroomClasses();
    expect(classes.length).toBeGreaterThan(0);

    const roster = await repo.getClassAttendance(classes[0].id, "2026-06-07");
    expect(roster.classDate).toEqual({
      classId: classes[0].id,
      date: "2026-06-07",
    });
    expect(roster.records.length).toBeGreaterThan(0);
    for (const r of roster.records) {
      expect(["present", "absent", "late", "excusedAbsent"]).toContain(
        r.status,
      );
    }
  });

  it("throws not-found for an unknown class", async () => {
    const repo = new MockAttendanceRepository();
    await expect(
      repo.getClassAttendance("does-not-exist", "2026-06-07"),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("resolves saveClassAttendance without throwing", async () => {
    const repo = new MockAttendanceRepository();
    await expect(
      repo.saveClassAttendance("10A1", "2026-06-07", []),
    ).resolves.toBeUndefined();
  });

  it("aggregates a bounded history range into per-day summaries", async () => {
    const repo = new MockAttendanceRepository();
    const history = await repo.getAttendanceHistory(
      "10A1",
      "2026-06-01",
      "2026-06-03",
    );
    expect(history).toHaveLength(3);
    for (const day of history) {
      const total =
        day.counts.present +
        day.counts.absent +
        day.counts.late +
        day.counts.excusedAbsent;
      expect(total).toBe(day.totalStudents);
    }
  });

  it("returns [] history for an unknown class instead of throwing", async () => {
    const repo = new MockAttendanceRepository();
    const history = await repo.getAttendanceHistory(
      "does-not-exist",
      "2026-06-01",
      "2026-06-03",
    );
    expect(history).toEqual([]);
  });
});
