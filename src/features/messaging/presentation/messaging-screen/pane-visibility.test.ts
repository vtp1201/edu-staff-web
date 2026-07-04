import { describe, expect, it } from "vitest";
import {
  BACK_BUTTON_CLASS,
  chatPaneClass,
  listPaneClass,
  paneAriaHidden,
} from "./pane-visibility";

/**
 * US-E17.3 — mobile single-pane slide + a11y.
 *
 * Vitest runs in the `node` env (no @testing-library/react); DOM behaviour is
 * proven by the Storybook interaction stories. These pure-helper tests pin the
 * class/aria logic that is cheap to regress: the slide transform + reduced-motion
 * guard classes, the desktop reset, and the aria-hidden mobile gate.
 */
describe("listPaneClass", () => {
  it("always carries the transform transition + CSS reduced-motion guard", () => {
    for (const pane of ["list", "chat"] as const) {
      const cls = listPaneClass(pane);
      expect(cls).toContain("transition-transform");
      expect(cls).toContain("duration-[250ms]");
      expect(cls).toContain("ease-in-out");
      expect(cls).toContain("motion-reduce:transition-none");
    }
  });

  it("slides out to the left when the chat pane is active (mobile)", () => {
    const cls = listPaneClass("chat");
    expect(cls).toContain("-translate-x-full");
    // desktop reset — never translated at >= md
    expect(cls).toContain("md:translate-x-0");
    expect(cls).toContain("md:flex");
  });

  it("sits at translate-x-0 when the list is the active pane", () => {
    const cls = listPaneClass("list");
    expect(cls).toContain("translate-x-0");
    expect(cls).not.toContain("-translate-x-full");
  });
});

describe("chatPaneClass", () => {
  it("always carries the transform transition + CSS reduced-motion guard", () => {
    for (const pane of ["list", "chat"] as const) {
      const cls = chatPaneClass(pane);
      expect(cls).toContain("transition-transform");
      expect(cls).toContain("duration-[250ms]");
      expect(cls).toContain("ease-in-out");
      expect(cls).toContain("motion-reduce:transition-none");
    }
  });

  it("sits off-screen right when the list pane is active (mobile)", () => {
    const cls = chatPaneClass("list");
    expect(cls).toContain("translate-x-full");
    expect(cls).toContain("md:translate-x-0");
    expect(cls).toContain("md:flex");
  });

  it("sits at translate-x-0 when the chat is the active pane", () => {
    const cls = chatPaneClass("chat");
    expect(cls).toContain("translate-x-0");
    expect(cls).not.toContain("translate-x-full md");
  });
});

describe("paneAriaHidden", () => {
  it("hides the off-screen pane from AT only in mobile single-pane mode", () => {
    // mobile, list active → chat pane is off-screen → hidden
    expect(paneAriaHidden(true, "list", "chat")).toBe("true");
    // mobile, chat active → list pane is off-screen → hidden
    expect(paneAriaHidden(true, "chat", "list")).toBe("true");
  });

  it("never marks the active pane as hidden (mobile)", () => {
    expect(paneAriaHidden(true, "list", "list")).toBeUndefined();
    expect(paneAriaHidden(true, "chat", "chat")).toBeUndefined();
  });

  it("never sets aria-hidden at desktop regardless of mobilePane (AC-19)", () => {
    expect(paneAriaHidden(false, "list", "chat")).toBeUndefined();
    expect(paneAriaHidden(false, "chat", "list")).toBeUndefined();
    expect(paneAriaHidden(false, "list", "list")).toBeUndefined();
    expect(paneAriaHidden(false, "chat", "chat")).toBeUndefined();
  });
});

describe("BACK_BUTTON_CLASS", () => {
  it("guarantees a >= 44x44 hit area (AC-11) while keeping the icon small", () => {
    expect(BACK_BUTTON_CLASS).toContain("min-h-[44px]");
    expect(BACK_BUTTON_CLASS).toContain("min-w-[44px]");
    // stays hidden on desktop (mobile-only back affordance)
    expect(BACK_BUTTON_CLASS).toContain("md:hidden");
  });
});
