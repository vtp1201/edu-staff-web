import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { MESSAGING_EP } from "@/bootstrap/endpoint/messaging.endpoint";
import { type ApiEnvelope, ApiError } from "@/bootstrap/lib/api-envelope";
import type { RoomMessageResponseDto } from "../dtos/room-message-response.dto";
import type { RoomSummaryResponseDto } from "../dtos/room-summary-response.dto";
import type { SchoolDmResponseDto } from "../dtos/school-dm-response.dto";
import { MessagingRepository } from "./messaging.repository";

const SELF = "user-self";

type Http = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

function makeHttp(over: Partial<Http> = {}): {
  http: AxiosInstance;
  mock: Http;
} {
  const mock: Http = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    ...over,
  };
  return { http: mock as unknown as AxiosInstance, mock };
}

function envelope<T>(
  data: T,
  pagination?: { nextCursor?: string | null; hasMore: boolean },
) {
  return {
    success: true,
    data,
    error: null,
    meta: {
      requestId: "req-1",
      timestamp: "t",
      ...(pagination
        ? {
            pagination: {
              nextCursor: pagination.nextCursor ?? null,
              hasMore: pagination.hasMore,
            },
          }
        : {}),
    },
  } as ApiEnvelope<T>;
}

const apiError = (code: string, status: number) =>
  new ApiError({ code, message: "boom", retryable: false, status });

const room: RoomSummaryResponseDto = {
  roomId: "room-1",
  scope: "SCHOOL",
  tenantId: "t1",
  roomType: "class_chat",
  name: "Lớp 11B2",
  lastMessagePreview: "Chào",
  lastMessageAt: "2026-07-20T08:15:00.000Z",
  status: "active",
  requestStatus: "accepted",
};

const message: RoomMessageResponseDto = {
  messageId: "m-1",
  roomId: "room-1",
  senderUserId: SELF,
  text: "Chào cả lớp",
  status: "active",
  editCount: 0,
  createdAt: "2026-07-20T03:15:00.000Z",
};

