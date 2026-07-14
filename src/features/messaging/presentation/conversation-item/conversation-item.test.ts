import { describe, expect, it } from "vitest";
import {
  conversationItemStateClass,
  conversationPresenceSuffix,
} from "./conversation-item";

/**
 * DR-009 US-E16.1 — side-stripe ban. Active conversation uses a solid bg tint;
 * neither state may carry a `border-l-*` accent stripe.
 */
describe("conversationItemStateClass", () => {
  it("active → solid primary tint, no left stripe", () => {
    const cls = conversationItemStateClass(true);
    expect(cls).toBe("bg-primary/14");
    expect(cls).not.toMatch(/border-l/);
  });

  it("inactive → hover bg only, no left stripe", () => {
    const cls = conversationItemStateClass(false);
    expect(cls).toBe("hover:bg-muted");
    expect(cls).not.toMatch(/border-l/);
  });
});

/**
 * A11Y-001 (WCAG 4.1.2) — presence must be folded into the button's aria-label,
 * because an explicit aria-label replaces the nested sr-only PresenceDot span.
 * The suffix is composed into `${openConversation}${suffix}` at render.
 */
describe("conversationPresenceSuffix", () => {
  const onlineLabel = "đang hoạt động";
  const recentLabel = "vừa hoạt động gần đây";

  it("direct + online → announces the online status suffix", () => {
    expect(conversationPresenceSuffix(false, "online", onlineLabel)).toBe(
      `, ${onlineLabel}`,
    );
  });

  it("direct + recent → announces the recently-active suffix", () => {
    expect(conversationPresenceSuffix(false, "recent", recentLabel)).toBe(
      `, ${recentLabel}`,
    );
  });

  it("direct + offline → no suffix (no dot renders)", () => {
    expect(conversationPresenceSuffix(false, "offline", onlineLabel)).toBe("");
  });

  it("group → never announces presence (group avatars show no dot)", () => {
    expect(conversationPresenceSuffix(true, "online", onlineLabel)).toBe("");
    expect(conversationPresenceSuffix(true, "recent", recentLabel)).toBe("");
  });
});
