import { describe, expect, it, vi } from "vitest";
import type { IAuthRepository } from "../repositories/i-auth.repository";
import { RefreshSessionUseCase } from "./refresh-session.use-case";

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

describe("RefreshSessionUseCase", () => {
  it("rejects empty refresh token without hitting repo", async () => {
    const repo = makeRepo();
    const uc = new RefreshSessionUseCase(repo);

    expect(await uc.execute("  ")).toEqual({
      error: { type: "invalid-token" },
    });
    expect(repo.refresh).not.toHaveBeenCalled();
  });

  it("forwards the refresh token to repo.refresh", async () => {
    const result = { data: { accessToken: "new" } } as never;
    const repo = makeRepo({ refresh: vi.fn().mockResolvedValue(result) });
    const uc = new RefreshSessionUseCase(repo);

    expect(await uc.execute("ref-1")).toBe(result);
    expect(repo.refresh).toHaveBeenCalledWith("ref-1");
  });
});
