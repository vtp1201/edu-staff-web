/**
 * Integration tests for AnnouncementRepository (US-E10.3).
 * Tests the HTTP adapter + mapper + failure mapping via mock axios.
 * The http interceptor unwraps the envelope, so the mock returns payloads directly.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { CreateAnnouncementInput } from "../../domain/entities/announcement.entity";
import type { AnnouncementResponseDto } from "../dtos/announcement-response.dto";
import { AnnouncementRepository, toFailure } from "./announcement.repository";

function makeDto(
  over: Partial<AnnouncementResponseDto> = {},
): AnnouncementResponseDto {
  return {
    id: "a1",
    title: "Họp phụ huynh",
    body: "Nội dung thông báo họp",
    priority: "important",
    status: "sent",
    audience: ["all"],
    gradeFilter: [],
    recipientCount: 100,
    readCount: 30,
    scheduledAt: null,
    sentAt: "2026-06-18T03:00:00.000Z",
    createdAt: "2026-06-17T03:00:00.000Z",
    authorName: "Admin",
    ...over,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: test http stub mimics axios loosely
type HttpStub = Record<string, any>;

function makeHttp(over: HttpStub = {}): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

const validInput: CreateAnnouncementInput = {
  title: "Họp phụ huynh",
  body: "Nội dung thông báo họp phụ huynh.",
  priority: "normal",
  audience: ["all"],
  gradeFilter: [],
  sendMode: "now",
  scheduledAt: null,
};

describe("toFailure", () => {
  it("network-error for NETWORK_ERROR", () => {
    expect(
      toFailure(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      ),
    ).toEqual({ type: "network-error" });
  });
  it("unauthorized for 403", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 403,
        }),
      ),
    ).toEqual({ type: "unauthorized" });
  });
  it("not-found for 404", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 404,
        }),
      ),
    ).toEqual({ type: "not-found" });
  });
  it("unknown for 500", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 500,
        }),
      ),
    ).toEqual({ type: "unknown" });
  });
});

describe("AnnouncementRepository", () => {
  it("listAnnouncements maps payload to entities and omits status for 'all'", async () => {
    const get = vi.fn(async () => [makeDto(), makeDto({ id: "a2" })]);
    const repo = new AnnouncementRepository(makeHttp({ get }));
    const res = await repo.listAnnouncements("all");
    expect(get).toHaveBeenCalledWith("/noti/api/v1/announcements", {
      params: {},
    });
    expect(res).toHaveLength(2);
    expect(res[0]?.priority).toBe("important");
  });

  it("listAnnouncements passes status param for a status filter", async () => {
    const get = vi.fn(async () => []);
    const repo = new AnnouncementRepository(makeHttp({ get }));
    await repo.listAnnouncements("draft");
    expect(get).toHaveBeenCalledWith("/noti/api/v1/announcements", {
      params: { status: "draft" },
    });
  });

  it("createAnnouncement posts input and maps the result", async () => {
    const post = vi.fn(async () => makeDto());
    const repo = new AnnouncementRepository(makeHttp({ post }));
    const res = await repo.createAnnouncement(validInput);
    expect(post).toHaveBeenCalledWith("/noti/api/v1/announcements", validInput);
    expect(res.id).toBe("a1");
  });

  it("deleteAnnouncement maps a 404 to not-found", async () => {
    const del = vi.fn(async () => {
      throw new ApiError({
        code: "X",
        message: "x",
        retryable: false,
        status: 404,
      });
    });
    const repo = new AnnouncementRepository(makeHttp({ delete: del }));
    await expect(repo.deleteAnnouncement("missing")).rejects.toEqual({
      type: "not-found",
    });
  });

  it("sendReminder returns unreadCount payload", async () => {
    const post = vi.fn(async () => ({ unreadCount: 12 }));
    const repo = new AnnouncementRepository(makeHttp({ post }));
    expect(await repo.sendReminder("a1")).toEqual({ unreadCount: 12 });
  });
});
