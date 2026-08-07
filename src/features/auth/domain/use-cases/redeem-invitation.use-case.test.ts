/**
 * Unit tests — `RedeemInvitationUseCase` (US-E18.53, IAM US-191 / ADR 0130/0131).
 *
 * This is the account-creating call, so the client-side guards exist as
 * defense-in-depth ONLY (BE's 422/`USER_WEAK_PASSWORD` is the real backstop) —
 * their job is to avoid burning a rate-limit slot on input the BE will refuse.
 * The security-critical assertion here is negative: the command carries NO
 * `email` field, ever (ADR 0131 D5 — the account's email is the invitation's).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RedeemedInvitation } from "../entities/redeemed-invitation.entity";
import type { IInvitationRedeemRepository } from "../repositories/i-invitation-redeem.repository";
import { RedeemInvitationUseCase } from "./redeem-invitation.use-case";

const lookup = vi.fn();
const redeem = vi.fn();
const repo = { lookup, redeem } satisfies IInvitationRedeemRepository;

const REDEEMED: RedeemedInvitation = {
  member: {
    tenantId: "t-9",
    userId: "u-9",
    roles: ["TEACHER"],
    status: "ACTIVE",
  },
  tokens: { accessToken: "a", refreshToken: "r", sessionId: "s" },
};

const VALID = {
  token: "tok-1",
  password: "Matkhau@123",
  fullName: "Phạm Thị Lan",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RedeemInvitationUseCase — happy path", () => {
  it("returns the member + tenant-scoped tokens and passes ONLY {token,password,fullName} to the repository (no email, ADR 0131 D5)", async () => {
    redeem.mockResolvedValue(REDEEMED);
    const result = await new RedeemInvitationUseCase(repo).execute(VALID);

    expect(result).toEqual({ data: REDEEMED });
    expect(redeem).toHaveBeenCalledTimes(1);
    const arg = redeem.mock.calls[0][0];
    expect(Object.keys(arg).sort()).toEqual(["fullName", "password", "token"]);
    expect(arg).not.toHaveProperty("email");
  });

  it("trims the full name before sending (a trailing space is not a different person)", async () => {
    redeem.mockResolvedValue(REDEEMED);
    await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      fullName: "  Phạm Thị Lan  ",
    });
    expect(redeem.mock.calls[0][0].fullName).toBe("Phạm Thị Lan");
  });

  it("does NOT trim the password (whitespace is a legitimate password character)", async () => {
    redeem.mockResolvedValue(REDEEMED);
    await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      password: " Matkhau@123 ",
    });
    expect(redeem.mock.calls[0][0].password).toBe(" Matkhau@123 ");
  });
});

describe("RedeemInvitationUseCase — client-side guards (zero network)", () => {
  it.each(["", "   "])("blank token %p → link-invalid", async (token) => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      token,
    });
    expect(result).toEqual({ error: { type: "link-invalid" } });
    expect(redeem).not.toHaveBeenCalled();
  });

  it("empty password → invalid-input[passwordRequired]", async () => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      password: "",
    });
    expect(result).toEqual({
      error: { type: "invalid-input", issues: ["passwordRequired"] },
    });
    expect(redeem).not.toHaveBeenCalled();
  });

  it("password shorter than 8 → invalid-input[passwordTooShort]", async () => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      password: "Ab@1",
    });
    expect(result).toEqual({
      error: { type: "invalid-input", issues: ["passwordTooShort"] },
    });
    expect(redeem).not.toHaveBeenCalled();
  });

  it("password longer than bcrypt's 72-byte input limit → invalid-input[passwordTooLong] (BE truncates beyond 72, so a longer one is a silent trap)", async () => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      password: `${"a".repeat(72)}@1`,
    });
    expect(result).toEqual({
      error: { type: "invalid-input", issues: ["passwordTooLong"] },
    });
    expect(redeem).not.toHaveBeenCalled();
  });

  it("counts password length in BYTES, not code points (a 30-char Vietnamese password can exceed 72 bytes)", async () => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      password: "ế".repeat(30), // 3 bytes each = 90 bytes, 30 code points
    });
    expect(result).toEqual({
      error: { type: "invalid-input", issues: ["passwordTooLong"] },
    });
  });

  it.each([
    "",
    "   ",
  ])("blank full name %p → invalid-input[fullNameRequired]", async (fullName) => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      fullName,
    });
    expect(result).toEqual({
      error: { type: "invalid-input", issues: ["fullNameRequired"] },
    });
    expect(redeem).not.toHaveBeenCalled();
  });

  it("full name over 128 chars → invalid-input[fullNameTooLong]", async () => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      ...VALID,
      fullName: "a".repeat(129),
    });
    expect(result).toEqual({
      error: { type: "invalid-input", issues: ["fullNameTooLong"] },
    });
  });

  it("reports EVERY offending field at once — a user fixing one should not discover the next on the following round-trip", async () => {
    const result = await new RedeemInvitationUseCase(repo).execute({
      token: "tok-1",
      password: "x",
      fullName: "",
    });
    expect(result).toEqual({
      error: {
        type: "invalid-input",
        issues: ["passwordTooShort", "fullNameRequired"],
      },
    });
  });
});

describe("RedeemInvitationUseCase — server failures", () => {
  it("409 account-exists is surfaced distinctly (the caller routes to the signed-in accept flow)", async () => {
    redeem.mockRejectedValue({ type: "account-exists" });
    const result = await new RedeemInvitationUseCase(repo).execute(VALID);
    expect(result).toEqual({ error: { type: "account-exists" } });
  });

  it("a REPLAYED token is 410 link-invalid, NOT 409 account-exists — the two must never collapse", async () => {
    redeem.mockRejectedValue({ type: "link-invalid" });
    const result = await new RedeemInvitationUseCase(repo).execute(VALID);
    expect(result).toEqual({ error: { type: "link-invalid" } });
    expect(result.error).not.toEqual({ type: "account-exists" });
  });

  it.each([
    { type: "link-expired" },
    { type: "tenant-inactive" },
    { type: "rate-limited", retryAfterSeconds: 60 },
    { type: "network-error" },
    { type: "unknown" },
  ])("surfaces %o unchanged", async (failure) => {
    redeem.mockRejectedValue(failure);
    const result = await new RedeemInvitationUseCase(repo).execute(VALID);
    expect(result).toEqual({ error: failure });
  });

  it("a non-failure throw degrades to unknown", async () => {
    redeem.mockRejectedValue(new Error("boom"));
    const result = await new RedeemInvitationUseCase(repo).execute(VALID);
    expect(result).toEqual({ error: { type: "unknown" } });
  });
});
