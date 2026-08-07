import { describe, expect, it } from "vitest";
import { isMessagingErrorKey } from "./messaging-error-key";

describe("isMessagingErrorKey", () => {
  it("accepts the US-E18.51 pin failure keys", () => {
    expect(isMessagingErrorKey("pin-limit-reached")).toBe(true);
    expect(isMessagingErrorKey("message-already-pinned")).toBe(true);
    expect(isMessagingErrorKey("message-not-pinned")).toBe(true);
    expect(isMessagingErrorKey("pin-forbidden")).toBe(true);
    expect(isMessagingErrorKey("load-pinned-failed")).toBe(true);
  });

  it("rejects a non-key rejection message so it never reaches t()", () => {
    expect(isMessagingErrorKey("Network request failed")).toBe(false);
    expect(isMessagingErrorKey("")).toBe(false);
  });

  it("rejects inherited Object properties (hasOwn, not `in`)", () => {
    expect(isMessagingErrorKey("toString")).toBe(false);
    expect(isMessagingErrorKey("constructor")).toBe(false);
  });
});
