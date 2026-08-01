import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * US-E18.22 (ADR `0065`) — the SSE proxy's real branch routes through Kong
 * (`NEXT_PUBLIC_API_URL`, same convention as every other repository) instead
 * of the retired direct-bypass `NOTI_SERVICE_URL` env var. `NOTI_EP.stream` is
 * now the Kong-prefixed `/noti/api/v1/stream`. Mirrors the `vi.stubEnv` +
 * `vi.resetModules()` + dynamic `import()` recipe from
 * `principal/reports/layout.test.ts` since `USE_MOCK` and the Kong base URL
 * are both frozen at module-eval time from `process.env`.
 *
 * `next/headers` + `auth-token.server` are mocked so the handler never touches
 * a real cookie jar; `global.fetch` is stubbed to inspect exactly what the
 * proxy sends upstream without a live `notification` service.
 */

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (_name: string) => undefined,
  })),
}));

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  getAccessToken: vi.fn(),
}));

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

describe("SSE proxy route GET (US-E18.22 Kong-routed real branch)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("AC-1: real mode fetches Kong (NEXT_PUBLIC_API_URL) + /noti/api/v1/stream with a Bearer token", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://kong.internal:8000");

    const { getAccessToken } = await import(
      "@/bootstrap/lib/auth-token.server"
    );
    const token = makeJwt({ tenantId: "school-a" });
    vi.mocked(getAccessToken).mockResolvedValue(token);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new ReadableStream(), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("./route");

    const request = new NextRequest(
      "http://localhost/vi/api/stream?tenant=school-a",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    // AC-1: exact Kong-routed path — a regression here (e.g. reverting to
    // direct-bypass or the bare `/api/v1/stream` path) would break this match.
    expect(url).toBe(
      "http://kong.internal:8000/noti/api/v1/stream?tenant=school-a",
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${token}`,
    );
  });

  it("AC-2: real mode with no NEXT_PUBLIC_API_URL override defaults to Kong's local :8000", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    const { getAccessToken } = await import(
      "@/bootstrap/lib/auth-token.server"
    );
    vi.mocked(getAccessToken).mockResolvedValue(makeJwt({ tenantId: "t1" }));

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new ReadableStream(), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost/vi/api/stream?tenant=t1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:8000/noti/api/v1/stream?tenant=t1");
  });

  it("AC-3: mock mode (NEXT_PUBLIC_USE_MOCK=true) never calls fetch — serves the mock upstream instead", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://kong.internal:8000");

    const { getAccessToken } = await import(
      "@/bootstrap/lib/auth-token.server"
    );
    vi.mocked(getAccessToken).mockResolvedValue(makeJwt({}));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("./route");

    const request = new NextRequest(
      "http://localhost/vi/api/stream?tenant=school-a",
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("AC-4: upstream 502 surfaces as Bad Gateway", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://kong.internal:8000");

    const { getAccessToken } = await import(
      "@/bootstrap/lib/auth-token.server"
    );
    vi.mocked(getAccessToken).mockResolvedValue(makeJwt({ tenantId: "t1" }));

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost/vi/api/stream?tenant=t1");
    const response = await GET(request);

    expect(response.status).toBe(502);
  });
});
