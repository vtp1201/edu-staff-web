import { describe, expect, it } from "vitest";
import type { PinnedMessageResponseDto } from "../dtos/pinned-message-response.dto";
import { toPinnedMessages } from "./pinned-message.mapper";

const MESSAGE: NonNullable<PinnedMessageResponseDto["message"]> = {
  messageId: "m-1",
  roomId: "room-1",
  senderUserId: "u-1",
  text: "Nhắc lịch thi cuối kỳ",
  status: "active",
  editCount: 0,
  createdAt: "2026-08-01T03:15:00.000Z",
};

const row = (
  over: Partial<PinnedMessageResponseDto> = {},
): PinnedMessageResponseDto => ({
  messageId: "m-1",
  pinnedBy: "u-mod",
  pinnedAt: "2026-08-02T04:00:00.000Z",
  message: MESSAGE,
  ...over,
});

describe("toPinnedMessages (US-E18.51 real pin board)", () => {
  it("maps the embedded message content onto the pinned-row shape", () => {
    expect(toPinnedMessages([row()])).toEqual([
      {
        messageId: "m-1",
        senderId: "u-1",
        excerpt: "Nhắc lịch thi cuối kỳ",
        sentAt: "2026-08-01T03:15:00.000Z",
        pinnedAt: "2026-08-02T04:00:00.000Z",
        pinnedBy: "u-mod",
      },
    ]);
  });

  it("omits senderName entirely when the wire sends the empty string", () => {
    // The pin board calls toMessageDTO(msg, "") server-side — senderName is
    // never populated there. An empty string must NOT become a rendered name.
    const [pinned] = toPinnedMessages([
      row({ message: { ...MESSAGE, senderName: "" } }),
    ]);
    expect(Object.keys(pinned)).not.toContain("senderName");
  });

  it("passes a non-empty senderName through (forward-compatible if BE fills it)", () => {
    const [pinned] = toPinnedMessages([
      row({ message: { ...MESSAGE, senderName: "Cô Lan" } }),
    ]);
    expect(pinned.senderName).toBe("Cô Lan");
  });

  it("skips a row with no embedded message (pin-action shape / unresolvable pin)", () => {
    expect(toPinnedMessages([row({ message: undefined })])).toEqual([]);
  });

  it("skips a soft-deleted pinned message instead of rendering a broken row", () => {
    const deleted = row({
      message: { ...MESSAGE, status: "deleted", text: "" },
    });
    expect(toPinnedMessages([deleted])).toEqual([]);
  });

  it("preserves the server's newest-pin-first order (no client re-sort)", () => {
    const newest = row({
      messageId: "m-2",
      pinnedAt: "2026-08-03T04:00:00.000Z",
      message: { ...MESSAGE, messageId: "m-2" },
    });
    expect(toPinnedMessages([newest, row()]).map((p) => p.messageId)).toEqual([
      "m-2",
      "m-1",
    ]);
  });
});
