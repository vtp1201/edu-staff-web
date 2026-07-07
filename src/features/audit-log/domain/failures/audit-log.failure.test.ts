import { describe, expect, it } from "vitest";
import { type AuditLogFailure, isRetryableFailure } from "./audit-log.failure";

describe("isRetryableFailure", () => {
  it("prefers the threaded BE retryable flag when present", () => {
    // A BE-retryable 5xx that mapped to `unknown` is still retryable.
    expect(isRetryableFailure({ type: "unknown", retryable: true })).toBe(true);
  });

  it("treats a non-retryable mapped failure as non-retryable", () => {
    expect(isRetryableFailure({ type: "forbidden", retryable: false })).toBe(
      false,
    );
  });

  it("falls back to transport-only when no flag is threaded (domain failure)", () => {
    expect(isRetryableFailure({ type: "network-error" })).toBe(true);
    const invalid: AuditLogFailure = { type: "invalid-filter" };
    expect(isRetryableFailure(invalid)).toBe(false);
  });
});
