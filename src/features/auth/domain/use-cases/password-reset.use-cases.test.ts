import { describe, expect, it, vi } from "vitest";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { RequestPasswordResetUseCase } from "./request-password-reset.use-case";
import { ResetPasswordUseCase } from "./reset-password.use-case";

function repo(over: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    signin: vi.fn(),
    socialSignin: vi.fn(),
    refresh: vi.fn(),
    signout: vi.fn(),
    requestPasswordReset: vi.fn().mockResolvedValue({ ok: true }),
    resetPassword: vi.fn().mockResolvedValue({ ok: true }),
    ...over,
  };
}

describe("RequestPasswordResetUseCase", () => {
  it("rejects an empty email without hitting the repo", async () => {
    const r = repo();
    const res = await new RequestPasswordResetUseCase(r).execute("  ");
    expect(res.error?.type).toBe("unknown");
    expect(r.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("delegates a valid email (trimmed)", async () => {
    const r = repo();
    const res = await new RequestPasswordResetUseCase(r).execute(" a@b.vn ");
    expect(r.requestPasswordReset).toHaveBeenCalledWith("a@b.vn");
    expect(res.ok).toBe(true);
  });
});

describe("ResetPasswordUseCase", () => {
  it("rejects a non 6-digit OTP", async () => {
    const r = repo();
    const res = await new ResetPasswordUseCase(r).execute(
      "a@b.vn",
      "123",
      "Abcdef1!",
    );
    expect(res.error?.type).toBe("invalid-otp");
    expect(r.resetPassword).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    const res = await new ResetPasswordUseCase(repo()).execute(
      "a@b.vn",
      "123456",
      "short",
    );
    expect(res.error?.type).toBe("unknown");
  });

  it("delegates a valid reset", async () => {
    const r = repo();
    const res = await new ResetPasswordUseCase(r).execute(
      "a@b.vn",
      "123456",
      "Abcdef1!",
    );
    expect(r.resetPassword).toHaveBeenCalledWith(
      "a@b.vn",
      "123456",
      "Abcdef1!",
    );
    expect(res.ok).toBe(true);
  });

  it("surfaces a repo invalid-otp failure", async () => {
    const r = repo({
      resetPassword: vi
        .fn()
        .mockResolvedValue({ error: { type: "invalid-otp" } }),
    });
    const res = await new ResetPasswordUseCase(r).execute(
      "a@b.vn",
      "000000",
      "Abcdef1!",
    );
    expect(res.error?.type).toBe("invalid-otp");
  });
});
