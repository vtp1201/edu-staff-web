import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Route-gate proof for `admin/layout.tsx` (harness backlog #1, US-E12.8
 * follow-up). US-E12.8's own validation only unit-tested the pure
 * `evaluateAdminAccess` (`role-guard.test.ts`) and explicitly deferred a
 * direct test of the RSC layout itself as an "E2E gap" — meanwhile
 * `principal/layout.tsx` (added later by `INFRA-rsc-layout-guards-role-groups`)
 * DID get this exact style of direct test. This closes the gap for `admin`,
 * mirroring `principal/layout.test.ts`'s recipe: `redirect()` throws a
 * `NEXT_REDIRECT;<type>;<url>;<status>;` digest synchronously with no request
 * context, so the guard's full wiring (`getAccessToken` → `decodeRoleClaim` →
 * `evaluateAdminAccess` → `redirect()`) can be exercised directly in node env.
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
  const parts = digest.split(";");
  return parts[2] ?? "";
}

async function renderLayout(token: string | undefined, tenant = "t1") {
  const { getAccessToken } = await import("@/bootstrap/lib/auth-token.server");
  vi.mocked(getAccessToken).mockResolvedValue(token);

  const { default: AdminLayout } = await import("./layout");

  // `children` stands in for any `(app)/admin/*` page. Next.js never invokes
  // a nested page/layout past a parent that throws — a redirect thrown here
  // means the admin page (and its data query) structurally never runs.
  try {
    const result = await AdminLayout({
      children: null,
      params: Promise.resolve({ locale: "vi", tenant }),
    });
    return { redirected: false, rendered: result, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

describe("AdminLayout — admin-only route gate (US-E12.8, harness backlog #1)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("admin role + matching tenant renders children, no redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "admin", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(false);
  });

  it("teacher role is redirected to its own default route before any /admin/* page renders", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "teacher", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/teacher");
  });

  it("principal role is redirected to its own default route", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "principal", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/principal");
  });

  it("student role is redirected to its own default route", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "student", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/student");
  });

  it("parent role is redirected to its own default route", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "parent", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/parent");
  });

  it("unauthenticated (no token) redirects to /select-tenant before any role check", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const result = await renderLayout(undefined, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/select-tenant");
  });

  it("a garbage token behaves as unauthenticated, redirect not a crash", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const result = await renderLayout("not-a-jwt", "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/select-tenant");
  });

  // NOTE: same scope boundary as `principal/layout.test.ts` — this guard
  // (`evaluateAdminAccess`, role-only) does not itself re-check
  // tokenTenantId vs. urlTenantId; that is the parent `(app)/layout.tsx`'s
  // job and runs first, so a "same-role, different-tenant" case is out of
  // THIS guard's contract by design.
});
