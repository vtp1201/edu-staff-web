/**
 * Unit tests — public `/invitations/redeem` RSC page (US-E18.53).
 *
 * The page performs the PREVIEW half of the two-step flow server-side (one
 * `POST /invitations/lookup`) and derives the screen state from it; the client
 * component only renders. These assertions cover the derivation before any
 * component mount — including the negative ones (a blank token must not spend
 * a rate-limit slot that `redeem` shares).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupExecute = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));

vi.mock("@/bootstrap/di/invitation-redeem.di", () => ({
  makeLookupInvitationUseCase: vi.fn(async () => ({ execute: lookupExecute })),
}));

// 'use server' module — exercised by actions.test.ts; stubbed so this file only
// covers the RSC's own derivation.
vi.mock("./actions", () => ({ redeemAction: vi.fn() }));

import InviteRedeemPage from "./page";

const PREVIEW = {
  email: "lan.pham@nguyendu.edu.vn",
  tenantName: "THPT Nguyễn Du",
  roles: ["TEACHER"],
  expiresAt: "2026-08-14T02:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

function searchParams(token?: string) {
  return Promise.resolve(token === undefined ? {} : { token });
}

describe("InviteRedeemPage — vm derivation", () => {
  it("a valid token renders the redemption form seeded with the server-resolved preview", async () => {
    lookupExecute.mockResolvedValue({ data: PREVIEW });
    const el = await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    expect(el.props.vm).toEqual({
      kind: "form",
      token: "tok-1",
      preview: PREVIEW,
    });
    expect(lookupExecute).toHaveBeenCalledWith("tok-1");
  });

  it.each([
    undefined,
    "",
    "   ",
  ])("a missing/blank token %p → invalid, with ZERO lookup call (never burn a slot of the shared rate-limit budget)", async (token) => {
    const el = await InviteRedeemPage({ searchParams: searchParams(token) });
    expect(el.props.vm).toEqual({ kind: "invalid" });
    expect(lookupExecute).not.toHaveBeenCalled();
  });

  it.each([
    ["link-invalid", "invalid"],
    ["link-expired", "expired"],
    ["rate-limited", "rate-limited"],
    ["tenant-inactive", "tenant-inactive"],
    ["network-error", "error"],
    ["unknown", "error"],
  ])("a %s lookup failure derives the %p state", async (type, kind) => {
    lookupExecute.mockResolvedValue({ error: { type } });
    const el = await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    expect(el.props.vm).toEqual({ kind });
  });

  it("a 409 can never come from lookup (the BE never returns one there) — an unexpected key still degrades to the generic error, not a crash", async () => {
    lookupExecute.mockResolvedValue({ error: { type: "account-exists" } });
    const el = await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    expect(el.props.vm).toEqual({ kind: "error" });
  });
});

describe("InviteRedeemPage — hrefs + action wiring", () => {
  it("builds locale-prefixed login/accept hrefs, URL-encoding the token into the accept fallback", async () => {
    lookupExecute.mockResolvedValue({ data: PREVIEW });
    const el = await InviteRedeemPage({
      searchParams: searchParams("tok with space"),
    });
    expect(el.props.loginHref).toBe("/vi/login");
    expect(el.props.acceptHref).toBe(
      "/vi/invitations/accept?token=tok%20with%20space",
    );
  });

  it("with no token the accept fallback degrades to the bare accept route (no `?token=undefined`)", async () => {
    const el = await InviteRedeemPage({
      searchParams: searchParams(undefined),
    });
    expect(el.props.acceptHref).toBe("/vi/invitations/accept");
  });

  it("wires onRedeem to the actions module's export (never a locally-defined closure — that would 500 at runtime)", async () => {
    lookupExecute.mockResolvedValue({ data: PREVIEW });
    const actions = await import("./actions");
    const el = await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    expect(el.props.onRedeem).toBe(actions.redeemAction);
  });
});
