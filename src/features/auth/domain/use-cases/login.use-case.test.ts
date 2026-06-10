import { describe, expect, it, vi } from "vitest";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { LoginUseCase } from "./login.use-case";

function makeRepo(over: Partial<IAuthRepository> = {}): IAuthRepository {
  return {
    signin: vi.fn(),
    refresh: vi.fn(),
    signout: vi.fn(),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    ...over,
  };
}

describe("LoginUseCase", () => {
  it("rejects empty email/password without hitting repo", async () => {
    const repo = makeRepo();
    const uc = new LoginUseCase(repo);

    expect(await uc.execute("", "x")).toEqual({
      error: { type: "invalid-credentials" },
    });
    expect(await uc.execute("a@b.vn", "")).toEqual({
      error: { type: "invalid-credentials" },
    });
    expect(repo.signin).not.toHaveBeenCalled();
  });

  it("forwards valid credentials to repo.signin", async () => {
    const result = { data: { accessToken: "a" } } as never;
    const repo = makeRepo({ signin: vi.fn().mockResolvedValue(result) });
    const uc = new LoginUseCase(repo);

    expect(await uc.execute("a@b.vn", "pw")).toBe(result);
    expect(repo.signin).toHaveBeenCalledWith("a@b.vn", "pw");
  });
});