describe("MessagingRepository (real social contract)", () => {
  describe("getConversations", () => {
    it("lists rooms with a top-level raw:true and the self userId filter", async () => {
      const { http, mock } = makeHttp();
      mock.get.mockResolvedValue(envelope([room]));
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.getConversations();

      expect(mock.get).toHaveBeenCalledWith(MESSAGING_EP.rooms, {
        params: { userId: SELF },
        raw: true,
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value[0]?.id).toBe("room-1");
      expect(res.value[0]?.type).toBe("group");
    });

    it("fails fast without an HTTP call when currentUserId is null", async () => {
      const { http, mock } = makeHttp();
      const repo = new MessagingRepository(http, null);

      const res = await repo.getConversations();

      expect(mock.get).not.toHaveBeenCalled();
      expect(res).toEqual({
        ok: false,
        failure: {
          type: "load-conversations-failed",
          cause: "no-current-user",
        },
      });
    });

    it("maps an error code to load-conversations-failed", async () => {
      const { http, mock } = makeHttp();
      mock.get.mockRejectedValue(apiError("FORBIDDEN_ACTION", 403));
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.getConversations();
      expect(res).toEqual({
        ok: false,
        failure: {
          type: "load-conversations-failed",
          cause: "FORBIDDEN_ACTION",
        },
      });
    });
  });

  describe("getMessages", () => {
    it("reads real cursor pagination via raw:true + parseEnvelope", async () => {
      const { http, mock } = makeHttp();
      mock.get.mockResolvedValue(
        envelope([message], { nextCursor: "c2", hasMore: true }),
      );
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.getMessages("room-1", "c1");

      expect(mock.get).toHaveBeenCalledWith(
        MESSAGING_EP.roomMessages("room-1"),
        {
          params: { cursor: "c1" },
          raw: true,
        },
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.hasMore).toBe(true);
      expect(res.value.nextCursor).toBe("c2");
      expect(res.value.messages[0]?.from).toBe("me");
    });

    it("omits the cursor param on the first page", async () => {
      const { http, mock } = makeHttp();
      mock.get.mockResolvedValue(envelope([message], { hasMore: false }));
      const repo = new MessagingRepository(http, SELF);

      await repo.getMessages("room-1");

      expect(mock.get).toHaveBeenCalledWith(
        MESSAGING_EP.roomMessages("room-1"),
        {
          params: {},
          raw: true,
        },
      );
    });
  });

  describe("sendMessage", () => {
    it("posts { text } and maps the returned message", async () => {
      const { http, mock } = makeHttp();
      mock.post.mockResolvedValue(message);
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.sendMessage("room-1", "Chào cả lớp");

      expect(mock.post).toHaveBeenCalledWith(
        MESSAGING_EP.roomMessages("room-1"),
        {
          text: "Chào cả lớp",
        },
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.id).toBe("m-1");
    });
  });

  describe("deleteMessage", () => {
    it("returns ok(true) on 204", async () => {
      const { http, mock } = makeHttp();
      mock.delete.mockResolvedValue(undefined);
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.deleteMessage("room-1", "m-1");
      expect(mock.delete).toHaveBeenCalledWith(
        MESSAGING_EP.roomMessageById("room-1", "m-1"),
      );
      expect(res).toEqual({ ok: true, value: true });
    });

    it("maps 403 DELETE_WINDOW_EXPIRED to delete-window-expired", async () => {
      const { http, mock } = makeHttp();
      mock.delete.mockRejectedValue(apiError("DELETE_WINDOW_EXPIRED", 403));
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.deleteMessage("room-1", "m-1");
      expect(res).toEqual({
        ok: false,
        failure: { type: "delete-window-expired" },
      });
    });

    it("maps other delete errors to delete-message-failed (code, not message)", async () => {
      const { http, mock } = makeHttp();
      mock.delete.mockRejectedValue(apiError("NOT_MESSAGE_SENDER", 403));
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.deleteMessage("room-1", "m-1");
      expect(res).toEqual({
        ok: false,
        failure: { type: "delete-message-failed", cause: "NOT_MESSAGE_SENDER" },
      });
    });
  });

  describe("createConversation", () => {
    it("find-or-creates a 1:1 school DM and synthesizes the conversation", async () => {
      const { http, mock } = makeHttp();
      const dm: SchoolDmResponseDto = {
        roomId: "dm-42",
        created: true,
        requestStatus: "pending",
      };
      mock.post.mockResolvedValue(dm);
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.createConversation(["target-1"], "Quân");

      expect(mock.post).toHaveBeenCalledWith(MESSAGING_EP.schoolDms, {
        targetUserId: "target-1",
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value.id).toBe("dm-42");
      expect(res.value.type).toBe("direct");
      expect(res.value.name).toBe("Quân");
      expect(res.value.unreadCount).toBe(0);
    });

    it("rejects a multi-party group create without an HTTP call (no real contract)", async () => {
      const { http, mock } = makeHttp();
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.createConversation(["a", "b"], "Nhóm");

      expect(mock.post).not.toHaveBeenCalled();
      expect(res).toEqual({
        ok: false,
        failure: {
          type: "create-conversation-failed",
          cause: "group-not-supported-by-real-contract",
        },
      });
    });

    it("maps ROOM_DM_ROLE_PAIR_NOT_ALLOWED to create-conversation-failed", async () => {
      const { http, mock } = makeHttp();
      mock.post.mockRejectedValue(
        apiError("ROOM_DM_ROLE_PAIR_NOT_ALLOWED", 403),
      );
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.createConversation(["target-1"]);
      expect(res).toEqual({
        ok: false,
        failure: {
          type: "create-conversation-failed",
          cause: "ROOM_DM_ROLE_PAIR_NOT_ALLOWED",
        },
      });
    });
  });

  describe("markConversationRead", () => {
    it("posts to the read endpoint and returns ok(true)", async () => {
      const { http, mock } = makeHttp();
      mock.post.mockResolvedValue(undefined);
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.markConversationRead("room-1");
      expect(mock.post).toHaveBeenCalledWith(MESSAGING_EP.roomRead("room-1"));
      expect(res).toEqual({ ok: true, value: true });
    });

    it("maps an error to mark-read-failed", async () => {
      const { http, mock } = makeHttp();
      mock.post.mockRejectedValue(apiError("ROOM_NOT_MEMBER", 403));
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.markConversationRead("room-1");
      expect(res).toEqual({
        ok: false,
        failure: { type: "mark-read-failed", cause: "ROOM_NOT_MEMBER" },
      });
    });
  });

  describe("sendTypingIndicator", () => {
    it("posts { typing } and returns ok(true)", async () => {
      const { http, mock } = makeHttp();
      mock.post.mockResolvedValue(undefined);
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.sendTypingIndicator("room-1", true);
      expect(mock.post).toHaveBeenCalledWith(
        MESSAGING_EP.roomTyping("room-1"),
        {
          typing: true,
        },
      );
      expect(res).toEqual({ ok: true, value: true });
    });

    it("maps a 429 rate-limit to a normal failure Result (never throws)", async () => {
      const { http, mock } = makeHttp();
      mock.post.mockRejectedValue(apiError("TOO_MANY_REQUESTS", 429));
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.sendTypingIndicator("room-1", false);
      expect(res).toEqual({
        ok: false,
        failure: { type: "typing-signal-failed", cause: "TOO_MANY_REQUESTS" },
      });
    });
  });

  describe("unsupported methods (no real contract — ADR 0060)", () => {
    it("getContacts never silently succeeds and makes no HTTP call", async () => {
      const { http, mock } = makeHttp();
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.getContacts();
      expect(mock.get).not.toHaveBeenCalled();
      expect(res.ok).toBe(false);
    });

    it("createGroup never silently succeeds and makes no HTTP call", async () => {
      const { http, mock } = makeHttp();
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.createGroup({
        name: "n",
        kind: "class",
        color: "primary",
        memberIds: [],
      });
      expect(mock.post).not.toHaveBeenCalled();
      expect(res.ok).toBe(false);
    });

    it("pinMessage never silently succeeds and makes no HTTP call", async () => {
      const { http, mock } = makeHttp();
      const repo = new MessagingRepository(http, SELF);

      const res = await repo.pinMessage("room-1", "m-1");
      expect(mock.post).not.toHaveBeenCalled();
      expect(res.ok).toBe(false);
    });
  });
});
