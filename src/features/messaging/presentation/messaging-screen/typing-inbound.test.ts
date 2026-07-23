import { describe, expect, it } from "vitest";
import { nextInboundTyping } from "./typing-inbound";

describe("nextInboundTyping (US-E18.18 inbound typing reducer)", () => {
  it("shows typing for the currently-open conversation on typing:true", () => {
    expect(nextInboundTyping(null, "room-1", "room-1", true)).toBe("room-1");
  });

  it("clears typing for the open conversation on typing:false", () => {
    expect(nextInboundTyping("room-1", "room-1", "room-1", false)).toBeNull();
  });

  it("ignores a typing frame for a DIFFERENT room (state unchanged)", () => {
    expect(nextInboundTyping(null, "room-1", "room-2", true)).toBeNull();
    expect(nextInboundTyping("room-1", "room-1", "room-2", true)).toBe(
      "room-1",
    );
  });

  it("ignores typing frames entirely when no conversation is open", () => {
    expect(nextInboundTyping(null, null, "room-2", true)).toBeNull();
  });
});
