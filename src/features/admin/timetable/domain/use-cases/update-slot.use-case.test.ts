import { describe, expect, it, vi } from "vitest";
import type { ConflictInfo, TimetableData } from "../entities/timetable.entity";
import type { TimetableSlot } from "../entities/timetable-slot.entity";
import type { ITimetableRepository } from "../repositories/i-timetable.repository";
import { UpdateSlotUseCase } from "./update-slot.use-case";

function fakeRepo(
  overrides: Partial<ITimetableRepository> = {},
): ITimetableRepository {
  return {
    getTimetable: vi.fn(
      async (): Promise<TimetableData> => ({
        classId: "cls-a",
        yearId: "y1",
        slots: {},
        conflicts: [],
      }),
    ),
    updateSlot: vi.fn(
      async (classId, _yearId, day, period, data): Promise<TimetableSlot> => ({
        slotKey: `${classId}|${day}|${period}`,
        classId,
        day,
        period,
        ...data,
      }),
    ),
    clearSlot: vi.fn(async () => {}),
    getConflicts: vi.fn(async (): Promise<ConflictInfo[]> => []),
    ...overrides,
  };
}

describe("UpdateSlotUseCase", () => {
  it("delegates to repo.updateSlot and returns the slot on success", async () => {
    const repo = fakeRepo();
    const useCase = new UpdateSlotUseCase(repo);

    const result = await useCase.execute({
      classId: "cls-a",
      yearId: "y1",
      day: 0,
      period: 1,
      data: { subjectId: "sub-math", teacherId: "tch-1", room: "P.201" },
    });

    expect(result.ok).toBe(true);
    expect(repo.updateSlot).toHaveBeenCalledWith("cls-a", "y1", 0, 1, {
      subjectId: "sub-math",
      teacherId: "tch-1",
      room: "P.201",
    });
    if (result.ok) expect(result.value.slotKey).toBe("cls-a|0|1");
  });

  it("trims the room before persisting", async () => {
    const repo = fakeRepo();
    const useCase = new UpdateSlotUseCase(repo);
    await useCase.execute({
      classId: "cls-a",
      yearId: "y1",
      day: 0,
      period: 1,
      data: { subjectId: "sub-math", teacherId: "tch-1", room: "  P.201  " },
    });
    expect(repo.updateSlot).toHaveBeenCalledWith(
      "cls-a",
      "y1",
      0,
      1,
      expect.objectContaining({ room: "P.201" }),
    );
  });

  it("fails with save-failed when subject is missing", async () => {
    const repo = fakeRepo();
    const useCase = new UpdateSlotUseCase(repo);
    const result = await useCase.execute({
      classId: "cls-a",
      yearId: "y1",
      day: 0,
      period: 1,
      data: { subjectId: "", teacherId: "tch-1", room: "P.201" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("save-failed");
    expect(repo.updateSlot).not.toHaveBeenCalled();
  });

  it("fails with save-failed when teacher is missing", async () => {
    const repo = fakeRepo();
    const useCase = new UpdateSlotUseCase(repo);
    const result = await useCase.execute({
      classId: "cls-a",
      yearId: "y1",
      day: 0,
      period: 1,
      data: { subjectId: "sub-math", teacherId: "", room: "P.201" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.type).toBe("save-failed");
  });
});
