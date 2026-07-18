import { beforeEach, describe, expect, it } from "vitest";
import type { IamMemberFailure } from "../../../domain/failures/iam-member.failure";
import { MockIamMemberRepository } from "./iam-member.mock.repository";

const TENANT = "tenant-acme";

describe("MockIamMemberRepository — invitation methods (US-E21.1)", () => {
  let repo: MockIamMemberRepository;

  beforeEach(() => {
    repo = new MockIamMemberRepository();
  });

  it("listInvitations returns the seed spanning all 4 statuses", async () => {
    const list = await repo.listInvitations(TENANT);
    expect(list.length).toBeGreaterThanOrEqual(8);
    const statuses = new Set(list.map((i) => i.status));
    expect(statuses).toEqual(
      new Set(["pending", "accepted", "expired", "revoked"]),
    );
  });

  it("listInvitations filters by status and email substring", async () => {
    const pending = await repo.listInvitations(TENANT, { status: "pending" });
    expect(pending.every((i) => i.status === "pending")).toBe(true);

    const byEmail = await repo.listInvitations(TENANT, { q: "student.edu.vn" });
    expect(byEmail.length).toBeGreaterThan(0);
    expect(byEmail.every((i) => i.email.includes("student.edu.vn"))).toBe(true);
  });

  it("inviteMember prepends a fresh pending invitation", async () => {
    const before = await repo.listInvitations(TENANT);
    await repo.inviteMember(TENANT, {
      email: "new.teacher@email.com",
      roles: ["TEACHER"],
    });
    const after = await repo.listInvitations(TENANT);
    expect(after.length).toBe(before.length + 1);
    const added = after[0];
    expect(added.email).toBe("new.teacher@email.com");
    expect(added.status).toBe("pending");
    // wire role uppercased on the way in → lowercased in the mocked model
    expect(added.roles).toEqual(["teacher"]);
  });

  it("resendInvitation flips an expired row back to pending with fresh expiry", async () => {
    const list = await repo.listInvitations(TENANT);
    const expired = list.find((i) => i.status === "expired");
    if (!expired) throw new Error("fixture missing an expired invitation");

    const resent = await repo.resendInvitation(TENANT, expired.invitationId);
    expect(resent.status).toBe("pending");
    expect(new Date(resent.expiresAt).getTime()).toBeGreaterThan(Date.now());

    const after = await repo.listInvitations(TENANT);
    expect(
      after.find((i) => i.invitationId === expired.invitationId)?.status,
    ).toBe("pending");
  });

  it("resendInvitation throws invitation-invalid when the row is not expired (race)", async () => {
    const list = await repo.listInvitations(TENANT);
    const pending = list.find((i) => i.status === "pending");
    if (!pending) throw new Error("fixture missing a pending invitation");

    await expect(
      repo.resendInvitation(TENANT, pending.invitationId),
    ).rejects.toEqual({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
  });

  it("revokeInvitation marks a row revoked; missing row throws invitation-invalid", async () => {
    const list = await repo.listInvitations(TENANT);
    const pending = list.find((i) => i.status === "pending");
    if (!pending) throw new Error("fixture missing a pending invitation");

    await repo.revokeInvitation(TENANT, pending.invitationId);
    const after = await repo.listInvitations(TENANT);
    expect(
      after.find((i) => i.invitationId === pending.invitationId)?.status,
    ).toBe("revoked");

    await expect(
      repo.revokeInvitation(TENANT, "does-not-exist"),
    ).rejects.toEqual({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
  });
});
