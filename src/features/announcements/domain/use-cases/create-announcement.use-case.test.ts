import { describe, expect, it, vi } from "vitest";
import type {
  AnnouncementEntity,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../entities/announcement.entity";
import type { AnnouncementFailure } from "../failures/announcement.failure";
import type { IAnnouncementRepository } from "../repositories/i-announcement.repository";
import { CreateAnnouncementUseCase } from "./create-announcement.use-case";

const NOW = new Date("2026-06-18T10:00:00.000Z").getTime();
const clock = () => NOW;

function makeEntity(
  over: Partial<AnnouncementEntity> = {},
): AnnouncementEntity {
  return {
    id: "a1",
    title: "Title here",
    body: "Body content long enough",
    priority: "normal",
    status: "sent",
    audience: ["all"],
    gradeFilter: [],
    recipientCount: 100,
    readCount: 0,
    scheduledAt: null,
    sentAt: "2026-06-18",
    createdAt: "2026-06-18",
    authorName: "Admin",
    ...over,
  };
}

function makeRepo(): IAnnouncementRepository {
  return {
    listAnnouncements: vi.fn(),
    createAnnouncement: vi.fn(async () => makeEntity()),
    updateAnnouncement: vi.fn(async () => makeEntity({ status: "draft" })),
    deleteAnnouncement: vi.fn(),
    getRecipients: vi.fn(),
    sendReminder: vi.fn(),
  };
}

const validInput: CreateAnnouncementInput = {
  title: "Họp phụ huynh",
  body: "Nội dung thông báo họp phụ huynh đầu năm.",
  priority: "normal",
  audience: ["all"],
  gradeFilter: [],
  sendMode: "now",
  scheduledAt: null,
};

async function expectFailure(
  p: Promise<unknown>,
  type: AnnouncementFailure["type"],
) {
  await expect(p).rejects.toEqual({ type });
}

describe("CreateAnnouncementUseCase", () => {
  it("ok — send now delegates to repo.createAnnouncement", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    const res = await uc.execute(validInput);
    expect(repo.createAnnouncement).toHaveBeenCalledWith(validInput);
    expect(res.status).toBe("sent");
  });

  it("ok — scheduled with a future date", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    const input: CreateAnnouncementInput = {
      ...validInput,
      sendMode: "scheduled",
      scheduledAt: new Date(NOW + 86_400_000).toISOString(),
    };
    await uc.execute(input);
    expect(repo.createAnnouncement).toHaveBeenCalledWith(input);
  });

  it("ok — draft save delegates to repo.updateAnnouncement (skips validation)", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    const draft: UpdateAnnouncementInput = {
      ...validInput,
      id: "draft-1",
      title: "x", // too short, but draft skips strict validation
    };
    const res = await uc.saveDraft(draft);
    expect(repo.updateAnnouncement).toHaveBeenCalledWith(draft);
    expect(res.status).toBe("draft");
  });

  it("title-too-short — < 5 chars", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    await expectFailure(
      uc.execute({ ...validInput, title: "abc" }),
      "title-too-short",
    );
    expect(repo.createAnnouncement).not.toHaveBeenCalled();
  });

  it("body-too-short — < 10 chars", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    await expectFailure(
      uc.execute({ ...validInput, body: "short" }),
      "body-too-short",
    );
  });

  it("no-audience — empty audience array", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    await expectFailure(
      uc.execute({ ...validInput, audience: [] }),
      "no-audience",
    );
  });

  it("schedule-past-date — scheduledAt in the past", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    const input: CreateAnnouncementInput = {
      ...validInput,
      sendMode: "scheduled",
      scheduledAt: new Date(NOW - 1000).toISOString(),
    };
    await expectFailure(uc.execute(input), "schedule-past-date");
  });

  it("schedule-past-date — scheduled with null date", async () => {
    const repo = makeRepo();
    const uc = new CreateAnnouncementUseCase(repo, clock);
    await expectFailure(
      uc.execute({ ...validInput, sendMode: "scheduled", scheduledAt: null }),
      "schedule-past-date",
    );
  });
});
