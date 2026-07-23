import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * US-E18.18 AC-1 — `NOTI_EP.stream === "/api/v1/stream"` and the real (non-mock)
 * branch of the SSE proxy fetches THAT path from `NOTI_SERVICE_URL`, forwarding
 * a Bearer token. Mirrors the `vi.stubEnv` + `vi.resetModules()` + dynamic
 * `import()` recipe from `principal/reports/layout.test.ts` since `USE_MOCK`
 * and `NOTI_URL` are both frozen at module-eval time from `process.env`.
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

describe("SSE proxy route GET (US-E18.18 real-branch upstream path)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("AC-1: real mode fetches NOTI_SERVICE_URL + /api/v1/stream with a Bearer token", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NOTI_SERVICE_URL", "http://noti.internal");

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
    // AC-1: exact real path — a regression here (e.g. reverting to the old
    // "/events/stream") would break this string match.
    expect(url).toBe("http://noti.internal/api/v1/stream?tenant=school-a");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Bearer ${token}`,
    );
  });

  it("AC-1: mock mode (NEXT_PUBLIC_USE_MOCK=true) never calls fetch — serves the mock upstream instead", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "true");
    vi.stubEnv("NOTI_SERVICE_URL", "http://noti.internal");

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

  it("AC-1: no NOTI_SERVICE_URL configured falls back to the mock upstream (never fetch)", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    vi.stubEnv("NOTI_SERVICE_URL", "");

    const { getAccessToken } = await import(
      "@/bootstrap/lib/auth-token.server"
    );
    vi.mocked(getAccessToken).mockResolvedValue(makeJwt({ tenantId: "t1" }));

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { NextRequest } = await import("next/server");
    const { GET } = await import("./route");

    const request = new NextRequest("http://localhost/vi/api/stream?tenant=t1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
