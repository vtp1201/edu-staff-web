import { describe, expect, it } from "vitest";
import { MAX_LIST_RETRIES, shouldRetryList } from "./list-retry-policy";

/**
 * Without this predicate the list query inherits the provider's global
 * `retry: 1`, so every 403/400/409-class failure burns one pointless retry
 * (state-architecture.md §3). Pure function → provable without React.
 */
describe("shouldRetryList", () => {
  it("retries a transport failure until the cap", () => {
    expect(shouldRetryList(0, { type: "network-error", retryable: true })).toBe(
      true,
    );
    expect(shouldRetryList(1, { type: "network-error", retryable: true })).toBe(
      true,
    );
    expect(
      shouldRetryList(MAX_LIST_RETRIES, {
        type: "network-error",
        retryable: true,
      }),
    ).toBe(false);
  });

  it("never retries a non-retryable failure, not even once", () => {
    expect(shouldRetryList(0, { type: "forbidden", retryable: false })).toBe(
      false,
    );
    expect(
      shouldRetryList(0, { type: "invalid-request", retryable: false }),
    ).toBe(false);
  });

  it("treats a missing/undefined retryable flag as NOT retryable", () => {
    expect(shouldRetryList(0, { type: "unknown" })).toBe(false);
    expect(shouldRetryList(0, undefined)).toBe(false);
    expect(shouldRetryList(0, new Error("boom"))).toBe(false);
  });
});
