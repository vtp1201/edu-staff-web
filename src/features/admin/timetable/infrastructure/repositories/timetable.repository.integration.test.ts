import { beforeEach, describe, expect, it } from "vitest";
import { MockTimetableRepository } from "./mocks/timetable.mock.repository";

const YEAR = "2025-2026";

/**
 * Integration test at the repository boundary using the in-memory mock repo.
 * Verifies the seed's planted conflicts and the assign→conflict / clear→resolve
 * round-trips that the SlotEditor exercises.
 */
describe("MockTimetableRepository (integration)", () => {
  beforeEach(() => {
    MockTimetableRepository.reset();
  });

  it("seed data has exactly 3 conflicts (tch-1 Mon-1, tch-2 Tue-3, tch-5 Wed-4)", async () => {
    const repo = new MockTimetableRepository();
    const conflicts = await repo.getConflicts("cls-10a1", YEAR);
    expect(conflicts).toHaveLength(3);

    const find = (teacherId: string, day: number, period: number) =>
      conflicts.find(
        (c) =>
          c.teacherId === teacherId && c.day === day && c.period === period,
      );
    expect(find("tch-1", 0, 1)).toBeDefined();
    expect(find("tch-2", 1, 3)).toBeDefined();
    expect(find("tch-5", 2, 4)).toBeDefined();
  });

  it("assigning a teacher already busy elsewhere creates a new conflict", async () => {
    const repo = new MockTimetableRepository();
    // tch-6 teaches 10a1 Tue(1)-period7. Assign tch-6 to 10a2 at the same slot.
    await repo.updateSlot("cls-10a2", YEAR, 1, 7, {
      subjectId: "sub-hist",
      teacherId: "tch-6",
      room: "P.202",
    });

    const conflicts = await repo.getConflicts("cls-10a2", YEAR);
    const newConflict = conflicts.find(
      (c) => c.teacherId === "tch-6" && c.day === 1 && c.period === 7,
    );
    expect(newConflict).toBeDefined();
    expect([...(newConflict?.classIds ?? [])].sort()).toEqual([
      "cls-10a1",
      "cls-10a2",
    ]);
    // Total grows from 3 → 4.
    expect(conflicts).toHaveLength(4);
  });

  it("clearing one side of a conflict removes that conflict", async () => {
    const repo = new MockTimetableRepository();
    // Resolve the planted tch-1 Mon-1 conflict by clearing 10a2's slot.
    await repo.clearSlot("cls-10a2", YEAR, 0, 1);

    const conflicts = await repo.getConflicts("cls-10a1", YEAR);
    const stillConflicting = conflicts.find(
      (c) => c.teacherId === "tch-1" && c.day === 0 && c.period === 1,
    );
    expect(stillConflicting).toBeUndefined();
    expect(conflicts).toHaveLength(2);
  });

  it("getTimetable returns only the requested class's slots plus school-wide conflicts", async () => {
    const repo = new MockTimetableRepository();
    const data = await repo.getTimetable("cls-10a2", YEAR);
    expect(
      Object.values(data.slots).every((s) => s.classId === "cls-10a2"),
    ).toBe(true);
    // Conflicts are school-wide (include the 10a1↔10a2 tch-1 clash).
    expect(data.conflicts).toHaveLength(3);
  });
});
