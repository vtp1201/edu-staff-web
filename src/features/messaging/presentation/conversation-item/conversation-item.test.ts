import { describe, expect, it } from "vitest";
import {
  conversationGroupSuffix,
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

/**
 * US-E24.15 — with the direct/group tablist gone, a group row must be
 * distinguishable by more than avatar shape (decision `0013`: never shape or
 * colour alone). Same accname constraint as presence: the row's explicit
 * `aria-label` replaces "name from content", so the marker is folded into the
 * label rather than rendered as a nested sr-only span.
 */
describe("conversationGroupSuffix", () => {
  const groupLabel = "Nhóm";

  it("group → announces the group marker suffix", () => {
    expect(conversationGroupSuffix(true, groupLabel)).toBe(`, ${groupLabel}`);
  });

  it("direct → no marker", () => {
    expect(conversationGroupSuffix(false, groupLabel)).toBe("");
  });

  it("composes with the presence suffix without clobbering it", () => {
    const presence = conversationPresenceSuffix(
      false,
      "online",
      "đang hoạt động",
    );
    const group = conversationGroupSuffix(false, groupLabel);
    expect(`Mở cuộc trò chuyện với A${group}${presence}`).toBe(
      "Mở cuộc trò chuyện với A, đang hoạt động",
    );
  });

  it("a group row never carries a presence suffix alongside the marker", () => {
    expect(
      `${conversationGroupSuffix(true, groupLabel)}${conversationPresenceSuffix(true, "online", "đang hoạt động")}`,
    ).toBe(", Nhóm");
  });
});
