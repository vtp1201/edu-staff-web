import { describe, expect, it } from "vitest";
import { MOCK_CONVERSATIONS } from "@/features/messaging/infrastructure/repositories/mocks/fixtures";
import { sortConversations } from "./conversation-list.sort";

/**
 * QA independent re-verification (US-E24.15) — separate from the engineer's
 * `conversation-list.sort.test.ts` (which uses a synthetic `conv()` helper).
 * This test sorts the REAL demo-mode fixture data (`MOCK_CONVERSATIONS`) to
 * confirm the review-round fix to `u5`/`g3` (previously missing
 * `lastMessageAt`, which made the default mock inbox look like a sort bug)
 * actually lands in a sensible, non-suspicious position — and that the
 * default-selected (first) row after sorting is a real, dated conversation,
 * not an artifact of raw array order.
 */
describe("MOCK_CONVERSATIONS sorted (QA independent check, US-E24.15)", () => {
  it("sorts the real demo fixtures into a deterministic, sensible desc order", () => {
    const sorted = sortConversations(MOCK_CONVERSATIONS);
    expect(sorted.map((c) => c.id)).toEqual([
      "u3",
      "u1",
      "g1",
      "g2",
      "g3",
      "u5",
      "u4",
      "g4",
    ]);
  });

  it("every fixture conversation carries a raw lastMessageAt (no fallback row hides a bug)", () => {
    const missing = MOCK_CONVERSATIONS.filter((c) => !c.lastMessageAt);
    expect(missing).toEqual([]);
  });

  it("u5 and g3 (the review-round fix) sort strictly between u4 and g2, not at either extreme", () => {
    const sorted = sortConversations(MOCK_CONVERSATIONS);
    const idx = (id: string) => sorted.findIndex((c) => c.id === id);
    expect(idx("g2")).toBeLessThan(idx("g3"));
    expect(idx("g3")).toBeLessThan(idx("u5"));
    expect(idx("u5")).toBeLessThan(idx("u4"));
  });

  it("the default auto-selected row (sorted[0]) is the most recently active real conversation (u3)", () => {
    const sorted = sortConversations(MOCK_CONVERSATIONS);
    expect(sorted[0]?.id).toBe("u3");
    expect(sorted[0]?.name).toBe("Nguyễn Văn Đức");
  });
});
