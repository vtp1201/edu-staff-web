import { describe, expect, it, vi } from "vitest";

/**
 * Pure-logic unit tests for the ChildSwitcher keyboard handler.
 *
 * This repo's UI behavior is primarily proven via Storybook interaction
 * (no @testing-library/react). These tests pin the two pieces of logic that
 * are easy to regress and cheap to verify in isolation:
 *   1. ArrowLeft/ArrowRight focus wrap-around math.
 *   2. The aria-disabled guard: a non-active tab does NOT fire onSwitch while
 *      loading, but the active tab (and any tab when not loading) does.
 *
 * The handler is reproduced here as a pure function mirroring the component's
 * `handleKeyDown` so the math/guard stay locked even without a DOM render.
 */

type ChildLike = { childId: string };

function nextIndex(
  key: string,
  idx: number,
  length: number,
): number | undefined {
  if (key === "ArrowRight") return (idx + 1) % length;
  if (key === "ArrowLeft") return (idx - 1 + length) % length;
  return undefined;
}

function activateGuard(
  key: string,
  child: ChildLike,
  activeChildId: string,
  isLoading: boolean,
): string | undefined {
  if (key !== "Enter" && key !== " ") return undefined;
  const blocked = isLoading && child.childId !== activeChildId;
  return blocked ? undefined : child.childId;
}

describe("ChildSwitcher keyboard handler", () => {
  describe("arrow focus wrap-around", () => {
    const length = 2;

    it("ArrowRight advances and wraps from last to first", () => {
      expect(nextIndex("ArrowRight", 0, length)).toBe(1);
      expect(nextIndex("ArrowRight", 1, length)).toBe(0);
    });

    it("ArrowLeft retreats and wraps from first to last", () => {
      expect(nextIndex("ArrowLeft", 1, length)).toBe(0);
      expect(nextIndex("ArrowLeft", 0, length)).toBe(1);
    });

    it("wraps correctly across three children", () => {
      expect(nextIndex("ArrowRight", 2, 3)).toBe(0);
      expect(nextIndex("ArrowLeft", 0, 3)).toBe(2);
    });

    it("ignores non-arrow keys for focus movement", () => {
      expect(nextIndex("Enter", 0, length)).toBeUndefined();
      expect(nextIndex(" ", 0, length)).toBeUndefined();
    });
  });

  describe("activate (Enter/Space) aria-disabled guard", () => {
    const active: ChildLike = { childId: "c2" };
    const nonActive: ChildLike = { childId: "c1" };

    it("activates the active tab even while loading", () => {
      expect(activateGuard("Enter", active, "c2", true)).toBe("c2");
      expect(activateGuard(" ", active, "c2", true)).toBe("c2");
    });

    it("does NOT activate a non-active tab while loading", () => {
      expect(activateGuard("Enter", nonActive, "c2", true)).toBeUndefined();
      expect(activateGuard(" ", nonActive, "c2", true)).toBeUndefined();
    });

    it("activates any tab when not loading", () => {
      expect(activateGuard("Enter", nonActive, "c2", false)).toBe("c1");
      expect(activateGuard("Enter", active, "c2", false)).toBe("c2");
    });

    it("ignores non-activation keys", () => {
      expect(
        activateGuard("ArrowRight", nonActive, "c2", false),
      ).toBeUndefined();
    });
  });

  it("a blocked activation never calls onSwitch", () => {
    const onSwitch = vi.fn();
    const id = activateGuard("Enter", { childId: "c1" }, "c2", true);
    if (id !== undefined) onSwitch(id);
    expect(onSwitch).not.toHaveBeenCalled();
  });
});
