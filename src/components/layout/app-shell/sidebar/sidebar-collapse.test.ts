import { describe, expect, it } from "vitest";
import {
  readCollapsed,
  SIDEBAR_COLLAPSE_KEY,
  writeCollapsed,
} from "./sidebar-collapse";

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    map,
  };
}

describe("sidebar-collapse persistence", () => {
  it("defaults to expanded when nothing is stored", () => {
    expect(readCollapsed(fakeStore())).toBe(false);
  });

  it("reads a persisted collapsed flag", () => {
    expect(readCollapsed(fakeStore({ [SIDEBAR_COLLAPSE_KEY]: "1" }))).toBe(
      true,
    );
    expect(readCollapsed(fakeStore({ [SIDEBAR_COLLAPSE_KEY]: "0" }))).toBe(
      false,
    );
  });

  it("round-trips a written value", () => {
    const store = fakeStore();
    writeCollapsed(store, true);
    expect(store.map.get(SIDEBAR_COLLAPSE_KEY)).toBe("1");
    expect(readCollapsed(store)).toBe(true);
    writeCollapsed(store, false);
    expect(readCollapsed(store)).toBe(false);
  });

  it("is safe when storage is unavailable (SSR / private mode)", () => {
    expect(readCollapsed(null)).toBe(false);
    expect(() => writeCollapsed(null, true)).not.toThrow();
  });
});
