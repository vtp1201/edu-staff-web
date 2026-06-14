import { describe, expect, it, vi } from "vitest";
import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";
import { ApproveEntryUseCase } from "./approve-entry.use-case";

const entry = {
  entryId: "e-1",
  classId: "c-1",
  entryDate: "2026-04-29",
  summary: "Đạo hàm",
  status: "APPROVED",
  authorMemberId: "m-1",
  decidedBy: "p-1",
  decidedAt: "2026-04-29T03:00:00Z",
  createdAt: "2026-04-29T01:00:00Z",
  updatedAt: "2026-04-29T03:00:00Z",
} satisfies HomeroomEntry;

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

describe("ApproveEntryUseCase", () => {
  it("delegates to repo.approveEntry", async () => {
    const approveEntry = vi.fn().mockResolvedValue(entry);
    const useCase = new ApproveEntryUseCase(makeRepo({ approveEntry }));

    const res = await useCase.execute("c-1", "e-1");

    expect(approveEntry).toHaveBeenCalledWith("c-1", "e-1");
    expect(res.status).toBe("APPROVED");
  });
});
