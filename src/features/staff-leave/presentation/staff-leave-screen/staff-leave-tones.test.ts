import { describe, expect, it } from "vitest";
import { STATUS_REASON_BORDER } from "./staff-leave-tones";

/**
 * DR-009 US-E16.1 — side-stripe ban. The reason block uses a full 1px border +
 * bg tint per status, never a `border-l-*` accent stripe.
 */
describe("STATUS_REASON_BORDER", () => {
  it("every status → full border + tint, no left stripe", () => {
    for (const cls of Object.values(STATUS_REASON_BORDER)) {
      expect(cls).toMatch(/^border /);
      expect(cls).toMatch(/bg-edu-(warning|success|error)\/14/);
      expect(cls).not.toMatch(/border-l/);
    }
  });
});
