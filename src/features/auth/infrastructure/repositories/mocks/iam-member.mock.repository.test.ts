import { beforeEach, describe, expect, it } from "vitest";
import type { IamMemberFailure } from "../../../domain/failures/iam-member.failure";
import { MockIamMemberRepository } from "./iam-member.mock.repository";

const TENANT = "tenant-acme";

describe("MockIamMemberRepository — invitation methods (US-E21.1, re-shaped US-E18.29)", () => {
  let repo: MockIamMemberRepository;

  beforeEach(() => {
    repo = new MockIamMemberRepository();
  });

  it("listInvitations returns ONE unpaginated page of the seed spanning all 4 statuses", async () => {
    const page = await repo.listInvitations(TENANT);
    expect(page.data.length).toBeGreaterThanOrEqual(8);
    expect(page.nextCursor).toBeNull();
    expect(page.hasMore).toBe(false);
    const statuses = new Set(page.data.map((i) => i.status));
    expect(statuses).toEqual(
      new Set(["pending", "accepted", "expired", "revoked"]),
    );
  });

  it("listInvitations honours the real server-side `status` param (no `q` param exists)", async () => {
    const pending = await repo.listInvitations(TENANT, { status: "pending" });
    expect(pending.data.length).toBeGreaterThan(0);
    expect(pending.data.every((i) => i.status === "pending")).toBe(true);
  });

  it("inviteMember prepends a fresh pending invitation", async () => {
    const before = await repo.listInvitations(TENANT);
    await repo.inviteMember(TENANT, {
      email: "new.teacher@email.com",
      roles: ["TEACHER"],
    });
    const after = await repo.listInvitations(TENANT);
    expect(after.data.length).toBe(before.data.length + 1);
    const added = after.data[0];
    expect(added.email).toBe("new.teacher@email.com");
    expect(added.status).toBe("pending");
    // wire role uppercased on the way in → lowercased in the mocked model
    expect(added.roles).toEqual(["teacher"]);
  });

  it("resendInvitation flips an expired row back to pending with a fresh expiry, preserving invitedBy/createdAt", async () => {
    const page = await repo.listInvitations(TENANT);
    const expired = page.data.find((i) => i.status === "expired");
    if (!expired) throw new Error("fixture missing an expired invitation");

    const resent = await repo.resendInvitation(TENANT, expired.invitationId);
    expect(resent.status).toBe("pending");
    expect(new Date(resent.expiresAt).getTime()).toBeGreaterThan(Date.now());
    // BE preserves authorship + creation time on resend (INTEGRATION.md ¹¹).
    expect(resent.invitedBy).toBe(expired.invitedBy);
    expect(resent.createdAt).toBe(expired.createdAt);

    const after = await repo.listInvitations(TENANT);
    expect(
      after.data.find((i) => i.invitationId === expired.invitationId)?.status,
    ).toBe("pending");
  });

  it("resendInvitation also accepts a still-pending row (real BE resends any PENDING invitation)", async () => {
    const page = await repo.listInvitations(TENANT);
    const pending = page.data.find((i) => i.status === "pending");
    if (!pending) throw new Error("fixture missing a pending invitation");

    const resent = await repo.resendInvitation(TENANT, pending.invitationId);
    expect(resent.status).toBe("pending");
  });

  it("resendInvitation throws invitation-not-resendable for an ACCEPTED/REVOKED row (409)", async () => {
    const page = await repo.listInvitations(TENANT);
    const accepted = page.data.find((i) => i.status === "accepted");
    const revoked = page.data.find((i) => i.status === "revoked");
    if (!accepted || !revoked)
      throw new Error("fixture missing accepted/revoked");

    await expect(
      repo.resendInvitation(TENANT, accepted.invitationId),
    ).rejects.toEqual({
      type: "invitation-not-resendable",
    } satisfies IamMemberFailure);
    await expect(
      repo.resendInvitation(TENANT, revoked.invitationId),
    ).rejects.toEqual({
      type: "invitation-not-resendable",
    } satisfies IamMemberFailure);
  });

  it("resendInvitation throws invitation-invalid for a TTL-swept/absent row (410)", async () => {
    await expect(
      repo.resendInvitation(TENANT, "does-not-exist"),
    ).rejects.toEqual({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
  });

  it("revokeInvitation marks a row revoked; missing row throws invitation-invalid", async () => {
    const page = await repo.listInvitations(TENANT);
    const pending = page.data.find((i) => i.status === "pending");
    if (!pending) throw new Error("fixture missing a pending invitation");

    await repo.revokeInvitation(TENANT, pending.invitationId);
    const after = await repo.listInvitations(TENANT);
    expect(
      after.data.find((i) => i.invitationId === pending.invitationId)?.status,
    ).toBe("revoked");

    await expect(
      repo.revokeInvitation(TENANT, "does-not-exist"),
    ).rejects.toEqual({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
  });
});
