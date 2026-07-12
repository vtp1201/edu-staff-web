import { describe, expect, it, vi } from "vitest";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { ConfirmEmailVerificationUseCase } from "./confirm-email-verification.use-case";
import { RequestEmailVerificationUseCase } from "./request-email-verification.use-case";

function repo(over: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    signin: vi.fn(),
    socialSignin: vi.fn(),
    refresh: vi.fn(),
    signout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    getProfile: vi.fn(),
    requestEmailVerification: vi.fn().mockResolvedValue({ ok: true }),
    confirmEmailVerification: vi.fn().mockResolvedValue({ ok: true }),
    ...over,
  };
}

describe("RequestEmailVerificationUseCase", () => {
  it("delegates to the repo and returns ok", async () => {
    const r = repo();
    const res = await new RequestEmailVerificationUseCase(r).execute();
    expect(r.requestEmailVerification).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
  });

  it("surfaces a repo failure (e.g. too-many-requests)", async () => {
    const r = repo({
      requestEmailVerification: vi
        .fn()
        .mockResolvedValue({ error: { type: "too-many-requests" } }),
    });
    const res = await new RequestEmailVerificationUseCase(r).execute();
    expect(res.error?.type).toBe("too-many-requests");
  });
});

describe("ConfirmEmailVerificationUseCase", () => {
  it("rejects a non 6-digit OTP without hitting the repo", async () => {
    const r = repo();
    const res = await new ConfirmEmailVerificationUseCase(r).execute("123");
    expect(res.error?.type).toBe("invalid-otp");
    expect(r.confirmEmailVerification).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric 6-char OTP without hitting the repo", async () => {
    const r = repo();
    const res = await new ConfirmEmailVerificationUseCase(r).execute("12a456");
    expect(res.error?.type).toBe("invalid-otp");
    expect(r.confirmEmailVerification).not.toHaveBeenCalled();
  });

  it("delegates a valid 6-digit OTP", async () => {
    const r = repo();
    const res = await new ConfirmEmailVerificationUseCase(r).execute("123456");
    expect(r.confirmEmailVerification).toHaveBeenCalledWith("123456");
    expect(res.ok).toBe(true);
  });

  it("surfaces a repo otp-expired failure", async () => {
    const r = repo({
      confirmEmailVerification: vi
        .fn()
        .mockResolvedValue({ error: { type: "otp-expired" } }),
    });
    const res = await new ConfirmEmailVerificationUseCase(r).execute("000000");
    expect(res.error?.type).toBe("otp-expired");
  });
});
