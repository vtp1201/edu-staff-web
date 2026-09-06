/**
 * US-E24.16 — the "hide when the parent has a single child" rule.
 *
 * The packet assumed a `hideWhenSingle` prop on the shared `ChildSwitcher`.
 * That prop does not exist, and the two shipped callers already disagree about
 * single-child gating (`grade-book-screen` gates before mounting the switcher,
 * `parent-attendance-screen` renders it for any non-empty list), so there is no
 * shared convention a component-level prop could preserve. The gate therefore
 * lives HERE, at the VM-builder level, exactly like `grade-book-screen`'s
 * `showChildSwitcher` — keeping this story's diff additive to `academic-records`
 * and leaving `components/shared/child-switcher/` byte-identical.
 */
import { describe, expect, it } from "vitest";
import type { ChildSwitcherChild } from "@/components/shared/child-switcher";
import { buildChildSwitcherVM } from "./build-child-switcher-vm";

function child(childId: string, ordinal: number): ChildSwitcherChild {
  return {
    childId,
    name: `Con ${ordinal}`,
    className: `10A${ordinal}`,
    ordinal,
    avatar: "CN",
    color: ordinal === 1 ? "primary" : "success",
  };
}

describe("buildChildSwitcherVM", () => {
  it("returns undefined when the parent has no linked children", () => {
    expect(buildChildSwitcherVM([], "st-1")).toBeUndefined();
  });

  it("returns undefined for a single child (nothing to switch between)", () => {
    expect(buildChildSwitcherVM([child("st-1", 1)], "st-1")).toBeUndefined();
  });

  it("returns a VM whose active tab is the child of the CURRENT route", () => {
    const list = [child("st-1", 1), child("st-2", 2)];

    expect(buildChildSwitcherVM(list, "st-2")).toEqual({
      childList: list,
      activeChildId: "st-2",
    });
  });

  it("preserves the child list order handed in (stable roster ordinals)", () => {
    const list = [child("st-1", 1), child("st-2", 2), child("st-3", 3)];

    expect(
      buildChildSwitcherVM(list, "st-1")?.childList.map((c) => c.childId),
    ).toEqual(["st-1", "st-2", "st-3"]);
  });

  it("still returns a VM when the route's studentId is NOT a linked child", () => {
    // AC #4: a foreign `studentId` surfaces the BE's own 403 as `forbidden`,
    // and the selector must STILL render so the parent can navigate back to a
    // real child. "No active tab" is a render outcome of an `activeChildId`
    // that matches nothing — never a reason to hide the switcher, and never a
    // reason to silently retarget the route at a child we guessed.
    const list = [child("st-1", 1), child("st-2", 2)];
    const vm = buildChildSwitcherVM(list, "foreign-999");

    expect(vm).toEqual({ childList: list, activeChildId: "foreign-999" });
    expect(vm?.childList.some((c) => c.childId === vm.activeChildId)).toBe(
      false,
    );
  });
});
