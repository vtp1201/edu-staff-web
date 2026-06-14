import { describe, expect, it, vi } from "vitest";
import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";
import { CreateEntryUseCase } from "./create-entry.use-case";

function makeEntry(over: Partial<HomeroomEntry> = {}): HomeroomEntry {
  return {
    entryId: "e-1",
    classId: "c-1",
    entryDate: "2026-04-29",
    summary: "Đạo hàm",
    status: "DRAFT",
    authorMemberId: "m-1",
    createdAt: "2026-04-29T01:00:00Z",
    updatedAt: "2026-04-29T01:00:00Z",
    ...over,
  };
}

function makeRepo(
  over: Partial<IClassLogRepository> = {},
): IClassLogRepository {
  return {
    createEntry: vi.fn(),
    listEntries: vi.fn(),
    submitEntry: vi.fn(),
    approveEntry: vi.fn(),
    rejectEntry: vi.fn(),
    ...over,
  };
}

describe("CreateEntryUseCase", () => {
  it("delegates to repo with valid summary", async () => {
    const entry = makeEntry();
    const createEntry = vi.fn().mockResolvedValue(entry);
    const useCase = new CreateEntryUseCase(makeRepo({ createEntry }));

    const res = await useCase.execute(
      "c-1",
      "2026-04-29",
      "Đạo hàm",
      "ghi chú",
    );

    expect(createEntry).toHaveBeenCalledWith(
      "c-1",
      "2026-04-29",
      "Đạo hàm",
      "ghi chú",
    );
    expect(res).toBe(entry);
  });

  it("throws summary-required failure for empty summary WITHOUT calling repo", async () => {
    const createEntry = vi.fn();
    const useCase = new CreateEntryUseCase(makeRepo({ createEntry }));

    await expect(
      useCase.execute("c-1", "2026-04-29", "   "),
    ).rejects.toMatchObject({ type: "unknown" });
    expect(createEntry).not.toHaveBeenCalled();
  });
});
