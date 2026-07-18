import { describe, expect, it, vi } from "vitest";
import type { Member } from "../entities/member.entity";
import type { IamMemberFailure } from "../failures/iam-member.failure";
import type { IIamMemberRepository } from "../repositories/i-iam-member.repository";
import { AcceptInvitationUseCase } from "./accept-invitation.use-case";

const MEMBER: Member = {
  tenantId: "t-1",
  userId: "u-1",
  roles: ["TEACHER"],
  status: "ACTIVE",
};

function makeRepo(
  over: Partial<IIamMemberRepository> = {},
): IIamMemberRepository {
  return {
    listMyTenants: vi.fn(),
    switchTenant: vi.fn(),
    inviteMember: vi.fn(),
    revokeInvitation: vi.fn(),
    addMember: vi.fn(),
    changeRoles: vi.fn(),
    removeMember: vi.fn(),
    acceptInvitation: vi.fn(),
    listInvitations: vi.fn(),
    resendInvitation: vi.fn(),
    ...over,
  };
}

describe("AcceptInvitationUseCase", () => {
  it("returns the mapped Member on success", async () => {
    const repo = makeRepo({
      acceptInvitation: vi.fn().mockResolvedValue(MEMBER),
    });
    const uc = new AcceptInvitationUseCase(repo);

    expect(await uc.execute("valid-token")).toEqual({ data: MEMBER });
    expect(repo.acceptInvitation).toHaveBeenCalledWith("valid-token");
  });

  it("short-circuits an empty token → invitation-invalid, ZERO repo call", async () => {
    const repo = makeRepo();
    const uc = new AcceptInvitationUseCase(repo);

    expect(await uc.execute("")).toEqual({
      error: { type: "invitation-invalid" },
    });
    expect(repo.acceptInvitation).not.toHaveBeenCalled();
  });

  it("short-circuits a whitespace-only token → invitation-invalid, ZERO repo call", async () => {
    const repo = makeRepo();
    const uc = new AcceptInvitationUseCase(repo);

    expect(await uc.execute("   ")).toEqual({
      error: { type: "invitation-invalid" },
    });
    expect(repo.acceptInvitation).not.toHaveBeenCalled();
  });

  it.each<IamMemberFailure>([
    { type: "invitation-invalid" },
    { type: "invitation-expired" },
    { type: "invitation-email-mismatch" },
    { type: "network-error" },
    { type: "unknown" },
  ])("passes a thrown %o failure through as { error }", async (failure) => {
    const repo = makeRepo({
      acceptInvitation: vi.fn().mockRejectedValue(failure),
    });
    const uc = new AcceptInvitationUseCase(repo);

    expect(await uc.execute("some-token")).toEqual({ error: failure });
  });
});
