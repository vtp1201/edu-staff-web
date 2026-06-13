import { describe, expect, it, vi } from "vitest";
import type { ITimetableRepository } from "../repositories/i-timetable.repository";
import { ClearSlotUseCase } from "./clear-slot.use-case";

describe("ClearSlotUseCase", () => {
  it("delegates to repo.clearSlot and returns ok", async () => {
    const clearSlot = vi.fn(async () => {});
    const repo = { clearSlot } as unknown as ITimetableRepository;
    const useCase = new ClearSlotUseCase(repo);

    const result = await useCase.execute("cls-a", "y1", 0, 1);

    expect(result.ok).toBe(true);
    expect(clearSlot).toHaveBeenCalledWith("cls-a", "y1", 0, 1);
  });
});
