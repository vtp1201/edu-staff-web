import { describe, expect, it, vi } from "vitest";
import type { HomeroomEntry } from "../entities/homeroom-entry.entity";
import type { IClassLogRepository } from "../repositories/i-class-log.repository";
import { RejectEntryUseCase } from "./reject-entry.use-case";

const entry = {
  entryId: "e-1",
  classId: "c-1",
  entryDate: "2026-04-29",
  summary: "Đạo hàm",
  status: "REJECTED",
  authorMemberId: "m-1",
  decidedBy: "p-1",
  decidedAt: "2026-04-29T03:00:00Z",
  reason: "Thiếu nội dung",
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

describe("RejectEntryUseCase", () => {
  it("delegates to repo.rejectEntry passing reason", async () => {
    const rejectEntry = vi.fn().mockResolvedValue(entry);
    const useCase = new RejectEntryUseCase(makeRepo({ rejectEntry }));

    const res = await useCase.execute("c-1", "e-1", "Thiếu nội dung");

    expect(rejectEntry).toHaveBeenCalledWith("c-1", "e-1", "Thiếu nội dung");
    expect(res.status).toBe("REJECTED");
  });

  it("passes undefined reason when omitted", async () => {
    const rejectEntry = vi.fn().mockResolvedValue(entry);
    const useCase = new RejectEntryUseCase(makeRepo({ rejectEntry }));

    await useCase.execute("c-1", "e-1");

    expect(rejectEntry).toHaveBeenCalledWith("c-1", "e-1", undefined);
  });
});
