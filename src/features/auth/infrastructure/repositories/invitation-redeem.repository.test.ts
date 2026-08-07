/**
 * Unit tests — `InvitationRedeemRepository` call shape + failure mapping
 * (US-E18.53, IAM US-191).
 *
 * The security-critical assertions here are about the CALL SHAPE, not the
 * payload round-trip: the invitation token is a live single-use credential, so
 * it must travel in the POST body and never in a query string (ADR 0131 D10 —
 * query strings land in gateway access logs, browser history and `Referer`).
 * `invitation-redeem.http.test.ts` proves the same property one level lower,
 * through the real axios request pipeline.
 */
import { describe, expect, it, vi } from "vitest";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { OAUTH_CLIENT_ID } from "@/bootstrap/endpoint/tenant.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { InvitationRedeemRepository } from "./invitation-redeem.repository";

function makeRepo() {
  const http = {
    get: vi.fn(),
    post: vi.fn(),
    // biome-ignore lint/suspicious/noExplicitAny: test http stub
  } as any;
  return { repo: new InvitationRedeemRepository(http), http };
}

const LOOKUP_DTO = {
  email: "lan.pham@nguyendu.edu.vn",
  tenantName: "THPT Nguyễn Du",
  roles: ["TEACHER"],
  expiresAt: "2026-08-14T02:00:00Z",
};

const REDEEM_DTO = {
  member: {
    tenantId: "t-9",
    userId: "u-9",
    roles: ["TEACHER"],
    status: "ACTIVE",
  },
  tokens: {
    accessToken: "a",
    refreshToken: "r",
    tokenType: "Bearer" as const,
    sessionId: "s",
  },
};

describe("InvitationRedeemRepository — lookup", () => {
  it("POSTs { token } to the lookup endpoint and maps the preview", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(LOOKUP_DTO);

    await expect(repo.lookup("tok-1")).resolves.toEqual({
      email: "lan.pham@nguyendu.edu.vn",
      tenantName: "THPT Nguyễn Du",
      roles: ["TEACHER"],
      expiresAt: "2026-08-14T02:00:00Z",
    });
    expect(http.post).toHaveBeenCalledWith(IAM_MEMBER_EP.lookupInvitation, {
      token: "tok-1",
    });
  });

  it("the lookup body is EXACTLY { token } — no email/tenant hint is ever volunteered by the client", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(LOOKUP_DTO);
    await repo.lookup("tok-1");
    expect(Object.keys(http.post.mock.calls[0][1])).toEqual(["token"]);
  });

  it("maps a 410 to the domain failure (thrown, per this repository's contract)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(
      new ApiError({
        code: "INVITATION_EXPIRED",
        message: "gone",
        retryable: false,
        status: 410,
      }),
    );
    await expect(repo.lookup("tok-1")).rejects.toEqual({
      type: "link-expired",
    });
  });
});

describe("InvitationRedeemRepository — redeem", () => {
  it("POSTs { token, password, fullName } and maps member + tokens", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(REDEEM_DTO);

    await expect(
      repo.redeem({
        token: "tok-1",
        password: "Matkhau@123",
        fullName: "Phạm Thị Lan",
      }),
    ).resolves.toEqual({
      member: {
        tenantId: "t-9",
        userId: "u-9",
        roles: ["TEACHER"],
        status: "ACTIVE",
      },
      tokens: { accessToken: "a", refreshToken: "r", sessionId: "s" },
    });
    expect(http.post).toHaveBeenCalledWith(
      IAM_MEMBER_EP.redeemInvitation,
      { token: "tok-1", password: "Matkhau@123", fullName: "Phạm Thị Lan" },
      { headers: { "X-Client-Id": OAUTH_CLIENT_ID } },
    );
  });

  it("the redeem body carries NO `email` key (ADR 0131 D5 — a token holder can never redirect the invite)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(REDEEM_DTO);
    await repo.redeem({
      token: "tok-1",
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    const body = http.post.mock.calls[0][1];
    expect(Object.keys(body).sort()).toEqual(["fullName", "password", "token"]);
    expect(body).not.toHaveProperty("email");
  });

  it("the X-Client-Id audit header is a HEADER, never a body field (the body shape is fixed by ADR 0131 D5)", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(REDEEM_DTO);
    await repo.redeem({ token: "t", password: "Matkhau@123", fullName: "A" });
    expect(http.post.mock.calls[0][1]).not.toHaveProperty("clientId");
    expect(http.post.mock.calls[0][2].headers["X-Client-Id"]).toBe(
      OAUTH_CLIENT_ID,
    );
  });

  it("maps 409 INVITATION_ACCOUNT_EXISTS distinctly from a 410 replay", async () => {
    const { repo, http } = makeRepo();
    http.post.mockRejectedValue(
      new ApiError({
        code: "INVITATION_ACCOUNT_EXISTS",
        message: "conflict",
        retryable: false,
        status: 409,
      }),
    );
    await expect(
      repo.redeem({ token: "t", password: "Matkhau@123", fullName: "A" }),
    ).rejects.toEqual({ type: "account-exists" });
  });
});

describe("InvitationRedeemRepository — the token never reaches a query string", () => {
  it("neither call passes `params`, and neither endpoint constant contains a '?'", async () => {
    const { repo, http } = makeRepo();
    http.post.mockResolvedValue(LOOKUP_DTO);
    await repo.lookup("tok-1");
    http.post.mockResolvedValue(REDEEM_DTO);
    await repo.redeem({
      token: "tok-1",
      password: "Matkhau@123",
      fullName: "A",
    });

    for (const [url, , config] of http.post.mock.calls) {
      expect(url).not.toContain("?");
      expect(url).not.toContain("tok-1");
      expect(config?.params).toBeUndefined();
    }
  });
});
