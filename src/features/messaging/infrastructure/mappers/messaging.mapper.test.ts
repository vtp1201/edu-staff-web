import { describe, expect, it } from "vitest";
import type { ContactResponseDto } from "../dtos/contact-response.dto";
import type { ConversationResponseDto } from "../dtos/conversation-response.dto";
import type { MessageResponseDto } from "../dtos/message-response.dto";
import type { PresenceResponseDto } from "../dtos/presence-response.dto";
import {
  toContactEntity,
  toConversationEntity,
  toMessageEntity,
  toPresenceRecord,
} from "./messaging.mapper";

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

  describe("toPresenceRecord (INT-401, US-E10.6)", () => {
    it("maps status → presence and keeps memberId/lastActiveAt", () => {
      const dto: PresenceResponseDto = {
        memberId: "u1",
        status: "recent",
        lastActiveAt: "2026-07-14T09:57:00Z",
      };

      expect(toPresenceRecord(dto)).toEqual({
        memberId: "u1",
        presence: "recent",
        lastActiveAt: "2026-07-14T09:57:00Z",
      });
    });
  });
});
