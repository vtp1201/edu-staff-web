import { describe, expect, it } from "vitest";
import { formatWireTimestamp, roomColorKey, roomInitials } from "./room-derive";

const COLOR_KEYS = [
  "primary",
  "success",
  "warning",
  "error",
  "info",
  "purple",
  "teal",
];

describe("room-derive", () => {
  describe("roomInitials", () => {
    it("takes the first letters of the first two words, uppercased", () => {
      expect(roomInitials("Lớp 11B2")).toBe("L1");
      expect(roomInitials("nguyen van a")).toBe("NV");
    });

    it("takes the first two chars for a single-word name", () => {
      expect(roomInitials("Toán")).toBe("TO");
    });

    it("falls back to '?' for an empty/blank name", () => {
      expect(roomInitials("")).toBe("?");
      expect(roomInitials("   ")).toBe("?");
    });
  });

  describe("roomColorKey", () => {
    it("always returns one of the 7 semantic tone keys", () => {
      for (const id of [
        "a",
        "room-1",
        "550e8400-e29b-41d4-a716-446655440001",
      ]) {
        expect(COLOR_KEYS).toContain(roomColorKey(id));
      }
    });

    it("is stable (same id → same key)", () => {
      const id = "room-xyz";
      expect(roomColorKey(id)).toBe(roomColorKey(id));
    });
  });

  describe("formatWireTimestamp", () => {
    it("formats an ISO timestamp to local HH:MM + dd/mm/yyyy", () => {
      const iso = "2026-07-20T03:15:00.000Z";
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      expect(formatWireTimestamp(iso)).toEqual({
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
        date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      });
    });

    it("returns empty strings for an unparseable timestamp", () => {
      expect(formatWireTimestamp("not-a-date")).toEqual({ time: "", date: "" });
    });
  });
});
