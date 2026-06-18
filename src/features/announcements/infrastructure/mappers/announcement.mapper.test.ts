import { describe, expect, it } from "vitest";
import type {
  AnnouncementRecipientDto,
  AnnouncementResponseDto,
} from "../dtos/announcement-response.dto";
import { mapAnnouncement, mapRecipient } from "./announcement.mapper";

const dto: AnnouncementResponseDto = {
  id: "a1",
  title: "Họp phụ huynh",
  body: "Nội dung thông báo",
  priority: "urgent",
  status: "sent",
  audience: ["all", "weird"],
  gradeFilter: ["10", "11"],
  recipientCount: 1280,
  readCount: 640,
  scheduledAt: null,
  sentAt: "2026-06-18T03:00:00.000Z",
  createdAt: "2026-06-17T03:00:00.000Z",
  authorName: "Admin",
};

describe("mapAnnouncement", () => {
  it("maps fields and formats dates (locale-stable date portion)", () => {
    const e = mapAnnouncement(dto);
    expect(e.id).toBe("a1");
    expect(e.priority).toBe("urgent");
    expect(e.status).toBe("sent");
    expect(e.recipientCount).toBe(1280);
    expect(e.sentAt).toMatch(/2026/);
    expect(e.createdAt).toMatch(/2026/);
  });

  it("drops unknown audience values and falls back unknown priority/status", () => {
    const e = mapAnnouncement({ ...dto, priority: "??", status: "??" });
    expect(e.audience).toEqual(["all"]);
    expect(e.priority).toBe("normal");
    expect(e.status).toBe("draft");
  });

  it("keeps null sentAt as null", () => {
    const e = mapAnnouncement({ ...dto, sentAt: null });
    expect(e.sentAt).toBeNull();
  });
});

describe("mapRecipient", () => {
  it("maps recipient fields", () => {
    const r: AnnouncementRecipientDto = {
      id: "r1",
      name: "Nguyễn Văn A",
      role: "teacher",
      readAt: "2026-06-18T04:00:00.000Z",
    };
    const mapped = mapRecipient(r);
    expect(mapped.id).toBe("r1");
    expect(mapped.name).toBe("Nguyễn Văn A");
    expect(mapped.readAt).toMatch(/2026/);
  });

  it("keeps unread (null readAt)", () => {
    const mapped = mapRecipient({
      id: "r2",
      name: "B",
      role: "parent",
      readAt: null,
    });
    expect(mapped.readAt).toBeNull();
  });
});
