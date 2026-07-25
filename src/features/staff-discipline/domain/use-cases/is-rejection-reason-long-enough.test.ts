import { describe, expect, it } from "vitest";
import {
  isRejectionReasonLongEnough,
  MIN_REJECTION_REASON_LENGTH,
} from "./is-rejection-reason-long-enough";

/**
 * Layer 1 of the two-layer reject-reason validation (spec §6 INT-009 grouping
 * note): the client UX guard (≥10 chars, stricter, non-authoritative). Layer 2
 * is the server's non-empty guard — asserted separately on the repository.
 */
describe("isRejectionReasonLongEnough", () => {
  it("uses a 10-character minimum", () => {
    expect(MIN_REJECTION_REASON_LENGTH).toBe(10);
  });

  it("rejects an empty or short reason", () => {
    expect(isRejectionReasonLongEnough("")).toBe(false);
    expect(isRejectionReasonLongEnough("ngắn")).toBe(false);
    expect(isRejectionReasonLongEnough("123456789")).toBe(false);
  });

  it("rejects whitespace padding used to reach the minimum", () => {
    expect(isRejectionReasonLongEnough("   abc    ")).toBe(false);
  });

  it("accepts exactly 10 trimmed characters and longer", () => {
    expect(isRejectionReasonLongEnough("1234567890")).toBe(true);
    expect(isRejectionReasonLongEnough("  1234567890  ")).toBe(true);
    expect(isRejectionReasonLongEnough("Lý do từ chối hợp lệ")).toBe(true);
  });
});
