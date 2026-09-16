import { describe, expect, it } from "vitest";
import { MockDisciplineRepository } from "./discipline.mock.repository";

/**
 * Regression guard for US-E24.20 (fix round).
 *
 * The leave fixtures were seeded with the class NAME in `classId` ("10A1"),
 * while the teacher-class mock ids are `cls-10a1…` and the principal
 * class-management mock ids are `c-10a1…`. Once the two dashboards started
 * fanning the inbox out over REAL class ids, an id-only match returned nothing
 * and both leave tabs silently rendered empty in `NEXT_PUBLIC_USE_MOCK=true`.
 *
 * The mock repository is the one seam that sees both id spaces, so it matches
 * on `classId` OR on the display `className` the fan-out always supplies.
 */
describe("MockDisciplineRepository.getLeaveRequests", () => {
  it("returns rows for a teacher-shaped call (cls-… id + class name)", async () => {
    const repo = new MockDisciplineRepository();
    const rows = await repo.getLeaveRequests({
      classId: "cls-10a1",
      className: "10A1",
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.className).toBe("10A1");
  });

  it("returns rows for a principal-shaped call (c-… id + class name)", async () => {
    const repo = new MockDisciplineRepository();
    const rows = await repo.getLeaveRequests({
      classId: "c-10a1",
      className: "10A1",
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.className).toBe("10A1");
  });

  it("still matches on classId alone when the fixtures' id space is used", async () => {
    const repo = new MockDisciplineRepository();
    const rows = await repo.getLeaveRequests({ classId: "11B2" });
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.classId).toBe("11B2");
  });

  it("returns every row when no class is supplied", async () => {
    const repo = new MockDisciplineRepository();
    const all = await repo.getLeaveRequests({});
    const one = await repo.getLeaveRequests({
      classId: "cls-10a1",
      className: "10A1",
    });
    expect(all.length).toBeGreaterThan(one.length);
  });

  it("returns nothing for a class that exists in neither id nor name space", async () => {
    const repo = new MockDisciplineRepository();
    const rows = await repo.getLeaveRequests({
      classId: "cls-9z9",
      className: "9Z9",
    });
    expect(rows).toEqual([]);
  });
});
