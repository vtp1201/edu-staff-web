/**
 * Unit tests — auth login/social/logout Server Actions.
 * DI factories + side-effect modules mocked at module boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock DI factories
const loginExecute = vi.fn();
const socialExecute = vi.fn();
const logoutExecute = vi.fn();

vi.mock("@/bootstrap/di/auth.di", () => ({
  makeLoginUseCase: vi.fn(async () => ({ execute: loginExecute })),
  makeSocialAuthUseCase: vi.fn(async () => ({ execute: socialExecute })),
  makeLogoutUseCase: vi.fn(async () => ({ execute: logoutExecute })),
}));

// Mock auth-token.server to avoid real cookie writes
vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  setAuthCookies: vi.fn(async () => {}),
  clearAuthCookies: vi.fn(async () => {}),
  setPendingRolesCookie: vi.fn(async () => {}),
}));

// Mock next/navigation redirect (throws a NEXT_REDIRECT, treated as "success" in tests)
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: `NEXT_REDIRECT;${url}` };
  }),
}));

// Mock next-intl/server getLocale
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));

import { redirect } from "next/navigation";
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import { loginAction, logoutAction, socialSigninAction } from "./actions";

const mockSetAuthCookies = vi.mocked(setAuthCookies);
const mockRedirect = vi.mocked(redirect);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginAction", () => {
  it("sets cookies and redirects on success (single role → select-tenant)", async () => {
    const mockSession = {
      accessToken: "tok",
      refreshToken: "ref",
      sessionId: "sid",
      user: { name: "Test", roles: [{ tenantId: "t1", role: "teacher" }] },
    };
    loginExecute.mockResolvedValue({ data: mockSession, error: null });

    await expect(loginAction("a@b.com", "pass")).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(mockSetAuthCookies).toHaveBeenCalledWith(mockSession);
    expect(mockRedirect).toHaveBeenCalledWith("/vi/select-tenant");
  });

  it("returns errorKey on invalid credentials", async () => {
    loginExecute.mockResolvedValue({
      data: null,
      error: { type: "invalid-credentials" },
    });
    const res = await loginAction("a@b.com", "wrong");
    expect(res).toEqual({ errorKey: "invalid-credentials" });
    expect(mockSetAuthCookies).not.toHaveBeenCalled();
  });

  it("returns errorKey on network error", async () => {
    loginExecute.mockResolvedValue({
      data: null,
      error: { type: "network-error" },
    });
    const res = await loginAction("a@b.com", "pass");
    expect(res).toEqual({ errorKey: "network-error" });
  });
});

describe("socialSigninAction", () => {
  it("sets cookies and redirects on success", async () => {
    const mockSession = {
      accessToken: "tok",
      refreshToken: "ref",
      sessionId: "sid",
      user: { name: "Test", roles: [{ tenantId: "t1", role: "teacher" }] },
    };
    socialExecute.mockResolvedValue({ data: mockSession, error: null });

    await expect(
      socialSigninAction("google", "id-token"),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(mockSetAuthCookies).toHaveBeenCalledWith(mockSession);
  });

  it("returns errorKey when social auth fails", async () => {
    socialExecute.mockResolvedValue({
      data: null,
      error: { type: "sso-unavailable" },
    });
    const res = await socialSigninAction("google", "bad-token");
    expect(res).toEqual({ errorKey: "sso-unavailable" });
  });
});

describe("logoutAction", () => {
  it("calls logout use-case, clears cookies, and redirects to login", async () => {
    logoutExecute.mockResolvedValue(undefined);
    const { clearAuthCookies } = await import(
      "@/bootstrap/lib/auth-token.server"
    );
    const mockClearAuthCookies = vi.mocked(clearAuthCookies);

    await expect(logoutAction()).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(logoutExecute).toHaveBeenCalled();
    expect(mockClearAuthCookies).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});
