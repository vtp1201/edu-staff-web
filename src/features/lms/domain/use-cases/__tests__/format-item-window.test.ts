import { describe, expect, it } from "vitest";
import { formatItemWindow } from "../format-item-window";

/** A fake formatter: the fn is injected, so the domain needs no Intl/next-intl. */
const fmt = (date: Date) => `«${date.toISOString().slice(0, 10)}»`;

describe("formatItemWindow", () => {
  it("returns a `range` when both boundaries exist", () => {
    expect(
      formatItemWindow(
        { startAt: "2026-04-20T07:00:00Z", dueAt: "2026-04-26T16:00:00Z" },
        fmt,
      ),
    ).toEqual({
      kind: "range",
      startText: "«2026-04-20»",
      dueText: "«2026-04-26»",
    });
  });

  it("returns `from` with only a start", () => {
    expect(
      formatItemWindow({ startAt: "2026-04-20T07:00:00Z", dueAt: null }, fmt),
    ).toEqual({ kind: "from", startText: "«2026-04-20»" });
  });

  it("returns `due` with only a deadline", () => {
    expect(
      formatItemWindow({ startAt: null, dueAt: "2026-04-26T16:00:00Z" }, fmt),
    ).toEqual({ kind: "due", dueText: "«2026-04-26»" });
  });

  it("returns `always` when the item has no window at all", () => {
    expect(formatItemWindow({ startAt: null, dueAt: null }, fmt)).toEqual({
      kind: "always",
    });
  });

  it("treats an unparseable boundary as absent rather than printing `Invalid Date`", () => {
    expect(
      formatItemWindow({ startAt: "nope", dueAt: "2026-04-26T16:00:00Z" }, fmt),
    ).toEqual({ kind: "due", dueText: "«2026-04-26»" });
    expect(formatItemWindow({ startAt: "nope", dueAt: "nope" }, fmt)).toEqual({
      kind: "always",
    });
  });
});
