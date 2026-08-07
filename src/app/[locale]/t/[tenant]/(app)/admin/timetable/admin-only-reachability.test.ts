import { afterEach, describe, expect, it, vi } from "vitest";
import { decodeRoleClaim } from "@/bootstrap/lib/jwt";
import { evaluateAdminAccess } from "@/bootstrap/tenant";

/**
 * Reachability proof for US-E18.48's AC: the whole-school conflicts scan
 * (`GET /api/v1/timetable/conflicts`) is ADMIN/SUPER_ADMIN only — BE US-188
 * explicitly does NOT admit MANAGER — so the UI surface must be unreachable for
 * a MANAGER/principal, by the ROUTE GUARD, not merely by omitting a nav link.
 *
 * The guard is `role === "admin"` (strict equality) in
 * `(app)/admin/layout.tsx`, so this test composes the two halves an incoming
 * request actually goes through: the JWT role claim → appRole mapping, then the
 * namespace verdict. Asserting the verdict on a hand-written appRole alone would
 * skip the mapping, which is where the real answer lives.
 */

/** Minimal unsigned JWT with the given claims (the FE only decodes). */
function tokenWith(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return `${b64({ alg: "none" })}.${b64(claims)}.sig`;
}

const LOCALE = "vi";
const TENANT = "t-acme";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/admin/timetable is ADMIN-only (US-E18.48, BE US-188)", () => {
  // Mock mode grants "admin" to any token for local dev — pin real mode so the
  // production mapping is what is under test.
  const realMode = () => vi.stubEnv("NEXT_PUBLIC_USE_MOCK", "false");

  it("a MANAGER token is redirected away — it never renders the route", () => {
    realMode();
    const role = decodeRoleClaim(tokenWith({ role: "MANAGER" }));
    // MANAGER collapses onto the `principal` appRole (role-meta.ts).
    expect(role).toBe("principal");

    const verdict = evaluateAdminAccess(role, LOCALE, TENANT);
    expect(verdict.verdict).toBe("redirect-to-default");
    expect(verdict.redirectUrl).not.toContain("/admin");
  });

  it("a MANAGER token carried on `memberRoles` is redirected away too", () => {
    realMode();
    const role = decodeRoleClaim(tokenWith({ memberRoles: ["MANAGER"] }));
    expect(evaluateAdminAccess(role, LOCALE, TENANT).verdict).toBe(
      "redirect-to-default",
    );
  });

  it("every non-admin appRole is redirected away from the admin namespace", () => {
    for (const role of ["principal", "teacher", "student", "parent"] as const) {
      expect(evaluateAdminAccess(role, LOCALE, TENANT).verdict).toBe(
        "redirect-to-default",
      );
    }
  });

  it("an unauthenticated request is sent to select-tenant, never to the scan", () => {
    const verdict = evaluateAdminAccess(null, LOCALE, TENANT);
    expect(verdict.verdict).toBe("redirect-to-auth");
    expect(verdict.redirectUrl).toContain("/select-tenant");
  });

  it("only the `admin` appRole is allowed through", () => {
    expect(evaluateAdminAccess("admin", LOCALE, TENANT).verdict).toBe(
      "allowed",
    );
  });
});
