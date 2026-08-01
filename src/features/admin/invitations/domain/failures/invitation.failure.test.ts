import { describe, expect, it } from "vitest";
import {
  type InvitationFailure,
  isRetryableInvitationFailure,
} from "./invitation.failure";

/**
 * The retryable classification is what stops the list query from burning a
 * pointless retry on a verdict that cannot change (state-architecture.md §3).
 * Exhaustive over the union on purpose: a NEW member must make a deliberate
 * retryable/not decision here instead of inheriting a default.
 */
describe("isRetryableInvitationFailure", () => {
  const retryable: InvitationFailure[] = [
    { type: "network-error" },
    { type: "unknown" },
    { type: "rate-limited" },
    { type: "rate-limited", retryAfterSeconds: 30 },
  ];

  const notRetryable: InvitationFailure[] = [
    { type: "forbidden" },
    { type: "invalid-request" },
    { type: "invitation-invalid" },
    { type: "invitation-not-resendable" },
    { type: "invalid-state" },
    { type: "validation", fields: [] },
  ];

  for (const failure of retryable) {
    it(`retries transport/throttle class: ${failure.type}`, () => {
      expect(isRetryableInvitationFailure(failure)).toBe(true);
    });
  }

  for (const failure of notRetryable) {
    it(`never retries a verdict that cannot change: ${failure.type}`, () => {
      expect(isRetryableInvitationFailure(failure)).toBe(false);
    });
  }
});
