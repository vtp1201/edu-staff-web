import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Route-gate proof for US-E13.8 FR-008 (AC-1.23..1.27) — this is the FIRST
 * direct test of the top-level `(app)/principal/layout.tsx` guard itself
 * (the generic `evaluateNamespaceAccess` logic already has thorough coverage
 * in `bootstrap/tenant/role-guard.test.ts`, but nothing previously exercised
 * THIS route's own RSC wiring — `getAccessToken` → `decodeRoleClaim` →
 * `evaluateNamespaceAccess` → `redirect()` — the exact mechanism
 * `(app)/principal/classes` depends on). Mirrors the sibling
 * `principal/reports/layout.test.ts` recipe: `redirect()` throws a
 * `NEXT_REDIRECT;<type>;<url>;<status>;` digest synchronously with no request
 * context, so the guard can be exercised directly in node env; a thrown
 * redirect proves `children` (and therefore `(app)/principal/classes/page.tsx`
 * and its data query) never renders.
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

  const { default: PrincipalLayout } = await import("./layout");

  // `children` stands in for `(app)/principal/classes/page.tsx` (the RSC that
  // would issue the `listClasses` query). Next.js never invokes a nested
  // page/layout past a parent that throws — so a redirect thrown here means
  // the classes screen (and therefore its data call) structurally never runs.
  try {
    const result = await PrincipalLayout({
      children: null,
      params: Promise.resolve({ locale: "vi", tenant }),
    });
    return { redirected: false, rendered: result, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

describe("PrincipalLayout — principal-only route gate (US-E13.8 FR-008, AC-1.23..1.27)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("AC-1.23 — principal role + matching tenant renders children (classes screen), no redirect", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "principal", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(false);
  });

  it("AC-1.24 — teacher role is redirected before /principal/classes (and its query) ever renders", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "teacher", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/teacher");
  });

  it("AC-1.25 — admin role is redirected, own /admin/classes CRUD screen stays unaffected/unreachable from here", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "admin", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toContain("/admin");
  });

  it("AC-1.26 — student role is redirected (no distinct behavior vs. parent)", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const token = makeJwt({ role: "student", tenantId: "t1" });
    const result = await renderLayout(token, "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/t/t1/student");
  });

  it("AC-1.26 — parent role is redirected (no distinct behavior vs. student)", async () => {
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

  it("AC-1.27 (defensive, session-boundary variant) — a re-provisioned/garbage token behaves as unauthenticated, redirect not a crash", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");
    const result = await renderLayout("not-a-jwt", "t1");
    expect(result.redirected).toBe(true);
    expect(result.url).toBe("/vi/select-tenant");
  });

  // NOTE: unlike `principal/reports/layout.tsx` (which re-checks tokenTenantId
  // vs. urlTenantId itself via `evaluateAccess`), this top-level guard calls
  // `evaluateNamespaceAccess(role, locale, tenant, "principal")`, which checks
  // ROLE ONLY — tenant-membership enforcement is delegated to the parent
  // `(app)/layout.tsx` (`evaluateAccess({ role, tokenTenantId, urlTenantId })`,
  // which runs first and already redirects on mismatch before this nested
  // layout is ever reached). A "same-role, different-tenant" case is
  // therefore out of THIS guard's contract by design, not a gap — verified by
  // reading `(app)/layout.tsx` directly (confirmed 2026-07-26).
});
