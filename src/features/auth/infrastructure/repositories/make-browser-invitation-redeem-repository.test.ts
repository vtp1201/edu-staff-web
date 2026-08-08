/**
 * Unit tests — client-safe repository factory (US-E18.59, ADR 0072).
 *
 * The env matrix is the whole point: `USE_MOCK` picks the browser mock, real
 * mode picks the `fetch` repository, and NEITHER path may pull in a
 * `server-only` module (which would break the client bundle at build time).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL = process.env.NEXT_PUBLIC_USE_MOCK;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
  else process.env.NEXT_PUBLIC_USE_MOCK = ORIGINAL;
});

async function factory() {
  const mod = await import("./make-browser-invitation-redeem-repository");
  return mod.makeBrowserInvitationRedeemRepository();
}

describe("makeBrowserInvitationRedeemRepository", () => {
  it("USE_MOCK=true builds the browser mock", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "true";
    const { BrowserMockInvitationRedeemRepository } = await import(
      "./mocks/invitation-redeem.browser-mock.repository"
    );
    expect(await factory()).toBeInstanceOf(
      BrowserMockInvitationRedeemRepository,
    );
  });

  it.each([
    "false",
    undefined,
  ])("USE_MOCK=%p builds the real browser fetch repository", async (value) => {
    if (value === undefined) delete process.env.NEXT_PUBLIC_USE_MOCK;
    else process.env.NEXT_PUBLIC_USE_MOCK = value;
    const { BrowserInvitationRedeemRepository } = await import(
      "./invitation-redeem.browser.repository"
    );
    expect(await factory()).toBeInstanceOf(BrowserInvitationRedeemRepository);
  });

  it("reads the flag per CALL, so a mode change is never frozen at module load", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK = "true";
    const mod = await import("./make-browser-invitation-redeem-repository");
    const mocked = mod.makeBrowserInvitationRedeemRepository();
    process.env.NEXT_PUBLIC_USE_MOCK = "false";
    const real = mod.makeBrowserInvitationRedeemRepository();
    expect(real.constructor.name).not.toBe(mocked.constructor.name);
  });
});
