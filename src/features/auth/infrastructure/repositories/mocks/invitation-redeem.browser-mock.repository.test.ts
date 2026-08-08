/**
 * Unit tests — browser-safe mock PUBLIC invitation repository (US-E18.59).
 *
 * Two things matter here. First the behaviour contract inherited from the
 * deleted server-only mock: an invitation is SINGLE-USE, and a replay is
 * `link-invalid` (410), never `account-exists` (409). Second, and new: this
 * code now runs IN THE BROWSER, so it must not touch a Node-only global. The
 * `Buffer`-less proof below deletes `globalThis.Buffer` for the duration of the
 * call, which is the only way to be sure a `Buffer.from(...)` did not sneak
 * back in (a source read would not catch a transitive helper).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BrowserMockInvitationRedeemRepository } from "./invitation-redeem.browser-mock.repository";

const VALID = "tok-happy";

const repo = () => new BrowserMockInvitationRedeemRepository();

const REDEEM = {
  token: VALID,
  password: "Matkhau@123",
  fullName: "Phạm Thị Lan",
};

beforeEach(() => {
  BrowserMockInvitationRedeemRepository.reset();
});

describe("BrowserMockInvitationRedeemRepository — happy path", () => {
  it("previews a fresh token with a future expiry", async () => {
    const preview = await repo().lookup(VALID);
    expect(preview.email).toBe("lan.pham@nguyendu.edu.vn");
    expect(preview.roles).toEqual(["TEACHER"]);
    expect(new Date(preview.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("redeems a fresh token into an ACTIVE membership + tenant-scoped session", async () => {
    const out = await repo().redeem(REDEEM);
    expect(out.member.status).toBe("ACTIVE");
    expect(out.member.tenantId).toBe("tenant-acme");
    expect(out.tokens.accessToken.split(".")).toHaveLength(3);
  });

  it("mints the fake JWT with a payload the server-side tenant decoder can read", async () => {
    const out = await repo().redeem(REDEEM);
    const payload = out.tokens.accessToken.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    expect(JSON.parse(json).tenantId).toBe("tenant-acme");
  });
});

describe("BrowserMockInvitationRedeemRepository — browser safety", () => {
  const savedBuffer = globalThis.Buffer;

  afterEach(() => {
    globalThis.Buffer = savedBuffer;
  });

  it("works with NO Buffer global at all (the browser has none)", async () => {
    // @ts-expect-error simulating a browser realm for the duration of the call
    delete globalThis.Buffer;
    const out = await repo().redeem(REDEEM);
    expect(out.tokens.accessToken).toContain(".");
    expect(globalThis.Buffer).toBeUndefined();
  });
});

describe("BrowserMockInvitationRedeemRepository — injected latency", () => {
  it("defaults to zero (deterministic tests) and honours an injected wait (visible dev loading state)", async () => {
    const started = Date.now();
    await repo().lookup(VALID);
    expect(Date.now() - started).toBeLessThan(20);

    const slowStart = Date.now();
    await new BrowserMockInvitationRedeemRepository(30).lookup(VALID);
    expect(Date.now() - slowStart).toBeGreaterThanOrEqual(25);
  });
});

describe("BrowserMockInvitationRedeemRepository — single use", () => {
  it("a SECOND redeem of the same token is link-invalid (410 replay), NOT account-exists (409)", async () => {
    await repo().redeem(REDEEM);
    const err = await repo()
      .redeem(REDEEM)
      .catch((e) => e);
    expect(err).toEqual({ type: "link-invalid" });
  });

  it("looking up a consumed token is dead too, matching the real read", async () => {
    await repo().redeem(REDEEM);
    const err = await repo()
      .lookup(VALID)
      .catch((e) => e);
    expect(err).toEqual({ type: "link-invalid" });
  });

  it("reset() clears the consumed set so a scenario can start clean", async () => {
    await repo().redeem(REDEEM);
    BrowserMockInvitationRedeemRepository.reset();
    await expect(repo().redeem(REDEEM)).resolves.toBeTruthy();
  });
});

describe("BrowserMockInvitationRedeemRepository — failure markers", () => {
  it.each([
    ["tok-expired", "link-expired"],
    ["tok-used", "link-invalid"],
    ["tok-invalid", "link-invalid"],
    ["tok-exists", "account-exists"],
    ["tok-limited", "rate-limited"],
    ["tok-inactive", "tenant-inactive"],
    ["tok-offline", "network-error"],
  ])("%s drives lookup into %s", async (token, type) => {
    const err = await repo()
      .lookup(token)
      .catch((e) => e);
    expect(err.type).toBe(type);
  });

  it("the marker also fires on redeem, and rate-limited carries a wait", async () => {
    const err = await repo()
      .redeem({ ...REDEEM, token: "tok-limited" })
      .catch((e) => e);
    expect(err).toEqual({ type: "rate-limited", retryAfterSeconds: 60 });
  });

  it("a marker token is never consumed — the state stays reproducible on reload", async () => {
    await repo()
      .redeem({ ...REDEEM, token: "tok-exists" })
      .catch(() => {});
    const err = await repo()
      .redeem({ ...REDEEM, token: "tok-exists" })
      .catch((e) => e);
    expect(err).toEqual({ type: "account-exists" });
  });
});
