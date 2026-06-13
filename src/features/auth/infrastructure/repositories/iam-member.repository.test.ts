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

describe("IamMemberRepository — failure mapping", () => {
  it("FORBIDDEN_ACTION → { type: 'forbidden' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("FORBIDDEN_ACTION"));
    await expect(
      repo.inviteMember("t-1", { email: "x@x.com", roles: ["teacher"] }),
    ).rejects.toEqual({ type: "forbidden" });
  });

  it("USER_EMAIL_ALREADY_EXISTS → { type: 'email-exists' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("USER_EMAIL_ALREADY_EXISTS"));
    await expect(
      repo.inviteMember("t-1", { email: "x@x.com", roles: ["teacher"] }),
    ).rejects.toEqual({ type: "email-exists" });
  });

  it("INVITATION_NOT_FOUND → { type: 'invitation-not-found' }", async () => {
    const { repo, http } = makeRepo();
    http.delete.mockRejectedValue(apiError("INVITATION_NOT_FOUND"));
    await expect(repo.revokeInvitation("t-1", "inv-1")).rejects.toEqual({
      type: "invitation-not-found",
    });
  });

  it("INVITATION_EXPIRED → { type: 'invitation-not-found' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("INVITATION_EXPIRED"));
    await expect(repo.acceptInvitation("tok")).rejects.toEqual({
      type: "invitation-not-found",
    });
  });

  it("LAST_ADMIN_INVARIANT_VIOLATION → { type: 'last-admin' }", async () => {
    const { repo, http } = makeRepo();
    http.delete.mockRejectedValue(apiError("LAST_ADMIN_INVARIANT_VIOLATION"));
    await expect(repo.removeMember("t-1", "u-1")).rejects.toEqual({
      type: "last-admin",
    });
  });

  it("RESOURCE_NOT_FOUND → { type: 'not-found' }", async () => {
    const { repo, http } = makeRepo();
    http.patch.mockRejectedValue(apiError("RESOURCE_NOT_FOUND"));
    await expect(repo.changeRoles("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "not-found",
    });
  });

  it("NETWORK_ERROR → { type: 'network-error' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("NETWORK_ERROR"));
    await expect(repo.addMember("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "network-error",
    });
  });

  it("unknown code → { type: 'unknown' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(apiError("SOMETHING_WEIRD"));
    await expect(repo.addMember("t-1", "u-1", ["teacher"])).rejects.toEqual({
      type: "unknown",
    });
  });
});

describe("IamMemberRepository — happy paths", () => {
  it("listMyTenants maps DTO[] → TenantMembership[]", async () => {
    const { repo, http } = makeRepo();
    http.get.mockResolvedValue([
      {
        tenantId: "t-1",
        roles: ["admin"],
        status: "ACTIVE",
        tenantName: "Acme",
      },
      { tenantId: "t-2", roles: ["teacher"], status: "INACTIVE" },
    ]);
    const result = await repo.listMyTenants();
    expect(result).toEqual([
      { tenantId: "t-1", roles: ["admin"], status: "ACTIVE" },
      { tenantId: "t-2", roles: ["teacher"], status: "INACTIVE" },
    ]);
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
