import { describe, expect, it } from "vitest";
import type { ContactResponseDto } from "../dtos/contact-response.dto";
import type { ConversationResponseDto } from "../dtos/conversation-response.dto";
import type { MessageResponseDto } from "../dtos/message-response.dto";
import type { PresenceResponseDto } from "../dtos/presence-response.dto";
import type { RoomMessageResponseDto } from "../dtos/room-message-response.dto";
import type { RoomSummaryResponseDto } from "../dtos/room-summary-response.dto";
import {
  toContactEntity,
  toConversationEntity,
  toConversationEntityFromRoom,
  toMessageEntity,
  toMessageEntityFromRoom,
  toPresenceRecord,
} from "./messaging.mapper";
import { formatWireTimestamp, roomColorKey, roomInitials } from "./room-derive";

describe("messaging.mapper", () => {
  describe("toConversationEntity", () => {
    it("maps all fields for a direct conversation", () => {
      const dto: ConversationResponseDto = {
        id: "u1",
        type: "direct",
        name: "Trần Minh Quân",
        avatarInitials: "TQ",
        color: "success",
        lastMessage: "Chào cô",
        lastMessageTime: "10:15",
        unreadCount: 1,
        isOnline: true,
      };

      expect(toConversationEntity(dto)).toEqual({
        id: "u1",
        type: "direct",
        name: "Trần Minh Quân",
        avatarInitials: "TQ",
        color: "success",
        lastMessage: "Chào cô",
        lastMessageTime: "10:15",
        unreadCount: 1,
        isOnline: true,
        memberCount: undefined,
      });
    });

    it("maps a group conversation with memberCount and no online flag", () => {
      const dto: ConversationResponseDto = {
        id: "g1",
        type: "group",
        name: "Lớp 11B2 — Toán",
        avatarInitials: "11B2",
        color: "primary",
        lastMessage: "Bài tập trang 87",
        lastMessageTime: "08:15",
        unreadCount: 3,
        memberCount: 33,
      };

      const entity = toConversationEntity(dto);
      expect(entity.type).toBe("group");
      expect(entity.memberCount).toBe(33);
      expect(entity.isOnline).toBeUndefined();
    });
  });

  describe("toMessageEntity", () => {
    it("maps an own message with optional fields absent", () => {
      const dto: MessageResponseDto = {
        id: "m1",
        conversationId: "u1",
        from: "me",
        text: "Dạ thầy",
        time: "08:45",
        date: "Hôm nay",
      };

      expect(toMessageEntity(dto)).toEqual({
        id: "m1",
        conversationId: "u1",
        from: "me",
        text: "Dạ thầy",
        time: "08:45",
        date: "Hôm nay",
        senderName: undefined,
        senderInitials: undefined,
        senderColor: undefined,
      });
    });

    it("maps a group 'other' message including sender fields", () => {
      const dto: MessageResponseDto = {
        id: "m2",
        conversationId: "g1",
        from: "other",
        text: "Cô ơi",
        time: "07:30",
        date: "Hôm nay",
        senderName: "Trần Văn Bình",
        senderInitials: "TB",
        senderColor: "teal",
      };

      const entity = toMessageEntity(dto);
      expect(entity.from).toBe("other");
      expect(entity.senderName).toBe("Trần Văn Bình");
      expect(entity.senderColor).toBe("teal");
    });
  });

  describe("toContactEntity", () => {
    it("maps all contact fields", () => {
      const dto: ContactResponseDto = {
        id: "u1",
        name: "Trần Minh Quân",
        role: "Hiệu trưởng",
        avatarInitials: "TQ",
        color: "success",
        isOnline: true,
      };

      expect(toContactEntity(dto)).toEqual({
        id: "u1",
        name: "Trần Minh Quân",
        role: "Hiệu trưởng",
        avatarInitials: "TQ",
        color: "success",
        isOnline: true,
      });
    });

    // US-E10.6 — additive presence passthrough.
    it("carries presence/lastActiveAt when present on the DTO", () => {
      const dto: ContactResponseDto = {
        id: "u2",
        name: "Phạm Quốc Bảo",
        role: "Giáo viên Văn",
        avatarInitials: "PB",
        color: "purple",
        isOnline: false,
        presence: "recent",
        lastActiveAt: "2026-07-14T09:57:00Z",
      };

      const entity = toContactEntity(dto);
      expect(entity.presence).toBe("recent");
      expect(entity.lastActiveAt).toBe("2026-07-14T09:57:00Z");
    });

    it("leaves presence/lastActiveAt undefined when absent (never defaults)", () => {
      const dto: ContactResponseDto = {
        id: "u3",
        name: "Nguyễn Văn Đức",
        role: "Phụ huynh",
        avatarInitials: "ND",
        color: "purple",
        isOnline: true,
      };

      const entity = toContactEntity(dto);
      expect(entity.presence).toBeUndefined();
      expect(entity.lastActiveAt).toBeUndefined();
    });
  });

  describe("toConversationEntity — presence passthrough (US-E10.6)", () => {
    it("carries a direct conversation's presence/lastActiveAt", () => {
      const dto: ConversationResponseDto = {
        id: "u1",
        type: "direct",
        name: "Trần Minh Quân",
        avatarInitials: "TQ",
        color: "success",
        lastMessage: "Chào cô",
        lastMessageTime: "10:15",
        unreadCount: 0,
        isOnline: true,
        presence: "online",
        lastActiveAt: "2026-07-14T10:00:00Z",
      };

      const entity = toConversationEntity(dto);
      expect(entity.presence).toBe("online");
      expect(entity.lastActiveAt).toBe("2026-07-14T10:00:00Z");
    });
  });

  // --- US-E18.17 real `social` room → domain mappers ---

  describe("toConversationEntityFromRoom", () => {
    const base: RoomSummaryResponseDto = {
      roomId: "room-1",
      scope: "SCHOOL",
      tenantId: "t1",
      roomType: "class_chat",
      name: "Lớp 11B2 — Toán",
      lastMessagePreview: "Bài tập trang 87",
      lastMessageAt: "2026-07-20T08:15:00.000Z",
      status: "active",
      requestStatus: "accepted",
    };

    it("maps a provisioned-group room to a 'group' conversation", () => {
      const entity = toConversationEntityFromRoom(base);
      expect(entity.id).toBe("room-1");
      expect(entity.type).toBe("group");
      expect(entity.name).toBe("Lớp 11B2 — Toán");
      expect(entity.lastMessage).toBe("Bài tập trang 87");
      expect(entity.lastMessageTime).toBe(
        formatWireTimestamp(base.lastMessageAt).time,
      );
      expect(entity.avatarInitials).toBe(roomInitials(base.name));
      expect(entity.color).toBe(roomColorKey(base.roomId));
    });

    it("maps a dm room to a 'direct' conversation", () => {
      const entity = toConversationEntityFromRoom({
        ...base,
        roomId: "dm-9",
        roomType: "dm",
        name: "Trần Minh Quân",
      });
      expect(entity.type).toBe("direct");
    });

    it("defaults unreadCount to 0 (no unread field on the wire — ADR 0060 gap)", () => {
      expect(toConversationEntityFromRoom(base).unreadCount).toBe(0);
    });

    it("empties lastMessage when the preview is null/absent", () => {
      expect(
        toConversationEntityFromRoom({ ...base, lastMessagePreview: null })
          .lastMessage,
      ).toBe("");
    });
  });

  describe("toMessageEntityFromRoom", () => {
    const base: RoomMessageResponseDto = {
      messageId: "m-1",
      roomId: "room-1",
      senderUserId: "user-self",
      text: "Chào cả lớp",
      status: "active",
      editCount: 0,
      createdAt: "2026-07-20T03:15:00.000Z",
    };

    it("marks a message from the current user as 'me'", () => {
      const entity = toMessageEntityFromRoom(base, "user-self");
      expect(entity.from).toBe("me");
      expect(entity.id).toBe("m-1");
      expect(entity.conversationId).toBe("room-1");
      expect(entity.text).toBe("Chào cả lớp");
      expect(entity.sentAt).toBe(base.createdAt);
      expect(entity.time).toBe(formatWireTimestamp(base.createdAt).time);
      expect(entity.isDeleted).toBe(false);
    });

    it("marks a message from another user as 'other' (never 'system')", () => {
      const entity = toMessageEntityFromRoom(base, "someone-else");
      expect(entity.from).toBe("other");
      expect(entity.senderName).toBeUndefined();
      expect(entity.senderInitials).toBeUndefined();
    });

    it("treats a null currentUserId as 'other'", () => {
      expect(toMessageEntityFromRoom(base, null).from).toBe("other");
    });

    it("flags a deleted message and passes the wire text through untouched", () => {
      const entity = toMessageEntityFromRoom(
        { ...base, status: "deleted", text: "social_message_deleted" },
        "user-self",
      );
      expect(entity.isDeleted).toBe(true);
      expect(entity.text).toBe("social_message_deleted");
    });
  });

  describe("toPresenceRecord (US-E18.18 2-state → 3-state)", () => {
    const NOW = Date.parse("2026-07-14T10:00:00Z");

    it("maps online:true → 'online' (userId → memberId)", () => {
      const dto: PresenceResponseDto = {
        userId: "u1",
        online: true,
        lastSeen: null,
      };
      expect(toPresenceRecord(dto, NOW)).toEqual({
        memberId: "u1",
        presence: "online",
        lastActiveAt: "",
      });
    });

    it("derives 'recent' when offline but lastSeen is within 5 minutes", () => {
      const dto: PresenceResponseDto = {
        userId: "u2",
        online: false,
        lastSeen: "2026-07-14T09:57:00Z", // 3 min ago
      };
      const rec = toPresenceRecord(dto, NOW);
      expect(rec.presence).toBe("recent");
      expect(rec.lastActiveAt).toBe("2026-07-14T09:57:00Z");
    });

    it("derives 'offline' when lastSeen is older than 5 minutes", () => {
      const dto: PresenceResponseDto = {
        userId: "u3",
        online: false,
        lastSeen: "2026-07-14T09:50:00Z", // 10 min ago
      };
      expect(toPresenceRecord(dto, NOW).presence).toBe("offline");
    });

    it("derives 'offline' when offline with no lastSeen", () => {
      const dto: PresenceResponseDto = {
        userId: "u4",
        online: false,
        lastSeen: null,
      };
      expect(toPresenceRecord(dto, NOW)).toEqual({
        memberId: "u4",
        presence: "offline",
        lastActiveAt: "",
      });
    });

    it("treats exactly-at-the-boundary lastSeen as 'recent'", () => {
      const dto: PresenceResponseDto = {
        userId: "u5",
        online: false,
        lastSeen: "2026-07-14T09:55:00Z", // exactly 5 min ago
      };
      expect(toPresenceRecord(dto, NOW).presence).toBe("recent");
    });

    it("treats just-under-the-boundary lastSeen (5min - 1s) as 'recent'", () => {
      const dto: PresenceResponseDto = {
        userId: "u6",
        online: false,
        lastSeen: "2026-07-14T09:55:01Z", // 4 min 59s ago
      };
      expect(toPresenceRecord(dto, NOW).presence).toBe("recent");
    });

    it("treats just-over-the-boundary lastSeen (5min + 1s) as 'offline'", () => {
      const dto: PresenceResponseDto = {
        userId: "u7",
        online: false,
        lastSeen: "2026-07-14T09:54:59Z", // 5 min 1s ago
      };
      expect(toPresenceRecord(dto, NOW).presence).toBe("offline");
    });
  });
});
