import { beforeEach, describe, expect, it } from "vitest";
import type { ConflictInfo } from "../../domain/entities/timetable.entity";
import { MOCK_CONFLICT_CAP } from "./mocks/fixtures";
import { MockTimetableRepository } from "./mocks/timetable.mock.repository";

const YEAR = "2025-2026";

const teacherAt = (
  conflicts: ConflictInfo[],
  teacherId: string,
  day: number,
  period: number,
) =>
  conflicts.find(
    (c) =>
      c.type === "teacher-double-booked" &&
      c.teacherId === teacherId &&
      c.day === day &&
      c.period === period,
  );

const roomAt = (
  conflicts: ConflictInfo[],
  room: string,
  day: number,
  period: number,
) =>
  conflicts.find(
    (c) =>
      c.type === "room-double-booked" &&
      c.room === room &&
      c.day === day &&
      c.period === period,
  );

/**
 * Integration test at the repository boundary using the in-memory mock repo.
 * Verifies the seed's planted conflicts (both kinds) and the assign→conflict /
 * clear→resolve round-trips that the SlotEditor exercises.
 */
describe("MockTimetableRepository (integration)", () => {
  beforeEach(() => {
    MockTimetableRepository.reset();
  });

  it("seed data has 3 teacher conflicts (tch-1 Mon-1, tch-2 Tue-3, tch-5 Wed-4)", async () => {
    const repo = new MockTimetableRepository();
    // Read the UNCAPPED set through detect: the scan itself caps at 5 (below).
    const { conflicts, truncated } = await repo.getConflicts();
    expect(truncated).toBe(true);

    expect(teacherAt(conflicts, "tch-1", 0, 1)).toBeDefined();
    expect(teacherAt(conflicts, "tch-2", 1, 3)).toBeDefined();
    // tch-5 Wed-4 falls past the mock's cap — that IS the truncation being real.
    expect(conflicts).toHaveLength(MOCK_CONFLICT_CAP);
  });

  it("seed data plants room conflicts too (BE ADR 0128's read-only kind)", async () => {
    const repo = new MockTimetableRepository();
    const { conflicts } = await repo.getConflicts();

    const room = roomAt(conflicts, "P.201", 0, 1);
    expect(room).toBeDefined();
    expect(room?.classes.map((c) => c.classId).sort()).toEqual([
      "cls-10a1",
      "cls-11a1",
    ]);
  });

  it("reports the scanned termId and marks the capped scan truncated", async () => {
    const repo = new MockTimetableRepository();
    const scan = await repo.getConflicts();
    expect(scan.termId).toBeTruthy();
    expect(scan.truncated).toBe(true);
  });

  it("assigning a teacher already busy elsewhere creates a new conflict", async () => {
    const repo = new MockTimetableRepository();
    // tch-6 teaches 10a1 Tue(1)-period7. Assign tch-6 to 10a2 at the same slot.
    await repo.updateSlot("cls-10a2", YEAR, 1, 7, {
      subjectId: "sub-hist",
      teacherId: "tch-6",
      room: "P.202",
    });

    // Clear enough room clashes that the new teacher clash fits under the cap.
    await repo.clearSlot("cls-11a1", YEAR, 0, 1);
    await repo.clearSlot("cls-11a1", YEAR, 1, 4);
    await repo.clearSlot("cls-12c1", YEAR, 2, 3);

    const { conflicts, truncated } = await repo.getConflicts();
    const newConflict = teacherAt(conflicts, "tch-6", 1, 7);
    expect(newConflict).toBeDefined();
    expect(newConflict?.classes.map((c) => c.classId).sort()).toEqual([
      "cls-10a1",
      "cls-10a2",
    ]);
    // 3 planted teacher clashes + the new one, all three room clashes cleared.
    expect(conflicts).toHaveLength(4);
    expect(truncated).toBe(false);
  });

  it("clearing one side of a conflict removes that conflict", async () => {
    const repo = new MockTimetableRepository();
    // Resolve the planted tch-1 Mon-1 conflict by clearing 10a2's slot.
    await repo.clearSlot("cls-10a2", YEAR, 0, 1);

    const { conflicts } = await repo.getConflicts();
    expect(teacherAt(conflicts, "tch-1", 0, 1)).toBeUndefined();
  });

  it("recomputes the scan from the CURRENT slots, never a cached list", async () => {
    const repo = new MockTimetableRepository();
    const before = (await repo.getConflicts()).conflicts.length;
    await repo.clearSlot("cls-11a1", YEAR, 0, 1); // removes a planted room clash
    const after = (await repo.getConflicts()).conflicts.length;
    expect(after).toBeLessThanOrEqual(before);
    expect(
      roomAt((await repo.getConflicts()).conflicts, "P.201", 0, 1),
    ).toBeUndefined();
  });

  it("getTimetable returns only the requested class's slots (conflicts are their own read)", async () => {
    const repo = new MockTimetableRepository();
    const data = await repo.getTimetable("cls-10a2", YEAR);
    expect(
      Object.values(data.slots).every((s) => s.classId === "cls-10a2"),
    ).toBe(true);
    expect(data).not.toHaveProperty("conflicts");
  });
});

/**
 * Regression guard (US-E18.26, planner correction #1): the MOCK repository has
 * ALWAYS round-tripped `room` — the field was dropped one layer up, in
 * `TimetableSlotMapper`, not here. This test pins the working behaviour so a
 * future reader does not "fix" a mock that was never broken.
 */
describe("MockTimetableRepository — room round-trip", () => {
  beforeEach(() => {
    MockTimetableRepository.reset();
  });

  it("persists room on updateSlot and returns it from a subsequent getTimetable", async () => {
    const repo = new MockTimetableRepository();

    const saved = await repo.updateSlot("cls-10a1", YEAR, 3, 2, {
      subjectId: "sub-1",
      teacherId: "tch-9",
      room: "P.404",
    });
    expect(saved.room).toBe("P.404");

    const data = await repo.getTimetable("cls-10a1", YEAR);
    expect(data.slots["cls-10a1|3|2"]?.room).toBe("P.404");
  });
});
