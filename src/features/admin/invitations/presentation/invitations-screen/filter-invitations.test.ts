import { describe, expect, it } from "vitest";
import type { Invitation } from "../../domain/entities/invitation.entity";
import { filterInvitations, statusCounts } from "./filter-invitations";

const inv = (
  id: string,
  email: string,
  status: Invitation["status"],
): Invitation => ({
  id,
  email,
  role: "teacher",
  status,
  invitedBy: "Admin",
  sentAt: "2026-07-01T00:00:00Z",
  expiresAt: "2026-07-15T00:00:00Z",
});

const rows: Invitation[] = [
  inv("1", "lan.pham@email.com", "pending"),
  inv("2", "hoang.long@student.edu.vn", "pending"),
  inv("3", "thu.trang@email.com", "accepted"),
  inv("4", "van.minh@email.com", "expired"),
  inv("5", "quoc.huy@email.com", "revoked"),
];

describe("filterInvitations (UC-002)", () => {
  it("returns all rows for the 'all' tab with no query", () => {
    const r = filterInvitations(rows, "all", "");
    expect(r.filteredCount).toBe(5);
    expect(r.rawCount).toBe(5);
  });

  it("filters by status tab (AC-002.1)", () => {
    const r = filterInvitations(rows, "pending", "");
    expect(r.rows.every((x) => x.status === "pending")).toBe(true);
    expect(r.filteredCount).toBe(2);
  });

  it("filters by email substring (AC-002.2)", () => {
    const r = filterInvitations(rows, "all", "student.edu.vn");
    expect(r.filteredCount).toBe(1);
    expect(r.rows[0].id).toBe("2");
  });

  it("AND-combines status tab + search (AC-002.3)", () => {
    const r = filterInvitations(rows, "pending", "lan");
    expect(r.filteredCount).toBe(1);
    expect(r.rows[0].id).toBe("1");
  });

  it("distinguishes zero-filtered-from-non-empty (AC-002.4) via rawCount vs filteredCount", () => {
    const r = filterInvitations(rows, "revoked", "no-such-email");
    expect(r.rawCount).toBe(5);
    expect(r.filteredCount).toBe(0);
  });

  it("statusCounts computes per-tab counts from the raw list", () => {
    expect(statusCounts(rows)).toEqual({
      all: 5,
      pending: 2,
      accepted: 1,
      expired: 1,
      revoked: 1,
    });
  });
});
