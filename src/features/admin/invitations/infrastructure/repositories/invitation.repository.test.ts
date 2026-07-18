import { describe, expect, it, vi } from "vitest";
import type { Invitation as AuthInvitation } from "@/features/auth/domain/entities/invitation.entity";
import type { IamMemberFailure } from "@/features/auth/domain/failures/iam-member.failure";
import type { IIamMemberRepository } from "@/features/auth/domain/repositories/i-iam-member.repository";
import { InvitationRepository } from "./invitation.repository";

const TENANT = "tenant-acme";

function stubIam(over: Partial<IIamMemberRepository>): IIamMemberRepository {
  return {
    listMyTenants: vi.fn(),
    switchTenant: vi.fn(),
    inviteMember: vi.fn().mockResolvedValue(undefined),
    revokeInvitation: vi.fn().mockResolvedValue(undefined),
    addMember: vi.fn(),
    changeRoles: vi.fn(),
    removeMember: vi.fn(),
    acceptInvitation: vi.fn(),
    listInvitations: vi.fn().mockResolvedValue([]),
    resendInvitation: vi.fn(),
    ...over,
  };
}

const authRow: AuthInvitation = {
  invitationId: "inv-4",
  tenantId: TENANT,
  email: "van.minh@email.com",
  roles: ["teacher"],
  status: "pending",
  invitedBy: "Admin",
  sentAt: "2026-07-18T00:00:00Z",
  expiresAt: "2026-08-01T00:00:00Z",
};

describe("InvitationRepository (US-E21.1)", () => {
  it("sendInvitationBatch fans out N single-email inviteMember calls with the uppercased wire role", async () => {
    const inviteMember = vi.fn().mockResolvedValue(undefined);
    const mutations = stubIam({ inviteMember });
    const repo = new InvitationRepository(mutations, stubIam({}), TENANT);

    const result = await repo.sendInvitationBatch({
      emails: ["a@x.com", "b@x.com"],
      role: "manager",
      expiryDays: 14,
    });

    expect(inviteMember).toHaveBeenCalledTimes(2);
    expect(inviteMember).toHaveBeenCalledWith(TENANT, {
      email: "a@x.com",
      roles: ["MANAGER"],
    });
    expect(result.ok && result.value.succeeded).toHaveLength(2);
    expect(result.ok && result.value.failed).toHaveLength(0);
  });

  it("sendInvitationBatch splits succeeded/failed on a mixed allSettled result (partial)", async () => {
    const inviteMember = vi
      .fn()
      .mockResolvedValueOnce(undefined) // a@x.com ok
      .mockRejectedValueOnce({
        type: "invitation-invalid",
      } satisfies IamMemberFailure); // b@x.com duplicate-fails
    const repo = new InvitationRepository(
      stubIam({ inviteMember }),
      stubIam({}),
      TENANT,
    );

    const result = await repo.sendInvitationBatch({
      emails: ["a@x.com", "b@x.com"],
      role: "teacher",
      expiryDays: 14,
    });

    expect(result.ok && result.value.succeeded.map((s) => s.email)).toEqual([
      "a@x.com",
    ]);
    expect(result.ok && result.value.failed).toEqual([
      { email: "b@x.com", failure: { type: "invitation-invalid" } },
    ]);
  });

  it("revokeInvitation maps a thrown invitation_invalid → invitation-invalid (ground-truth #6)", async () => {
    const revokeInvitation = vi.fn().mockRejectedValue({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
    const repo = new InvitationRepository(
      stubIam({ revokeInvitation }),
      stubIam({}),
      TENANT,
    );

    const result = await repo.revokeInvitation("inv-1");
    expect(revokeInvitation).toHaveBeenCalledWith(TENANT, "inv-1");
    expect(!result.ok && result.failure).toEqual({
      type: "invitation-invalid",
    });
  });

  it("revokeInvitation resolves ok on success", async () => {
    const repo = new InvitationRepository(stubIam({}), stubIam({}), TENANT);
    const result = await repo.revokeInvitation("inv-1");
    expect(result.ok).toBe(true);
  });

  it("listInvitations always resolves through the injected LIST repo (force-mock scoping), not the mutations repo", async () => {
    const mutationsList = vi
      .fn()
      .mockRejectedValue(new Error("mutations repo must NOT serve list"));
    const listList = vi.fn().mockResolvedValue([authRow]);
    const repo = new InvitationRepository(
      stubIam({ listInvitations: mutationsList }),
      stubIam({ listInvitations: listList }),
      TENANT,
    );

    const result = await repo.listInvitations();
    expect(mutationsList).not.toHaveBeenCalled();
    expect(listList).toHaveBeenCalledWith(TENANT);
    expect(result.ok && result.value[0].id).toBe("inv-4");
  });

  it("resendInvitation routes through the LIST (mock) repo and maps the refreshed row", async () => {
    const resend = vi.fn().mockResolvedValue({ ...authRow, status: "pending" });
    const repo = new InvitationRepository(
      stubIam({}),
      stubIam({ resendInvitation: resend }),
      TENANT,
    );

    const result = await repo.resendInvitation("inv-4");
    expect(resend).toHaveBeenCalledWith(TENANT, "inv-4");
    expect(result.ok && result.value.status).toBe("pending");
  });

  it("resendInvitation maps a race rejection to invitation-invalid", async () => {
    const resend = vi.fn().mockRejectedValue({
      type: "invitation-invalid",
    } satisfies IamMemberFailure);
    const repo = new InvitationRepository(
      stubIam({}),
      stubIam({ resendInvitation: resend }),
      TENANT,
    );

    const result = await repo.resendInvitation("inv-4");
    expect(!result.ok && result.failure).toEqual({
      type: "invitation-invalid",
    });
  });
});
