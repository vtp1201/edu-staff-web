import { describe, expect, it, vi } from "vitest";
import type { IAnnouncementRepository } from "../repositories/i-announcement.repository";
import { DeleteAnnouncementUseCase } from "./delete-announcement.use-case";

function makeRepo(
  over: Partial<IAnnouncementRepository> = {},
): IAnnouncementRepository {
  return {
    listAnnouncements: vi.fn(),
    createAnnouncement: vi.fn(),
    updateAnnouncement: vi.fn(),
    deleteAnnouncement: vi.fn(),
    getRecipients: vi.fn(),
    sendReminder: vi.fn(),
    ...over,
  };
}

describe("DeleteAnnouncementUseCase", () => {
  it("ok — delegates to repo.deleteAnnouncement", async () => {
    const repo = makeRepo();
    const uc = new DeleteAnnouncementUseCase(repo);
    await uc.execute("a1");
    expect(repo.deleteAnnouncement).toHaveBeenCalledWith("a1");
  });

  it("not-found — rethrows repo failure", async () => {
    const repo = makeRepo({
      deleteAnnouncement: vi.fn(async () => {
        throw { type: "not-found" };
      }),
    });
    const uc = new DeleteAnnouncementUseCase(repo);
    await expect(uc.execute("missing")).rejects.toEqual({ type: "not-found" });
  });
});
