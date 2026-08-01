import { describe, expect, it } from "vitest";
import type { Invitation } from "../../domain/entities/invitation.entity";
import { filterInvitations } from "./filter-invitations";

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

/**
 * US-E18.29: the status branch is GONE — `status` is a real server param now
 * (one `useInfiniteQuery` per tab), so the only client-side filter left is the
 * email substring, applied over the pages currently loaded.
 */
describe("filterInvitations (UC-002, search-only after US-E18.29)", () => {
  it("returns every loaded row when the query is empty", () => {
    const r = filterInvitations(rows, "");
    expect(r.filteredCount).toBe(5);
    expect(r.rawCount).toBe(5);
  });

  it("filters by email substring, case-insensitively (AC-002.2)", () => {
    const r = filterInvitations(rows, "STUDENT.edu.vn");
    expect(r.filteredCount).toBe(1);
    expect(r.rows[0].id).toBe("2");
  });

  it("ignores surrounding whitespace in the query", () => {
    expect(filterInvitations(rows, "   ").filteredCount).toBe(5);
    expect(filterInvitations(rows, "  lan  ").filteredCount).toBe(1);
  });

  it("distinguishes zero-filtered-from-non-empty (AC-002.4) via rawCount vs filteredCount", () => {
    const r = filterInvitations(rows, "no-such-email");
    expect(r.rawCount).toBe(5);
    expect(r.filteredCount).toBe(0);
  });

  it("does NOT filter by status any more (the server does)", () => {
    // A tab's page only ever contains rows of that status; the helper must not
    // second-guess the server's projection (e.g. a PENDING row read as expired).
    const r = filterInvitations([inv("9", "x@y.com", "revoked")], "");
    expect(r.rows).toHaveLength(1);
  });
});
