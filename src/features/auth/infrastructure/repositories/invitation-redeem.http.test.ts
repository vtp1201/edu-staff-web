/**
 * Integration test — `InvitationRedeemRepository` over the REAL axios pipeline
 * (US-E18.53, IAM US-191). Unlike the sibling unit test (which stubs `http`),
 * this builds the actual client from `bootstrap/lib/http` so the real request
 * interceptor, the real envelope unwrap and the real error normalisation all
 * run; only the transport adapter is replaced, capturing the exact outbound
 * request.
 *
 * This is the AC-level proof for "the token never appears in any outbound
 * query string": we inspect the fully-resolved axios config (`url`, `params`,
 * `data`) plus the serialised URL axios would have fetched.
 */
import type { InternalAxiosRequestConfig } from "axios";
import { describe, expect, it } from "vitest";
import { OAUTH_CLIENT_ID } from "@/bootstrap/endpoint/tenant.endpoint";
import { createHttpClient } from "@/bootstrap/lib/http";
import { InvitationRedeemRepository } from "./invitation-redeem.repository";

/**
 * The full URL axios would actually request, query string included — the exact
 * string a gateway access log / `Referer` header would capture.
 */
function requestedUrl(config: InternalAxiosRequestConfig): string {
  const base = `${config.baseURL ?? ""}${config.url ?? ""}`;
  const params = config.params as Record<string, unknown> | undefined;
  if (!params) return base;
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

function makeClient(
  respond: (config: InternalAxiosRequestConfig) => {
    status: number;
    data: unknown;
    headers?: Record<string, string>;
  },
) {
  const sent: InternalAxiosRequestConfig[] = [];
  const http = createHttpClient();
  http.defaults.adapter = async (config) => {
    sent.push(config as InternalAxiosRequestConfig);
    const r = respond(config as InternalAxiosRequestConfig);
    const response = {
      data: r.data,
      status: r.status,
      statusText: "",
      headers: r.headers ?? {},
      config,
    };
    if (r.status >= 400) {
      // Shape axios itself produces for a non-2xx, so `normalizeError` sees the
      // real thing rather than a hand-rolled approximation.
      const err = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response,
        config,
      });
      throw err;
    }
    // biome-ignore lint/suspicious/noExplicitAny: axios adapter response shape
    return response as any;
  };
  return { http, sent };
}

function successEnvelope(data: unknown) {
  return {
    success: true,
    data,
    error: null,
    meta: { requestId: "req-1", timestamp: "2026-08-07T00:00:00Z" },
  };
}

function errorEnvelope(code: string) {
  return {
    success: false,
    data: null,
    error: { code, message: "mock", retryable: code === "RATE_LIMIT_EXCEEDED" },
    meta: { requestId: "req-1", timestamp: "2026-08-07T00:00:00Z" },
  };
}

const TOKEN = "inv-tok-SECRET-8f3a";

describe("lookup over the real pipeline", () => {
  it("unwraps the envelope to the preview payload and sends the token ONLY in the JSON body", async () => {
    const { http, sent } = makeClient(() => ({
      status: 200,
      data: successEnvelope({
        email: "lan.pham@nguyendu.edu.vn",
        tenantName: "THPT Nguyễn Du",
        roles: ["TEACHER"],
        expiresAt: "2026-08-14T02:00:00Z",
      }),
    }));

    const preview = await new InvitationRedeemRepository(http).lookup(TOKEN);
    expect(preview.tenantName).toBe("THPT Nguyễn Du");

    const config = sent[0];
    expect(config.method).toBe("post");
    expect(JSON.parse(config.data as string)).toEqual({ token: TOKEN });
    expect(requestedUrl(config)).not.toContain(TOKEN);
    expect(requestedUrl(config)).not.toContain("?");
  });

  it("410 → the domain link-expired failure (real normalizeError → mapper path)", async () => {
    const { http } = makeClient(() => ({
      status: 410,
      data: errorEnvelope("INVITATION_EXPIRED"),
    }));
    await expect(
      new InvitationRedeemRepository(http).lookup(TOKEN),
    ).rejects.toEqual({ type: "link-expired" });
  });

  it("429 with Retry-After → rate-limited carrying the seconds (header read by the real interceptor)", async () => {
    const { http } = makeClient(() => ({
      status: 429,
      data: errorEnvelope("RATE_LIMIT_EXCEEDED"),
      headers: { "retry-after": "60" },
    }));
    await expect(
      new InvitationRedeemRepository(http).lookup(TOKEN),
    ).rejects.toEqual({ type: "rate-limited", retryAfterSeconds: 60 });
  });

  it("a transport failure (no response) → network-error", async () => {
    const http = createHttpClient();
    http.defaults.adapter = async () => {
      throw new Error("socket hang up");
    };
    await expect(
      new InvitationRedeemRepository(http).lookup(TOKEN),
    ).rejects.toEqual({ type: "network-error" });
  });
});

describe("redeem over the real pipeline", () => {
  it("sends token+password+fullName in the body, the client id as a header, and NOTHING in the query string", async () => {
    const { http, sent } = makeClient(() => ({
      status: 201,
      data: successEnvelope({
        member: {
          tenantId: "t-9",
          userId: "u-9",
          roles: ["TEACHER"],
          status: "ACTIVE",
        },
        tokens: {
          accessToken: "a",
          refreshToken: "r",
          tokenType: "Bearer",
          sessionId: "s",
        },
      }),
    }));

    const out = await new InvitationRedeemRepository(http).redeem({
      token: TOKEN,
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    expect(out.tokens.accessToken).toBe("a");

    const config = sent[0];
    expect(JSON.parse(config.data as string)).toEqual({
      token: TOKEN,
      password: "Matkhau@123",
      fullName: "Phạm Thị Lan",
    });
    expect(config.headers["X-Client-Id"]).toBe(OAUTH_CLIENT_ID);
    // The 201 is unwrapped like any other 2xx success envelope.
    expect(config.params).toBeUndefined();
    const url = requestedUrl(config);
    expect(url).not.toContain(TOKEN);
    expect(url).not.toContain("Matkhau@123");
    expect(url).toBe("http://localhost:8000/iam/api/v1/invitations/redeem");
  });

  it("no Authorization header is attached — this is a PUBLIC endpoint called before the visitor has any session", async () => {
    const { http, sent } = makeClient(() => ({
      status: 201,
      data: successEnvelope({
        member: { tenantId: "t", userId: "u", roles: [], status: "ACTIVE" },
        tokens: {
          accessToken: "a",
          refreshToken: "r",
          tokenType: "Bearer",
          sessionId: "s",
        },
      }),
    }));
    await new InvitationRedeemRepository(http).redeem({
      token: TOKEN,
      password: "Matkhau@123",
      fullName: "A",
    });
    expect(sent[0].headers.Authorization).toBeUndefined();
  });

  it("409 → account-exists through the real error pipeline", async () => {
    const { http } = makeClient(() => ({
      status: 409,
      data: errorEnvelope("INVITATION_ACCOUNT_EXISTS"),
    }));
    await expect(
      new InvitationRedeemRepository(http).redeem({
        token: TOKEN,
        password: "Matkhau@123",
        fullName: "A",
      }),
    ).rejects.toEqual({ type: "account-exists" });
  });
});
