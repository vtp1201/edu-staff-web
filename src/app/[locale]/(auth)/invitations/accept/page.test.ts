/**
 * Unit tests — public `/invitations/accept` RSC page (US-E21.2, ADR 0059).
 * Verifies the server-side `vm` derivation branches BEFORE any component
 * mount: missing/blank token → `invalid` (zero network call — no profile
 * lookup fires); token + no session cookie → `auth-gate`; token + session →
 * `signed-in`; token + present-but-unusable session (profile lookup returns
 * no data, e.g. refresh failed) → falls back to `auth-gate`, not a crash.
 *
 * `InviteAcceptScreen` itself is `'use client'` — we don't mount it here
 * (that's the Storybook interaction suite's job), we only assert the RSC's
 * derived `vm`/`loginHref` props are correct, which is untestable at the
 * component level since the component never computes them itself.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAccessToken = vi.fn();
const profileExecute = vi.fn();

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  getAccessToken: (...args: unknown[]) => getAccessToken(...args),
}));

vi.mock("@/bootstrap/di/auth.di", () => ({
  makeGetProfileUseCase: vi.fn(async () => ({ execute: profileExecute })),
}));

// The actions module is 'use server' and pulls in next/navigation redirect +
// DI factories tested separately in actions.test.ts — stub it here so this
// file only exercises the RSC's own vm-derivation branching.
vi.mock("./actions", () => ({
  joinAction: vi.fn(),
  switchAccountAction: vi.fn(),
}));

import InviteAcceptPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

function searchParams(token?: string) {
  return Promise.resolve(token === undefined ? {} : { token });
}

describe("InviteAcceptPage — vm derivation", () => {
  it("missing token → { kind: 'invalid' }, zero profile/network call", async () => {
    const el = await InviteAcceptPage({
      searchParams: searchParams(undefined),
    });
    expect(el.props.vm).toEqual({ kind: "invalid" });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(profileExecute).not.toHaveBeenCalled();
  });

  it("blank/whitespace token → { kind: 'invalid' }, zero profile/network call", async () => {
    const el = await InviteAcceptPage({ searchParams: searchParams("   ") });
    expect(el.props.vm).toEqual({ kind: "invalid" });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(profileExecute).not.toHaveBeenCalled();
  });

  it("token present, no session cookie → { kind: 'auth-gate' }", async () => {
    getAccessToken.mockResolvedValue(undefined);
    const el = await InviteAcceptPage({ searchParams: searchParams("tok-1") });
    expect(el.props.vm).toEqual({ kind: "auth-gate" });
    expect(profileExecute).not.toHaveBeenCalled();
  });

  it("token present, session cookie present + profile resolves → { kind: 'signed-in' }", async () => {
    getAccessToken.mockResolvedValue("access-tok");
    profileExecute.mockResolvedValue({
      data: { email: "gv.lan@nguyendu.edu.vn" },
    });
    const el = await InviteAcceptPage({ searchParams: searchParams("tok-1") });
    expect(el.props.vm).toEqual({
      kind: "signed-in",
      email: "gv.lan@nguyendu.edu.vn",
      token: "tok-1",
    });
  });

  it("token present, session cookie present but profile lookup returns no data (stale/failed refresh) → falls back to auth-gate, does not throw", async () => {
    getAccessToken.mockResolvedValue("access-tok");
    profileExecute.mockResolvedValue({ data: null });
    const el = await InviteAcceptPage({ searchParams: searchParams("tok-1") });
    expect(el.props.vm).toEqual({ kind: "auth-gate" });
  });

  it("builds a locale-prefixed loginHref from getLocale()", async () => {
    const el = await InviteAcceptPage({
      searchParams: searchParams(undefined),
    });
    expect(el.props.loginHref).toBe("/vi/login");
  });

  it("wires onJoin/onSwitchAccount to the actions module's exports", async () => {
    const actions = await import("./actions");
    const el = await InviteAcceptPage({
      searchParams: searchParams(undefined),
    });
    expect(el.props.onJoin).toBe(actions.joinAction);
    expect(el.props.onSwitchAccount).toBe(actions.switchAccountAction);
  });
});
