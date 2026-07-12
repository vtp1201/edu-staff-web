import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "../entities/auth-user.entity";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { GetProfileUseCase } from "./get-profile.use-case";

const user: AuthUser = {
  id: "u1",
  email: "a@school.vn",
  name: "An",
  avatar: null,
  emailVerified: false,
  roles: [],
};

function repo(over: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    signin: vi.fn(),
    socialSignin: vi.fn(),
    refresh: vi.fn(),
    signout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    getProfile: vi.fn().mockResolvedValue({ data: user }),
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
    ...over,
  };
}

describe("GetProfileUseCase", () => {
  it("passes through the repo profile data", async () => {
    const res = await new GetProfileUseCase(repo()).execute();
    expect(res.data).toEqual(user);
  });

  it("passes through a repo failure", async () => {
    const r = repo({
      getProfile: vi
        .fn()
        .mockResolvedValue({ error: { type: "unauthorized" } }),
    });
    const res = await new GetProfileUseCase(r).execute();
    expect(res.error).toEqual({ type: "unauthorized" });
  });
});
