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
    // Defensive regression guard for the pre-US-E18.58 contract
    // (`toMessageDTO(msg, "")`): an empty string must NOT become a rendered
    // name. BE no longer emits it, but the fallback path stays cheap to keep.
    const [pinned] = toPinnedMessages([
      row({ message: { ...MESSAGE, senderName: "" } }),
    ]);
    expect(Object.keys(pinned)).not.toContain("senderName");
  });

  it("omits senderName when BE sends the literal unresolved-sender sentinel", () => {
    // US-E18.58 — the sender is not yet projected, so BE emits its generic
    // English placeholder "Member". Rendering it verbatim would show an
    // English word to a Vietnamese-locale user; it must take the SAME
    // "absent → i18n fallback" path as the empty string.
    const [pinned] = toPinnedMessages([
      row({ message: { ...MESSAGE, senderName: "Member" } }),
    ]);
    expect(Object.keys(pinned)).not.toContain("senderName");
  });

  it("treats the sentinel as absent even when padded (trim before compare)", () => {
    const [pinned] = toPinnedMessages([
      row({ message: { ...MESSAGE, senderName: "  Member  " } }),
    ]);
    expect(Object.keys(pinned)).not.toContain("senderName");
  });

  it("keeps a REAL name that merely contains the sentinel word (exact match only)", () => {
    const [pinned] = toPinnedMessages([
      row({ message: { ...MESSAGE, senderName: "Member Nguyễn" } }),
    ]);
    expect(pinned.senderName).toBe("Member Nguyễn");
  });

  it("passes the server-resolved senderName through verbatim", () => {
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
