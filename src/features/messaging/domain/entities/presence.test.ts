import { describe, expect, it } from "vitest";
import {
  isPresenceCountable,
  msgPresence,
  type PresenceState,
  presenceRank,
  sortByPresence,
} from "./presence";

describe("msgPresence (derivation — single source of truth)", () => {
  it("uses the explicit presence value when present", () => {
    expect(msgPresence({ presence: "recent", isOnline: false })).toBe("recent");
    expect(msgPresence({ presence: "offline", isOnline: true })).toBe(
      "offline",
    );
  });

  it("falls back to isOnline when presence is absent", () => {
    expect(msgPresence({ isOnline: true })).toBe("online");
    expect(msgPresence({ isOnline: false })).toBe("offline");
  });

  it("returns offline (never throws) when neither field is present", () => {
    expect(msgPresence({})).toBe("offline");
  });
});

describe("presenceRank", () => {
  it("ranks online=2, recent=1, offline=0", () => {
    expect(presenceRank("online")).toBe(2);
    expect(presenceRank("recent")).toBe(1);
    expect(presenceRank("offline")).toBe(0);
  });
});

describe("isPresenceCountable", () => {
  it("counts online and recent, excludes offline", () => {
    expect(isPresenceCountable("online")).toBe(true);
    expect(isPresenceCountable("recent")).toBe(true);
    expect(isPresenceCountable("offline")).toBe(false);
  });
});

describe("sortByPresence (stable, online-first)", () => {
  type M = { id: string; state: PresenceState };
  const get = (m: M) => m.state;

  it("orders online → recent → offline", () => {
    const input: M[] = [
      { id: "a", state: "offline" },
      { id: "b", state: "online" },
      { id: "c", state: "recent" },
    ];
    expect(sortByPresence(input, get).map((m) => m.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("is stable — preserves original relative order within the same bucket", () => {
    const input: M[] = [
      { id: "a", state: "online" },
      { id: "b", state: "online" },
      { id: "c", state: "recent" },
      { id: "d", state: "recent" },
      { id: "e", state: "online" },
    ];
    // online bucket keeps a,b,e order; recent bucket keeps c,d order.
    expect(sortByPresence(input, get).map((m) => m.id)).toEqual([
      "a",
      "b",
      "e",
      "c",
      "d",
    ]);
  });

  it("does not mutate the input array", () => {
    const input: M[] = [
      { id: "a", state: "offline" },
      { id: "b", state: "online" },
    ];
    const copy = [...input];
    sortByPresence(input, get);
    expect(input).toEqual(copy);
  });
});
