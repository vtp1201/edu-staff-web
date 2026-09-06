import { describe, expect, it } from "vitest";
import {
  decrementUnreadCount,
  type UnreadCountCache,
} from "./unread-count-cache";

/**
 * US-E24.13 — the bell dropdown decrements the shared
 * `["notifications","unread-count"]` cache OPTIMISTICALLY when a row is marked
 * read (AC: "badge bell giảm 1 ngay"). The cached value is `{ count }`, NOT a
 * bare number — the header, the centre and the SSE handler all agree on that
 * shape, so this pure reducer is unit-tested directly rather than only through
 * the mutation.
 */
describe("decrementUnreadCount", () => {
  it("decrements by one and keeps the { count } shape", () => {
    const next = decrementUnreadCount({ count: 3 });
    expect(next).toEqual({ count: 2 });
  });

  it("never goes below zero", () => {
    expect(decrementUnreadCount({ count: 0 })).toEqual({ count: 0 });
  });

  it("passes an undefined cache through untouched (nothing to roll back)", () => {
    expect(decrementUnreadCount(undefined)).toBeUndefined();
  });

  it("does not mutate the previous cache object (rollback needs it intact)", () => {
    const prev: UnreadCountCache = { count: 5 };
    decrementUnreadCount(prev);
    expect(prev).toEqual({ count: 5 });
  });
});
