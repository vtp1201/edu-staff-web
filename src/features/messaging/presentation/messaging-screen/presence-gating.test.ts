import { describe, expect, it } from "vitest";
import { isGroupPresenceQueryEnabled } from "./presence-gating";

/**
 * US-E10.6 AC-10.6.3.2 — selecting (rendering the header of) a group conversation
 * must NOT trigger the member-panel presence fetch; the fetch only fires once the
 * group-info panel is opened.
 */
describe("isGroupPresenceQueryEnabled", () => {
  const base = {
    hasActiveConversation: true,
    isGroup: true,
    isPanelOpen: false,
    memberCount: 3,
  };

  it("is NOT enabled merely from selecting a group conversation (panel closed)", () => {
    // Group selected, header rendered, members known — but the panel is closed.
    expect(isGroupPresenceQueryEnabled(base)).toBe(false);
  });

  it("becomes enabled once the group-info panel opens", () => {
    expect(isGroupPresenceQueryEnabled({ ...base, isPanelOpen: true })).toBe(
      true,
    );
  });

  it("stays disabled for a direct conversation even if a panel flag is open", () => {
    expect(
      isGroupPresenceQueryEnabled({
        ...base,
        isGroup: false,
        isPanelOpen: true,
      }),
    ).toBe(false);
  });

  it("stays disabled when no conversation is active", () => {
    expect(
      isGroupPresenceQueryEnabled({
        ...base,
        hasActiveConversation: false,
        isPanelOpen: true,
      }),
    ).toBe(false);
  });

  it("stays disabled when the open group has no members to query", () => {
    expect(
      isGroupPresenceQueryEnabled({
        ...base,
        isPanelOpen: true,
        memberCount: 0,
      }),
    ).toBe(false);
  });
});
