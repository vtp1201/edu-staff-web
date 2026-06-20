import { describe, expect, it } from "vitest";
import { conversationItemStateClass } from "./conversation-item";

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
