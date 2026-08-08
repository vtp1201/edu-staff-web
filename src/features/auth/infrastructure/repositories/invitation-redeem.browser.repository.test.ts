/**
 * Unit tests — `BrowserInvitationRedeemRepository` (US-E18.59, ADR 0072).
 *
 * This repository is the FIRST BE call in the app issued directly from the
 * browser, so the assertions are about the CALL SHAPE and the error contract:
 *
 *  - the invitation token travels in the POST BODY only — never a query
 *    string, never a header (ADR 0071's guarantee must survive the move from
 *    the server-side axios client to `fetch`);
 *  - no cookie/credential rides along (`credentials: "omit"`) — the visitor
 *    has no account yet and a bystander's session must not be attached;
 *  - every failure becomes an {@link ApiError} of exactly the shape the
 *    UNCHANGED `mapInvitationRedeemFailure` already consumes.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IAM_MEMBER_EP } from "@/bootstrap/endpoint/iam-member.endpoint";
import { OAUTH_CLIENT_ID } from "@/bootstrap/endpoint/tenant.endpoint";
import { isApiError } from "@/bootstrap/lib/api-envelope";
import { API_URL } from "@/bootstrap/lib/http";
import { mapInvitationRedeemFailure } from "../mappers/invitation-redeem.mapper";
import {
  apiErrorFromResponse,
  BrowserInvitationRedeemRepository,
} from "./invitation-redeem.browser.repository";

const LOOKUP_DTO = {
  email: "lan.pham@nguyendu.edu.vn",
  tenantName: "THPT Nguyễn Du",
  roles: ["TEACHER"],
  expiresAt: "2026-08-14T02:00:00Z",
};

const REDEEM_DTO = {
  member: {
    tenantId: "t-9",
    userId: "u-9",
    roles: ["TEACHER"],
    status: "ACTIVE",
  },
  tokens: {
    accessToken: "a",
    refreshToken: "r",
    tokenType: "Bearer" as const,
    sessionId: "s",
  },
};

const TOKEN = "inv-tok-secret";

interface Sent {
  url: string;
  init: RequestInit;
}

const sent: Sent[] = [];
const originalFetch = globalThis.fetch;

/** Stub `fetch` with a scripted envelope response. */
function stubFetch(res: {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  reject?: boolean;
}) {
  globalThis.fetch = vi.fn(async (url: string | URL, init?: RequestInit) => {
    sent.push({ url: String(url), init: init ?? {} });
    if (res.reject) throw new TypeError("Failed to fetch");
    return new Response(
      res.body === undefined ? null : JSON.stringify(res.body),
      {
        status: res.status,
        headers: { "Content-Type": "application/json", ...res.headers },
      },
    );
    // biome-ignore lint/suspicious/noExplicitAny: test transport stub
  }) as any;
}

function envelope(data: unknown) {
  return { success: true, data, error: null, meta: { requestId: "req-1" } };
}

function errorEnvelope(
  code: string,
  extra: Record<string, unknown> = {},
): unknown {
  return {
    success: false,
    data: null,
    error: { code, message: "boom", retryable: false, ...extra },
    meta: { requestId: "req-err" },
  };
}

