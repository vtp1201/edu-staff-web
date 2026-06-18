import { describe, expect, it, vi } from "vitest";
import type { AnnouncementEntity } from "../entities/announcement.entity";
import type { IAnnouncementRepository } from "../repositories/i-announcement.repository";
import { GetAnnouncementsUseCase } from "./get-announcements.use-case";

const items: AnnouncementEntity[] = [
  {
    id: "a1",
    title: "T",
    body: "B",
    priority: "normal",
    status: "sent",
    audience: ["all"],
    gradeFilter: [],
    recipientCount: 1,
    readCount: 0,
    scheduledAt: null,
    sentAt: "2026-06-18",
    createdAt: "2026-06-18",
    authorName: "Admin",
  },
];

describe("GetAnnouncementsUseCase", () => {
  it("delegates to repo.listAnnouncements with the filter", async () => {
    const repo: IAnnouncementRepository = {
      listAnnouncements: vi.fn(async () => items),
      createAnnouncement: vi.fn(),
      updateAnnouncement: vi.fn(),
      deleteAnnouncement: vi.fn(),
      getRecipients: vi.fn(),
      sendReminder: vi.fn(),
    };
    const uc = new GetAnnouncementsUseCase(repo);
    const res = await uc.execute("sent");
    expect(repo.listAnnouncements).toHaveBeenCalledWith("sent");
    expect(res).toEqual(items);
  });
});
