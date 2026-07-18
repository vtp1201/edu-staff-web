/**
 * Unit tests — `joinAction`/`switchAccountAction` Server Actions (US-E21.2,
 * ADR 0059). Covers the security-critical wiring the tech-lead's diff traced
 * by hand (`fe-tech-lead-reviewer` review, story.md "Evidence" section):
 * accept payload stays `{token}` only end-to-end, `switchTenant` mint uses
 * ONLY the server-returned `tenantId` (never a client value), and
 * switch-account never partially clears the session on logout failure.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const acceptExecute = vi.fn();
const switchExecute = vi.fn();
const logoutExecute = vi.fn();

vi.mock("@/bootstrap/di/auth.di", () => ({
  makeAcceptInvitationUseCase: vi.fn(async () => ({
    execute: acceptExecute,
  })),
  makeLogoutUseCase: vi.fn(async () => ({ execute: logoutExecute })),
}));

vi.mock("@/bootstrap/di/tenant.di", () => ({
  makeSwitchTenantUseCase: vi.fn(async () => ({ execute: switchExecute })),
}));

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  setAuthCookies: vi.fn(async () => {}),
  clearAuthCookies: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: `NEXT_REDIRECT;${url}` };
  }),
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));

import { redirect } from "next/navigation";
import {
  clearAuthCookies,
  setAuthCookies,
} from "@/bootstrap/lib/auth-token.server";
import { joinAction, switchAccountAction } from "./actions";

const mockRedirect = vi.mocked(redirect);
const mockSetAuthCookies = vi.mocked(setAuthCookies);
const mockClearAuthCookies = vi.mocked(clearAuthCookies);

function redirectUrl(err: unknown): string {
  return ((err as { digest?: string })?.digest ?? "").split(";")[1] ?? "";
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("joinAction", () => {
  it("posts { token } only, mints a tenant-scoped session for the SERVER-returned tenantId, and redirects to the role-scoped tenant URL", async () => {
    acceptExecute.mockResolvedValue({
      data: {
        tenantId: "t-9",
        userId: "u-9",
        roles: ["teacher"],
        status: "ACTIVE",
      },
    });
    const tokens = { accessToken: "a", refreshToken: "r", sessionId: "s" };
    switchExecute.mockResolvedValue(tokens);

    const err = await joinAction("tok-abc").catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-9/teacher");

    // Security-critical: the use-case receives exactly the raw token string —
    // no role/tenantId object is ever assembled client-side and passed through.
    expect(acceptExecute).toHaveBeenCalledWith("tok-abc");
    expect(acceptExecute).toHaveBeenCalledTimes(1);

    // switchTenant is minted for the value the SERVER returned in the accept
    // response, not any client-supplied id.
    expect(switchExecute).toHaveBeenCalledWith("t-9");
    expect(mockSetAuthCookies).toHaveBeenCalledWith(tokens);
  });

  it("multi-role membership within the joined tenant redirects to the FIRST returned role (no /select-role branch invented for this story)", async () => {
    acceptExecute.mockResolvedValue({
      data: {
        tenantId: "t-1",
        userId: "u-1",
        roles: ["principal", "teacher"],
        status: "ACTIVE",
      },
    });
    switchExecute.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      sessionId: "s",
    });

    const err = await joinAction("tok").catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-1/principal");
  });

  it("empty roles[] falls back to the tenant root path", async () => {
    acceptExecute.mockResolvedValue({
      data: { tenantId: "t-1", userId: "u-1", roles: [], status: "ACTIVE" },
    });
    switchExecute.mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      sessionId: "s",
    });

    const err = await joinAction("tok").catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-1");
  });

  it("returns { errorKey } on accept failure — switchTenant/cookies/redirect never fire", async () => {
    acceptExecute.mockResolvedValue({
      error: { type: "invitation-email-mismatch" },
    });

    const result = await joinAction("tok");
    expect(result).toEqual({ errorKey: "invitation-email-mismatch" });
    expect(switchExecute).not.toHaveBeenCalled();
    expect(mockSetAuthCookies).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it.each([
    "invitation-invalid",
    "invitation-expired",
    "network-error",
    "unknown",
  ])("propagates the %s failure key without minting a session", async (type) => {
    acceptExecute.mockResolvedValue({ error: { type } });
    const result = await joinAction("tok");
    expect(result).toEqual({ errorKey: type });
    expect(switchExecute).not.toHaveBeenCalled();
  });
});

describe("switchAccountAction", () => {
  it("signs out, clears cookies, and re-lands on the SAME token URL", async () => {
    logoutExecute.mockResolvedValue(undefined);

    const err = await switchAccountAction("tok-abc").catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/invitations/accept?token=tok-abc");
    expect(logoutExecute).toHaveBeenCalledTimes(1);
    expect(mockClearAuthCookies).toHaveBeenCalledTimes(1);
  });

  it("URL-encodes the token when re-landing", async () => {
    logoutExecute.mockResolvedValue(undefined);
    const err = await switchAccountAction("tok with space").catch((e) => e);
    expect(redirectUrl(err)).toBe(
      "/vi/invitations/accept?token=tok%20with%20space",
    );
  });

  it("logout failure leaves the session INTACT — no partial clear, no redirect, stable error key", async () => {
    logoutExecute.mockRejectedValue(new Error("boom"));

    const result = await switchAccountAction("tok-abc");
    expect(result).toEqual({ errorKey: "logout-failed" });
    expect(mockClearAuthCookies).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
