import { describe, expect, it } from "vitest";
import { deriveSelfApproved } from "./derive-self-approved";

/**
 * ADR 0073 — `selfApproved` is definitionally `approverMemberId === authorMemberId`.
 * Single source of truth, computed once at the mapper boundary and never
 * recomputed ad-hoc in presentation.
 */
describe("deriveSelfApproved", () => {
  it("is true when the approver is the author", () => {
    expect(deriveSelfApproved("admin-1", "admin-1")).toBe(true);
  });

  it("is false when a different member approved", () => {
    expect(deriveSelfApproved("admin-1", "admin-2")).toBe(false);
  });

  it("is false when there is no approver yet (DRAFT/SUBMITTED)", () => {
    expect(deriveSelfApproved("admin-1", undefined)).toBe(false);
    expect(deriveSelfApproved("admin-1", "")).toBe(false);
  });

  it("is false when the author is unknown (never self-approve an empty id)", () => {
    expect(deriveSelfApproved("", "")).toBe(false);
    expect(deriveSelfApproved("", undefined)).toBe(false);
  });
});
