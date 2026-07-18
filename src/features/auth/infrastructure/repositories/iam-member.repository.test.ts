import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { IamMemberRepository } from "./iam-member.repository";

function makeRepo() {
  const http = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: test http stub
  } as any;
  return { repo: new IamMemberRepository(http), http };
}

function apiError(code: string): ApiError {
  return new ApiError({ code, message: `mock ${code}`, retryable: false });
}

/**
 * Failure mapping matrix — real IAM `error.code` (lowercase snake_case,
 * ground-truthed against `edu-api/services/iam/internal/membership/core/domain/error/member.go`
 * + `.../tenant/core/domain/error/tenant.go`, US-E18.6). The previous matrix
 * asserted UPPER_SNAKE codes that never appear on the real wire.
 */
describe("IamMemberRepository — failure mapping", () => {
  it("forbidden_action → { type: 'forbidden' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("forbidden_action"));
    await expect(
      repo.inviteMember("t-1", { email: "x@x.com", roles: ["teacher"] }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("member_tenant_inactive → { type: 'tenant-inactive' } (inviteMember)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("member_tenant_inactive"));
    await expect(
      repo.inviteMember("t-1", { email: "x@x.com", roles: ["teacher"] }),
    ).rejects.toEqual({ type: "tenant-inactive" });
  });

  it("member_already_exists → { type: 'member-exists' } (addMember)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("member_already_exists"));
    await expect(repo.addMember("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "member-exists",
    });
  });

  it("member_tenant_inactive → { type: 'tenant-inactive' } (addMember)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("member_tenant_inactive"));
    await expect(repo.addMember("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "tenant-inactive",
    });
  });

  it("invitation_invalid → { type: 'invitation-invalid' } (revokeInvitation)", async () => {
    const { repo, http } = makeRepo();
    http.delete.mockRejectedValue(apiError("invitation_invalid"));
    await expect(repo.revokeInvitation("t-1", "inv-1")).rejects.toEqual({
      type: "invitation-invalid",
    });
  });

  it("invitation_invalid → { type: 'invitation-invalid' } (acceptInvitation)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("invitation_invalid"));
    await expect(repo.acceptInvitation("tok")).rejects.toEqual({
      type: "invitation-invalid",
    });
  });

  it("invitation_expired → { type: 'invitation-expired' } (acceptInvitation)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("invitation_expired"));
    await expect(repo.acceptInvitation("tok")).rejects.toEqual({
      type: "invitation-expired",
    });
  });

  it("invitation_email_mismatch → { type: 'invitation-email-mismatch' } (F8, acceptInvitation)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("invitation_email_mismatch"));
    await expect(repo.acceptInvitation("tok")).rejects.toEqual({
      type: "invitation-email-mismatch",
    });
  });

  it("member_last_admin → { type: 'last-admin' } (removeMember)", async () => {
    const { repo, http } = makeRepo();
    http.delete.mockRejectedValue(apiError("member_last_admin"));
    await expect(repo.removeMember("t-1", "u-1")).rejects.toEqual({
      type: "last-admin",
    });
  });

  it("member_last_admin → { type: 'last-admin' } (changeRoles)", async () => {
    const { repo, http } = makeRepo();
    http.patch.mockRejectedValue(apiError("member_last_admin"));
    await expect(repo.changeRoles("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "last-admin",
    });
  });

  it("member_not_found → { type: 'not-found' } (changeRoles)", async () => {
    const { repo, http } = makeRepo();
    http.patch.mockRejectedValue(apiError("member_not_found"));
    await expect(repo.changeRoles("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "not-found",
    });
  });

  it("member_not_found → { type: 'not-found' } (removeMember)", async () => {
    const { repo, http } = makeRepo();
    http.delete.mockRejectedValue(apiError("member_not_found"));
    await expect(repo.removeMember("t-1", "u-1")).rejects.toEqual({
      type: "not-found",
    });
  });

  it("member_invalid_transition → { type: 'invalid-transition' } (changeRoles)", async () => {
    const { repo, http } = makeRepo();
    http.patch.mockRejectedValue(apiError("member_invalid_transition"));
    await expect(repo.changeRoles("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "invalid-transition",
    });
  });

  it("member_tenant_inactive → { type: 'tenant-inactive' } (changeRoles)", async () => {
    const { repo, http } = makeRepo();
    http.patch.mockRejectedValue(apiError("member_tenant_inactive"));
    await expect(repo.changeRoles("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "tenant-inactive",
    });
  });

  it("NETWORK_ERROR (client sentinel) → { type: 'network-error' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("NETWORK_ERROR"));
    await expect(repo.addMember("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "network-error",
    });
  });

  it("unknown code → { type: 'unknown' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("something_weird"));
    await expect(repo.addMember("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "unknown",
    });
  });

  it("old guessed UPPER_SNAKE codes no longer match anything (regression guard) → { type: 'unknown' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("FORBIDDEN_ACTION"));
    await expect(
      repo.inviteMember("t-1", { email: "x@x.com", roles: ["teacher"] }),
    ).rejects.toEqual({ type: "unknown" });
  });
});

describe("IamMemberRepository — happy paths", () => {
  it("listMyTenants maps DTO[] → TenantMembership[] (real MembershipSummary shape, no tenantName)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockResolvedValue([
      { tenantId: "t-1", roles: ["admin"], status: "ACTIVE" },
      { tenantId: "t-2", roles: ["teacher"], status: "INACTIVE" },
    ]);
    const result = await repo.listMyTenants();
    expect(result).toEqual([
      { tenantId: "t-1", roles: ["admin"], status: "ACTIVE" },
      { tenantId: "t-2", roles: ["teacher"], status: "INACTIVE" },
    ]);
  });

  it("acceptInvitation posts { token } and maps MemberResponse → Member", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue({
      tenantId: "t-9",
      userId: "u-9",
      roles: ["TEACHER"],
      status: "ACTIVE",
    });
    const result = await repo.acceptInvitation("tok-abc");
    expect(result).toEqual({
      tenantId: "t-9",
      userId: "u-9",
      roles: ["TEACHER"],
      status: "ACTIVE",
    });
    // Security-critical: payload is EXACTLY { token } — never role/tenantId/email.
    expect(http.post).toHaveBeenCalledWith("/iam/api/v1/invitations/accept", {
      token: "tok-abc",
    });
  });

  it("switchTenant maps TokenResponseDto → AuthTokens", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue({
      accessToken: "acc",
      refreshToken: "ref",
      tokenType: "Bearer",
      sessionId: "sess",
    });
    const result = await repo.switchTenant("t-1", "edu-staff-web");
    expect(result).toEqual({
      accessToken: "acc",
      refreshToken: "ref",
      sessionId: "sess",
    });
    expect(http.post).toHaveBeenCalledWith(
      "/iam/api/v1/members/switch-tenant",
      { tenantId: "t-1", clientId: "edu-staff-web" },
    );
  });
});
