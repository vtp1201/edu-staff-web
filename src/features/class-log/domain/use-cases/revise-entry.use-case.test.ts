import { describe, expect, it, vi } from "vitest";
import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";
import { ReviseEntryUseCase } from "./revise-entry.use-case";

const entry = {
  entryId: "e-1",
  classId: "c-1",
  entryDate: "2026-04-29",
  summary: "Đạo hàm",
  status: "SUBMITTED",
  authorMemberId: "m-1",
  createdAt: "2026-04-29T01:00:00Z",
  updatedAt: "2026-04-29T04:00:00Z",
} satisfies HomeroomEntry;

function makeRepo(
  over: Partial<IClassLogRepository> = {},
): IClassLogRepository {
  return {
    createEntry: vi.fn(),
    listEntries: vi.fn(),
    submitEntry: vi.fn(),
    reviseEntry: vi.fn(),
    approveEntry: vi.fn(),
    rejectEntry: vi.fn(),
    ...over,
  };
}

describe("ReviseEntryUseCase", () => {
  it("delegates to repo.reviseEntry", async () => {
    const reviseEntry = vi.fn().mockResolvedValue(entry);
    const useCase = new ReviseEntryUseCase(makeRepo({ reviseEntry }));

    const res = await useCase.execute("c-1", "e-1");

    expect(reviseEntry).toHaveBeenCalledWith("c-1", "e-1");
    expect(res.status).toBe("SUBMITTED");
  });
});
