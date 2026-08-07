/**
 * Unit tests — `redeemAction` Server Action (US-E18.53, IAM US-191 /
 * ADR 0130/0131). This is the whole security surface of a PUBLIC
 * account-creation flow, so the assertions are deliberately about the wiring,
 * not the happy path:
 *
 *  - the redirect target is derived ONLY from the server's response
 *    (`member.tenantId` + `member.roles[0]`) — nothing the caller sent can
 *    influence where the browser lands;
 *  - cookies are set from the response's own tokens, and ONLY on success;
 *  - each failure returns a stable KEY (never translated copy, never a raw
 *    `ApiError`), with `account-exists` and `link-invalid` staying distinct.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const redeemExecute = vi.fn();

vi.mock("@/bootstrap/di/invitation-redeem.di", () => ({
  makeRedeemInvitationUseCase: vi.fn(async () => ({ execute: redeemExecute })),
}));

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  setAuthCookies: vi.fn(async () => {}),
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
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import { redeemAction } from "./actions";

const mockRedirect = vi.mocked(redirect);
const mockSetAuthCookies = vi.mocked(setAuthCookies);

function redirectUrl(err: unknown): string {
  return ((err as { digest?: string })?.digest ?? "").split(";")[1] ?? "";
}

const TOKENS = { accessToken: "a", refreshToken: "r", sessionId: "s" };

function ok(roles: string[], tenantId = "t-9") {
  return {
    data: {
      member: { tenantId, userId: "u-9", roles, status: "ACTIVE" },
      tokens: TOKENS,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("redeemAction — success (the whole redirect chain)", () => {
  it("passes {token,password,fullName} through, persists the RESPONSE's tokens, then lands in the tenant workspace — no second sign-in step", async () => {
    redeemExecute.mockResolvedValue(ok(["TEACHER"]));

    const err = await redeemAction(
      "tok-1",
      "Matkhau@123",
      "Phạm Thị Lan",
    ).catch((e) => e);

    expect(redeemExecute).toHaveBeenCalledWith({
      token: "tok-1",
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    expect(mockSetAuthCookies).toHaveBeenCalledWith(TOKENS);
    expect(redirectUrl(err)).toBe("/vi/t/t-9/teacher");
  });

  it("cookies are set BEFORE the redirect — landing in a guarded route without a session would bounce to /select-tenant", async () => {
    redeemExecute.mockResolvedValue(ok(["TEACHER"]));
    const order: string[] = [];
    mockSetAuthCookies.mockImplementation(async () => {
      order.push("cookies");
    });
    mockRedirect.mockImplementation(((url: string) => {
      order.push("redirect");
      throw { digest: `NEXT_REDIRECT;${url}` };
      // biome-ignore lint/suspicious/noExplicitAny: mocked redirect returns never
    }) as any);

    await redeemAction("tok-1", "Matkhau@123", "A").catch(() => {});
    expect(order).toEqual(["cookies", "redirect"]);
  });

  it("normalises the BE role ENUM to the appRole route segment (ADMIN/MANAGER → principal, STAFF → teacher)", async () => {
    for (const [wire, segment] of [
      ["ADMIN", "principal"],
      ["MANAGER", "principal"],
      ["STAFF", "teacher"],
      ["STUDENT", "student"],
      ["PARENT", "parent"],
    ] as const) {
      vi.clearAllMocks();
      redeemExecute.mockResolvedValue(ok([wire]));
      const err = await redeemAction("tok", "Matkhau@123", "A").catch((e) => e);
      expect(redirectUrl(err)).toBe(`/vi/t/t-9/${segment}`);
    }
  });

  it("an unknown future role enum degrades to its lowercase form rather than crashing the landing", async () => {
    redeemExecute.mockResolvedValue(ok(["LIBRARIAN"]));
    const err = await redeemAction("tok", "Matkhau@123", "A").catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-9/librarian");
  });

  it("an empty roles[] falls back to the tenant root path", async () => {
    redeemExecute.mockResolvedValue(ok([]));
    const err = await redeemAction("tok", "Matkhau@123", "A").catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-9");
  });

  it("the redirect target comes ONLY from the response — a caller-crafted token/name cannot steer it", async () => {
    redeemExecute.mockResolvedValue(ok(["TEACHER"], "t-server"));
    const err = await redeemAction(
      "https://evil.example.com/?next=/vi/t/t-attacker/principal",
      "Matkhau@123",
      "../../t/t-attacker",
    ).catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-server/teacher");
  });
});

describe("redeemAction — failures", () => {
  it("409 account-exists returns its own key and mints NO session", async () => {
    redeemExecute.mockResolvedValue({ error: { type: "account-exists" } });
    const result = await redeemAction("tok", "Matkhau@123", "A");
    expect(result).toEqual({ errorKey: "account-exists" });
    expect(mockSetAuthCookies).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("a REPLAYED token returns link-invalid, NOT account-exists", async () => {
    redeemExecute.mockResolvedValue({ error: { type: "link-invalid" } });
    expect(await redeemAction("tok", "Matkhau@123", "A")).toEqual({
      errorKey: "link-invalid",
    });
  });

  it("invalid-input carries the per-field issue keys so the form can blame the right input", async () => {
    redeemExecute.mockResolvedValue({
      error: { type: "invalid-input", issues: ["passwordWeak"] },
    });
    expect(await redeemAction("tok", "abcdefgh", "A")).toEqual({
      errorKey: "invalid-input",
      issues: ["passwordWeak"],
    });
  });

  it.each([
    "link-expired",
    "rate-limited",
    "tenant-inactive",
    "network-error",
    "unknown",
  ])("%s returns its stable key with no session and no redirect", async (type) => {
    redeemExecute.mockResolvedValue({ error: { type } });
    expect(await redeemAction("tok", "Matkhau@123", "A")).toEqual({
      errorKey: type,
    });
    expect(mockSetAuthCookies).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns a KEY, never translated copy or a raw error object", async () => {
    redeemExecute.mockResolvedValue({ error: { type: "unknown" } });
    const result = await redeemAction("tok", "Matkhau@123", "A");
    expect(Object.keys(result)).toEqual(["errorKey"]);
    expect(typeof result.errorKey).toBe("string");
  });
});
