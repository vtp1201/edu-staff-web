import { describe, expect, it, vi } from "vitest";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  unwrapResponse,
} from "@/bootstrap/lib/api-envelope";
import type { InvitationListItemResponseDto } from "../dtos/iam-member-response.dto";
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

function apiError(
  code: string,
  over: { status?: number; retryAfterSeconds?: number } = {},
): ApiError {
  return new ApiError({
    code,
    message: `mock ${code}`,
    retryable: false,
    ...over,
  });
}

const TENANT = "t-1";

function listItem(
  over: Partial<InvitationListItemResponseDto> = {},
): InvitationListItemResponseDto {
  return {
    invitationId: "inv-1",
    email: "lan.pham@email.com",
    roles: ["TEACHER"],
    status: "pending",
    invitedBy: "user-77",
    createdAt: "2026-07-25T02:00:00Z",
    expiresAt: "2026-07-28T02:00:00Z",
    ...over,
  };
}

function envelope<T>(
  data: T,
  pagination?: { nextCursor: string | null; hasMore: boolean },
): ApiEnvelope<T> {
  return {
    success: true,
    data,
    error: null,
    meta: { requestId: "req-1", timestamp: "2026-08-01T00:00:00Z", pagination },
  };
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

  it("listInvitations reads the cursor page through { raw: true } + parseEnvelope (IAM US-147)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockResolvedValue(
      envelope([listItem()], { nextCursor: "cur-2", hasMore: true }),
    );

    const page = await repo.listInvitations(TENANT, {
      status: "pending",
      cursor: "cur-1",
      limit: 25,
    });

    expect(http.get).toHaveBeenCalledWith(IAM_MEMBER_EP.invitations(TENANT), {
      params: { status: "pending", cursor: "cur-1", limit: 25 },
      raw: true,
    });
    expect(page).toEqual({
      data: [
        {
          invitationId: "inv-1",
          email: "lan.pham@email.com",
          roles: ["teacher"],
          status: "pending",
          invitedBy: "user-77",
          createdAt: "2026-07-25T02:00:00Z",
          expiresAt: "2026-07-28T02:00:00Z",
        },
      ],
      nextCursor: "cur-2",
      hasMore: true,
    });
  });

  it("listInvitations passes `raw` as a TOP-LEVEL config sibling of `params` (US-E18.19 regression class)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockResolvedValue(envelope([listItem()]));
    await repo.listInvitations(TENANT);

    const config = http.get.mock.calls[0]?.[1] as { raw?: boolean };
    expect(config.raw).toBe(true);
    // Pipe the real interceptor over the recorded config to prove the flag bites
    // (nested inside `params` it is silently ignored → payload arrives unwrapped).
    expect(unwrapResponse({ data: envelope([listItem()]), config })).toEqual(
      envelope([listItem()]),
    );
  });

  it("listInvitations treats a missing meta.pagination as the last page and an empty page as valid (status=expired TTL sweep)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockResolvedValue(envelope([]));
    const page = await repo.listInvitations(TENANT, { status: "expired" });
    expect(page).toEqual({ data: [], nextCursor: null, hasMore: false });
  });

  it("listInvitations keeps a SHORT page with hasMore:true (BE applies status after a keyset read)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockResolvedValue(
      envelope([], { nextCursor: "cur-9", hasMore: true }),
    );
    const page = await repo.listInvitations(TENANT, { status: "revoked" });
    expect(page).toEqual({ data: [], nextCursor: "cur-9", hasMore: true });
  });

  it("resendInvitation POSTs the resend route with no body and maps the returned row", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(
      listItem({ status: "pending", roles: ["MANAGER"] }),
    );

    const row = await repo.resendInvitation(TENANT, "inv-1");

    expect(http.post).toHaveBeenCalledWith(
      IAM_MEMBER_EP.invitationResend(TENANT, "inv-1"),
    );
    expect(row.status).toBe("pending");
    expect(row.roles).toEqual(["manager"]);
    // invitedBy/createdAt are BE-preserved (never re-attributed on resend).
    expect(row.invitedBy).toBe("user-77");
    expect(row.createdAt).toBe("2026-07-25T02:00:00Z");
  });

  it("invitation_not_resendable (409) → { type: 'invitation-not-resendable' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(
      apiError("invitation_not_resendable", { status: 409 }),
    );
    await expect(repo.resendInvitation(TENANT, "inv-1")).rejects.toEqual({
      type: "invitation-not-resendable",
    });
  });

  it("rate_limit_exceeded (429) → { type: 'rate-limited' } carrying Retry-After seconds", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(
      apiError("rate_limit_exceeded", { status: 429, retryAfterSeconds: 900 }),
    );
    await expect(repo.resendInvitation(TENANT, "inv-1")).rejects.toEqual({
      type: "rate-limited",
      retryAfterSeconds: 900,
    });
  });

  it("rate_limit_exceeded without a Retry-After header → { type: 'rate-limited' } with no seconds", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(
      apiError("rate_limit_exceeded", { status: 429 }),
    );
    await expect(repo.resendInvitation(TENANT, "inv-1")).rejects.toEqual({
      type: "rate-limited",
      retryAfterSeconds: undefined,
    });
  });

  it("invalid_request_parameters (400) → { type: 'invalid-request' } (malformed cursor/limit/status)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockRejectedValue(
      apiError("invalid_request_parameters", { status: 400 }),
    );
    await expect(
      repo.listInvitations(TENANT, { cursor: "garbage" }),
    ).rejects.toEqual({ type: "invalid-request" });
  });

  it("forbidden_action (403) on the invitation list → { type: 'forbidden' } (ADR 0063 defense in depth)", async () => {
    const { repo, http } = makeRepo();
    http.get.mockRejectedValue(apiError("forbidden_action", { status: 403 }));
    await expect(repo.listInvitations(TENANT)).rejects.toEqual({
      type: "forbidden",
    });
  });

  it("invitation_invalid (410, TTL-swept row) on resend → { type: 'invitation-invalid' }", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(
      apiError("invitation_invalid", { status: 410 }),
    );
    await expect(repo.resendInvitation(TENANT, "inv-1")).rejects.toEqual({
      type: "invitation-invalid",
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
