/**
 * Unit tests — mock PUBLIC invitation repository (US-E18.53). The one
 * behaviour worth asserting is the single-use/replay semantic: a mock that let
 * a token be redeemed twice would make the flow look correct in dev while the
 * real BE 410s.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { MockInvitationRedeemRepository } from "./invitation-redeem.mock.repository";

const VALID = "tok-happy";

function repo() {
  return new MockInvitationRedeemRepository();
}

beforeEach(() => {
  MockInvitationRedeemRepository.reset();
});

describe("MockInvitationRedeemRepository", () => {
  it("previews a fresh token", async () => {
    const preview = await repo().lookup(VALID);
    expect(preview.email).toBe("lan.pham@nguyendu.edu.vn");
    expect(preview.roles).toEqual(["TEACHER"]);
    expect(new Date(preview.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("redeems a fresh token into an ACTIVE membership + tenant-scoped session", async () => {
    const out = await repo().redeem({
      token: VALID,
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    expect(out.member.status).toBe("ACTIVE");
    expect(out.member.tenantId).toBe("tenant-acme");
    expect(out.tokens.accessToken).toContain(".");
  });

  it("a SECOND redeem of the same token is link-invalid (410 replay), NOT account-exists (409)", async () => {
    await repo().redeem({
      token: VALID,
      password: "Matkhau@123",
      fullName: "A",
    });
    await expect(
      repo().redeem({ token: VALID, password: "Matkhau@123", fullName: "A" }),
    ).rejects.toEqual({ type: "link-invalid" });
  });

  it("looking up a consumed token is dead too — the preview must not keep advertising a burnt invite", async () => {
    await repo().redeem({
      token: VALID,
      password: "Matkhau@123",
      fullName: "A",
    });
    await expect(repo().lookup(VALID)).rejects.toEqual({
      type: "link-invalid",
    });
  });

  it.each([
    ["tok-expired", { type: "link-expired" }],
    ["tok-used", { type: "link-invalid" }],
    ["tok-exists", { type: "account-exists" }],
    ["tok-limited", { type: "rate-limited", retryAfterSeconds: 60 }],
    ["tok-inactive", { type: "tenant-inactive" }],
    ["tok-offline", { type: "network-error" }],
  ])("marker token %p drives %o on both calls", async (token, failure) => {
    await expect(repo().lookup(token)).rejects.toEqual(failure);
    await expect(
      repo().redeem({ token, password: "Matkhau@123", fullName: "A" }),
    ).rejects.toEqual(failure);
  });
});
