/**
 * Unit tests — public `/invitations/redeem` RSC page (US-E18.53, rewritten for
 * US-E18.59 / ADR 0072).
 *
 * The page used to perform the `lookup` server-side. It must not any more: the
 * per-IP rate limit only works if the BROWSER makes that call, so the strongest
 * assertion here is a NEGATIVE one — the RSC does no data fetching at all and
 * simply hands the token to the client container. A blank token still renders
 * the dead-link card with no container mounted, so no request can be issued for
 * a link that cannot work.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));

// 'use server' module — covered by actions.test.ts; stubbed so this file only
// covers the RSC's own wiring.
vi.mock("./actions", () => ({ finalizeRedeemAction: vi.fn() }));

import { InviteRedeemContainer } from "@/features/auth/presentation/invite-redeem/invite-redeem-container";
import { InviteRedeemScreen } from "@/features/auth/presentation/invite-redeem/invite-redeem-screen";
import InviteRedeemPage from "./page";

function searchParams(token?: string) {
  return Promise.resolve(token === undefined ? {} : { token });
}

describe("InviteRedeemPage — no server-side fetching", () => {
  it("renders the CLIENT container with the raw token: the rate-limited lookup must originate in the browser", async () => {
    const el = await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    expect(el.type).toBe(InviteRedeemContainer);
    expect(el.props.token).toBe("tok-1");
  });

  it("issues no request of its own while rendering", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("imports no DI factory or repository — the deleted server path must not come back", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).not.toMatch(/bootstrap\/di/);
    expect(source).not.toMatch(/infrastructure\/repositories/);
    expect(source).not.toMatch(/UseCase/);
  });
});

describe("InviteRedeemPage — blank token short-circuit", () => {
  it.each([
    undefined,
    "",
    "   ",
  ])("a missing/blank token %p renders the dead-link card directly, with NO container mounted (zero network)", async (token) => {
    const el = await InviteRedeemPage({ searchParams: searchParams(token) });
    expect(el.type).toBe(InviteRedeemScreen);
    expect(el.props.vm).toEqual({ kind: "invalid" });
    // Nothing to submit on a dead link.
    expect(el.props.onRedeem).toBeUndefined();
  });
});

describe("InviteRedeemPage — hrefs + action wiring", () => {
  it("builds locale-prefixed login/accept hrefs, URL-encoding the token into the accept fallback", async () => {
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

  it("wires onFinalize to the actions module's export (never a locally-defined closure — that would 500 at runtime)", async () => {
    const actions = await import("./actions");
    const el = await InviteRedeemPage({ searchParams: searchParams("tok-1") });
    expect(el.props.onFinalize).toBe(actions.finalizeRedeemAction);
  });
});
