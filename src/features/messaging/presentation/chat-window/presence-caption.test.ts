import { describe, expect, it } from "vitest";
import { derivePresenceCaptionKey } from "./presence-caption";

const NOW = Date.parse("2026-07-14T10:00:00Z");
const minutesAgo = (n: number) => new Date(NOW - n * 60_000).toISOString();

describe("derivePresenceCaptionKey", () => {
  it("online → onlineNow (no params)", () => {
    expect(derivePresenceCaptionKey("online", undefined, NOW)).toEqual({
      key: "onlineNow",
    });
  });

  it("recent → activeMinutesAgo with n from real elapsed time", () => {
    expect(derivePresenceCaptionKey("recent", minutesAgo(3), NOW)).toEqual({
      key: "activeMinutesAgo",
      n: 3,
    });
  });

  it("recent → clamps n to at least 1 minute", () => {
    expect(derivePresenceCaptionKey("recent", minutesAgo(0), NOW)).toEqual({
      key: "activeMinutesAgo",
      n: 1,
    });
  });

  it("recent without a lastActiveAt bucket → defaults n to 1", () => {
    expect(derivePresenceCaptionKey("recent", undefined, NOW)).toEqual({
      key: "activeMinutesAgo",
      n: 1,
    });
  });

  it("offline WITH a known bucket → activeYesterday", () => {
    expect(derivePresenceCaptionKey("offline", minutesAgo(2880), NOW)).toEqual({
      key: "activeYesterday",
    });
  });

  it("offline WITHOUT a bucket → null (no caption, OQ-1 resolution)", () => {
    expect(derivePresenceCaptionKey("offline", undefined, NOW)).toEqual({
      key: null,
    });
  });
});