beforeEach(() => {
  sent.length = 0;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const repo = () => new BrowserInvitationRedeemRepository();

describe("BrowserInvitationRedeemRepository — lookup call shape", () => {
  it("POSTs { token } to the lookup endpoint and maps the preview through the EXISTING mapper", async () => {
    stubFetch({ status: 200, body: envelope(LOOKUP_DTO) });

    const preview = await repo().lookup(TOKEN);

    expect(preview).toEqual({
      email: LOOKUP_DTO.email,
      tenantName: LOOKUP_DTO.tenantName,
      roles: ["TEACHER"],
      expiresAt: LOOKUP_DTO.expiresAt,
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe(`${API_URL}${IAM_MEMBER_EP.lookupInvitation}`);
    expect(sent[0].init.method).toBe("POST");
    expect(JSON.parse(String(sent[0].init.body))).toEqual({ token: TOKEN });
  });

  it("sends no credentials and no cookie — the redeemer has no session, and a bystander's must not ride along", async () => {
    stubFetch({ status: 200, body: envelope(LOOKUP_DTO) });
    await repo().lookup(TOKEN);
    expect(sent[0].init.credentials).toBe("omit");
  });

  it("the token NEVER reaches the URL or a header — body only (ADR 0071)", async () => {
    stubFetch({ status: 200, body: envelope(LOOKUP_DTO) });
    await repo().lookup(TOKEN);

    expect(sent[0].url).not.toContain("?");
    expect(sent[0].url).not.toContain(TOKEN);
    const headers = sent[0].init.headers as Record<string, string>;
    expect(Object.values(headers).join("|")).not.toContain(TOKEN);
    expect(Object.keys(headers)).toEqual(["Content-Type"]);
  });
});

describe("BrowserInvitationRedeemRepository — redeem call shape", () => {
  it("POSTs exactly {token,password,fullName} plus the fixed X-Client-Id audit header", async () => {
    stubFetch({ status: 201, body: envelope(REDEEM_DTO) });

    const out = await repo().redeem({
      token: TOKEN,
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });

    expect(out.member.tenantId).toBe("t-9");
    expect(out.tokens).toEqual({
      accessToken: "a",
      refreshToken: "r",
      sessionId: "s",
    });
    expect(sent[0].url).toBe(`${API_URL}${IAM_MEMBER_EP.redeemInvitation}`);
    expect(JSON.parse(String(sent[0].init.body))).toEqual({
      token: TOKEN,
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    const headers = sent[0].init.headers as Record<string, string>;
    expect(headers["X-Client-Id"]).toBe(OAUTH_CLIENT_ID);
  });

  it("never spreads unknown command fields onto the wire", async () => {
    stubFetch({ status: 201, body: envelope(REDEEM_DTO) });
    await repo().redeem({
      token: TOKEN,
      password: "p",
      fullName: "n",
      // biome-ignore lint/suspicious/noExplicitAny: simulating a future field
    } as any);
    expect(Object.keys(JSON.parse(String(sent[0].init.body)))).toEqual([
      "token",
      "password",
      "fullName",
    ]);
  });

  it("the X-Client-Id header never carries the token, and the URL stays bare", async () => {
    stubFetch({ status: 201, body: envelope(REDEEM_DTO) });
    await repo().redeem({ token: TOKEN, password: "p", fullName: "n" });
    const headers = sent[0].init.headers as Record<string, string>;
    expect(Object.values(headers).join("|")).not.toContain(TOKEN);
    expect(sent[0].url).not.toContain("?");
    expect(sent[0].url).not.toContain(TOKEN);
  });
});

describe("BrowserInvitationRedeemRepository — fetch → ApiError → failure", () => {
  it.each([
    [410, "INVITATION_INVALID", "link-invalid"],
    [410, "INVITATION_EXPIRED", "link-expired"],
    [409, "INVITATION_ACCOUNT_EXISTS", "account-exists"],
    [403, "FORBIDDEN_ACTION", "tenant-inactive"],
  ])("a %s %s response throws a failure the UNCHANGED mapper reads as %s", async (status, code, type) => {
    stubFetch({ status, body: errorEnvelope(code) });
    const err = await repo()
      .lookup(TOKEN)
      .catch((e) => e);
    expect(err).toEqual({ type });
  });

  it("a 429 carries the numeric Retry-After through to the failure", async () => {
    stubFetch({
      status: 429,
      body: errorEnvelope("RATE_LIMIT_EXCEEDED"),
      headers: { "Retry-After": "45" },
    });
    const err = await repo()
      .lookup(TOKEN)
      .catch((e) => e);
    expect(err).toEqual({ type: "rate-limited", retryAfterSeconds: 45 });
  });

  it("a non-numeric Retry-After is ignored rather than guessed at", async () => {
    stubFetch({
      status: 429,
      body: errorEnvelope("RATE_LIMIT_EXCEEDED"),
      headers: { "Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT" },
    });
    const err = await repo()
      .lookup(TOKEN)
      .catch((e) => e);
    expect(err).toEqual({ type: "rate-limited", retryAfterSeconds: undefined });
  });

  it("a 422 with field issues survives into invalid-input (fields[] preserved on the ApiError)", async () => {
    stubFetch({
      status: 422,
      body: errorEnvelope("VALIDATION_FAILED", {
        fields: [{ field: "password", message: "too weak" }],
      }),
    });
    const err = await repo()
      .redeem({ token: TOKEN, password: "p", fullName: "n" })
      .catch((e) => e);
    expect(err).toEqual({ type: "invalid-input", issues: ["passwordInvalid"] });
  });

  it("a 2xx `success:false` envelope is still a failure, never a bogus success", async () => {
    stubFetch({ status: 200, body: errorEnvelope("INVITATION_INVALID") });
    const err = await repo()
      .lookup(TOKEN)
      .catch((e) => e);
    expect(err).toEqual({ type: "link-invalid" });
  });

  it("a rejected fetch (offline/CORS/DNS) becomes a network-error failure, retryable", async () => {
    stubFetch({ status: 0, reject: true });
    const err = await repo()
      .lookup(TOKEN)
      .catch((e) => e);
    expect(err).toEqual({ type: "network-error" });
  });

  it("a non-JSON gateway body (HTML 502) degrades to the generic failure instead of throwing a parse error", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("<html>bad gateway</html>", {
          status: 502,
          headers: { "Content-Type": "text/html" },
        }),
      // biome-ignore lint/suspicious/noExplicitAny: test transport stub
    ) as any;
    const err = await repo()
      .lookup(TOKEN)
      .catch((e) => e);
    expect(err).toEqual({ type: "unknown" });
  });
});

describe("apiErrorFromResponse — the fetch→ApiError adapter itself", () => {
  it("produces the SAME normalised contract axios' `normalizeError` does, so the mapper needs no change", () => {
    const err = apiErrorFromResponse(
      429,
      errorEnvelope("RATE_LIMIT_EXCEEDED", { retryable: true }),
      new Headers({ "Retry-After": "30" }),
    );
    expect(isApiError(err)).toBe(true);
    expect(err.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(err.status).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.requestId).toBe("req-err");
    expect(err.retryAfterSeconds).toBe(30);
    expect(mapInvitationRedeemFailure(err)).toEqual({
      type: "rate-limited",
      retryAfterSeconds: 30,
    });
  });

  it("an unparseable body still yields a usable ApiError (code UNKNOWN_ERROR + the status)", () => {
    const err = apiErrorFromResponse(502, undefined, new Headers());
    expect(err.code).toBe("UNKNOWN_ERROR");
    expect(err.status).toBe(502);
    expect(err.retryable).toBe(false);
  });
});
