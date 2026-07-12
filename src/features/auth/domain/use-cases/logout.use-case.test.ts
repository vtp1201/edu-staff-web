import { describe, expect, it, vi } from "vitest";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { LogoutUseCase } from "./logout.use-case";

describe("LogoutUseCase", () => {
  it("calls repo.signout", async () => {
    const repo: IAuthRepository = {
      signin: vi.fn(),
      socialSignin: vi.fn(),
      refresh: vi.fn(),
      signout: vi.fn().mockResolvedValue(undefined),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
      getProfile: vi.fn(),
      requestEmailVerification: vi.fn(),
      confirmEmailVerification: vi.fn(),
    };
    await new LogoutUseCase(repo).execute();
    expect(repo.signout).toHaveBeenCalledOnce();
  });
});
