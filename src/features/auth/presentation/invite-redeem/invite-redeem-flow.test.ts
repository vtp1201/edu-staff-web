/**
 * Unit tests — framework-free core of the browser-direct redeem flow
 * (US-E18.59, ADR 0072).
 *
 * The container that hosts these helpers is a `'use client'` component with a
 * local QueryClient; the node test environment cannot mount it (no jsdom, no
 * `@testing-library/react`). So the decisions worth proving live in pure
 * functions here, and the mounted behaviour is covered by the Storybook
 * interaction stories.
 */
import { describe, expect, it, vi } from "vitest";
import type { InvitationPreview } from "@/features/auth/domain/entities/invitation-preview.entity";
import { lookupVm, runRedeem, toActionResult } from "./invite-redeem-flow";

const PREVIEW: InvitationPreview = {
  email: "lan.pham@nguyendu.edu.vn",
  tenantName: "THPT Nguyễn Du",
  roles: ["TEACHER"],
  expiresAt: "2026-08-14T02:00:00Z",
};

const REDEEMED = {
  member: {
    tenantId: "t-9",
    userId: "u-9",
    roles: ["TEACHER"],
    status: "ACTIVE" as const,
  },
  tokens: { accessToken: "a", refreshToken: "r", sessionId: "s" },
};

describe("lookupVm — the lookup query's state → screen state", () => {
  it("pending renders the NEW loading state (the RSC fetch used to hide this)", () => {
    expect(lookupVm({ token: "tok-1", isPending: true })).toEqual({
      kind: "loading",
    });
  });

  it("a resolved preview renders the form seeded with it", () => {
    expect(
      lookupVm({ token: "tok-1", isPending: false, preview: PREVIEW }),
    ).toEqual({ kind: "form", token: "tok-1", preview: PREVIEW });
  });

  it.each([
    ["link-invalid", "invalid"],
    ["link-expired", "expired"],
    ["rate-limited", "rate-limited"],
    ["tenant-inactive", "tenant-inactive"],
    ["network-error", "error"],
    ["unknown", "error"],
  ])("a %s lookup failure derives the %p state", (type, kind) => {
    expect(
      lookupVm({ token: "tok-1", isPending: false, error: { type } }),
    ).toEqual({ kind });
  });

  it("a 409 can never come from lookup, but an unexpected key still degrades to the generic error rather than crashing", () => {
    expect(
      lookupVm({
        token: "tok-1",
        isPending: false,
        error: { type: "account-exists" },
      }),
    ).toEqual({ kind: "error" });
  });

  it("loading wins over a stale preview so a refetch never shows the previous invitation", () => {
    expect(
      lookupVm({ token: "tok-1", isPending: true, preview: PREVIEW }),
    ).toEqual({ kind: "loading" });
  });

  it.each([
    "",
    "   ",
  ])("a blank token %p is invalid without ever entering the pending state (zero network, the shared budget is precious)", (token) => {
    expect(lookupVm({ token, isPending: true })).toEqual({ kind: "invalid" });
  });

  it("settled with neither preview nor failure is the generic error, never a blank screen", () => {
    expect(lookupVm({ token: "tok-1", isPending: false })).toEqual({
      kind: "error",
    });
  });
});

describe("toActionResult — failure → the screen's stable keys", () => {
  it("carries the per-field issues for invalid-input so the form can blame the right input", () => {
    expect(
      toActionResult({ type: "invalid-input", issues: ["passwordWeak"] }),
    ).toEqual({ errorKey: "invalid-input", issues: ["passwordWeak"] });
  });

  it("every other failure is a bare key, never translated copy or a raw error", () => {
    const result = toActionResult({ type: "account-exists" });
    expect(Object.keys(result)).toEqual(["errorKey"]);
    expect(result.errorKey).toBe("account-exists");
  });

  it("a stray non-failure throwable degrades to unknown rather than leaking an Error across the boundary", () => {
    expect(toActionResult(new Error("kaboom"))).toEqual({
      errorKey: "unknown",
    });
  });
});

describe("runRedeem — browser redeem, then the narrow server finalize", () => {
  it("passes the submitted fields through and finalizes with the SERVER's member/tokens", async () => {
    const redeem = vi.fn(async () => REDEEMED);
    const finalize = vi.fn(async () => {});

    const result = await runRedeem({
      token: "tok-1",
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
      redeem,
      finalize,
    });

    expect(redeem).toHaveBeenCalledWith({
      token: "tok-1",
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    expect(finalize).toHaveBeenCalledWith(REDEEMED.member, REDEEMED.tokens);
    expect(result).toEqual({});
  });

  it("a caller-crafted token/name cannot steer the finalize payload — only the response can", async () => {
    const finalize = vi.fn(async () => {});
    await runRedeem({
      token: "https://evil.example.com/?next=/vi/t/t-attacker/principal",
      password: "p",
      fullName: "../../t/t-attacker",
      redeem: async () => REDEEMED,
      finalize,
    });
    expect(finalize).toHaveBeenCalledWith(REDEEMED.member, REDEEMED.tokens);
  });

  it("a redeem failure returns its key and NEVER mints a session", async () => {
    const finalize = vi.fn(async () => {});
    const result = await runRedeem({
      token: "tok-1",
      password: "p",
      fullName: "n",
      redeem: async () => {
        throw { type: "account-exists" };
      },
      finalize,
    });
    expect(result).toEqual({ errorKey: "account-exists" });
    expect(finalize).not.toHaveBeenCalled();
  });

  it("a REPLAYED token stays link-invalid, not account-exists", async () => {
    const result = await runRedeem({
      token: "tok-1",
      password: "p",
      fullName: "n",
      redeem: async () => {
        throw { type: "link-invalid" };
      },
      finalize: async () => {},
    });
    expect(result).toEqual({ errorKey: "link-invalid" });
  });

  it("the finalize throw (its redirect) propagates — swallowing it would show a bogus error on a successful signup", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/vi/t/t-9/teacher;307;",
    });
    await expect(
      runRedeem({
        token: "tok-1",
        password: "p",
        fullName: "n",
        redeem: async () => REDEEMED,
        finalize: async () => {
          throw redirectError;
        },
      }),
    ).rejects.toBe(redirectError);
  });
});
