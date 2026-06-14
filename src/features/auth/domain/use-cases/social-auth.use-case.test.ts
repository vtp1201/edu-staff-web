import { describe, expect, it, vi } from "vitest";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { SocialAuthUseCase } from "./social-auth.use-case";

function makeRepo(over: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    signin: vi.fn(),
    socialSignin: vi.fn(),
    refresh: vi.fn(),
    signout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    ...over,
  };
}

describe("SocialAuthUseCase", () => {
  it("rejects an empty token without hitting the repo", async () => {
    const repo = makeRepo();
    const uc = new SocialAuthUseCase(repo);

    expect(await uc.execute("google", "")).toEqual({
      error: { type: "sso-unavailable" },
    });
    expect(repo.socialSignin).not.toHaveBeenCalled();
  });

  it("forwards a valid provider + token to repo.socialSignin", async () => {
    const result = { data: { accessToken: "a" } } as never;
    const repo = makeRepo({
      socialSignin: vi.fn().mockResolvedValue(result),
    });
    const uc = new SocialAuthUseCase(repo);

    expect(await uc.execute("google", "id-token")).toBe(result);
    expect(repo.socialSignin).toHaveBeenCalledWith("google", "id-token");
  });

  it("forwards vneid provider when a token is supplied", async () => {
    const result = { data: { accessToken: "a" } } as never;
    const repo = makeRepo({
      socialSignin: vi.fn().mockResolvedValue(result),
    });
    const uc = new SocialAuthUseCase(repo);

    await uc.execute("vneid", "tok");
    expect(repo.socialSignin).toHaveBeenCalledWith("vneid", "tok");
  });
});
