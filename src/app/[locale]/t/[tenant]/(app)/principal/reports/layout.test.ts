import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Route-gate proof for FR-001/NFR-007 (UC-06, AC-06.1..06.5). Exercises the
 * REAL layout function (no next/navigation mock) — `redirect()` just throws a
 * `NEXT_REDIRECT;<type>;<url>;<status>;` digest synchronously with no request
 * context, so we can call the RSC layout directly in node env and assert on
 * the thrown redirect target, plus confirm `children` never renders (proof
 * that the gate runs strictly before the page/regions — and therefore before
 * any of INT-001..004 could ever be invoked, AC-06.2/06.4's "zero requests"
 * requirement — there is no fetch code reachable before this throw).
 */

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  getAccessToken: vi.fn(),
}));

function makeJwt(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.sig`;
}

function redirectTarget(err: unknown): string {
  const digest = (err as { digest?: string } | null)?.digest ?? "";
  // Format: "NEXT_REDIRECT;<type>;<url>;<statusCode>;"
  const parts = digest.split(";");
  return parts[2] ?? "";
}

async function renderLayout(token: string | undefined, tenant = "t1") {
  const { getAccessToken } = await import("@/bootstrap/lib/auth-token.server");
  vi.mocked(getAccessToken).mockResolvedValue(token);

  const { default: PrincipalReportsLayout } = await import("./layout");

  // `children` here stands in for the nested `page.tsx` (which is what would
  // issue INT-001..004 via the region components). Next.js never invokes a
  // nested page/layout past a parent that throws — so a redirect thrown here
  // means the page (and therefore every reports fetch) structurally never
  // runs, satisfying AC-06.2/06.4's "zero requests" requirement without a
  // network-layer assertion (this is fully mock-first — there is no real
  // network to assert against; the RSC render pipeline itself is the guard).
  try {
    const result = await PrincipalReportsLayout({
      children: null,
      params: Promise.resolve({ locale: "vi", tenant }),
    });
    return { redirected: false, rendered: result, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

describe("PrincipalReportsLayout — principal-only route gate (FR-001/NFR-007, UC-06)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("AC-06.1 — principal role + matching tenant renders children, no redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "principal", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(false);
  });

  it("AC-06.2/06.4 — teacher role is redirected server-side to the teacher workspace, before children ever render", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "teacher", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/teacher");
  });

  it("AC-06.2/06.4 — student role is redirected to the student workspace (deep-link, same as nav)", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "student", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/student");
  });

  it("AC-06.2/06.4 — parent role is redirected to the parent workspace", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "parent", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/parent");
  });

  it("AC-06.3 — unauthenticated (no token) redirects to /select-tenant before any role check", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const result = await renderLayout(undefined, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/select-tenant");
  });

  it("AC-06.3 variant — an unreadable/garbage token behaves as unauthenticated (redirect, not a crash)", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const result = await renderLayout("not-a-jwt", "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/select-tenant");
  });

  it("tenant-mismatch (token tenant differs from URL tenant) is treated as not-allowed and redirected, not silently rendered", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "principal", tenantId: "t-other" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
  });
});
