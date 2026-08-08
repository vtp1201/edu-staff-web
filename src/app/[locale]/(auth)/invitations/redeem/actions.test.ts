/**
 * Unit tests — `finalizeRedeemAction` (US-E18.59, ADR 0072).
 *
 * The redeem POST itself now happens IN THE BROWSER so Kong sees the visitor's
 * real IP (the whole point of the story). What is left server-side is this
 * narrow action: write the httpOnly session cookies for the session the BE
 * already issued, then redirect. Its two load-bearing properties are therefore:
 *
 *  - it makes NO IAM call — a re-added one would silently restore the
 *    one-shared-IP defect this story exists to remove;
 *  - cookies are written through the SHARED `setAuthCookies` helper, before the
 *    redirect, and the landing route is built only through `tenantUrl` (no
 *    caller-supplied "next"/"returnTo" exists to validate).
 */
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  setAuthCookies: vi.fn(async () => {}),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw { digest: `NEXT_REDIRECT;${url}` };
  }),
}));

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn(async () => "vi"),
}));

import { redirect } from "next/navigation";
import { setAuthCookies } from "@/bootstrap/lib/auth-token.server";
import type { Member } from "@/features/auth/domain/entities/member.entity";
import { finalizeRedeemAction } from "./actions";

const mockRedirect = vi.mocked(redirect);
const mockSetAuthCookies = vi.mocked(setAuthCookies);

function redirectUrl(err: unknown): string {
  return ((err as { digest?: string })?.digest ?? "").split(";")[1] ?? "";
}

const TOKENS = { accessToken: "a", refreshToken: "r", sessionId: "s" };

function actionsSource(): string {
  return readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
}

/**
 * Every module specifier the file pulls in, whatever the syntax: static
 * `from "x"` (value or type), bare side-effect `import "x"`, dynamic
 * `import("x")` and `require("x")`. Sorted + de-duplicated so the assertion is
 * order-independent.
 */
function importSpecifiersOf(source: string): string[] {
  const patterns = [
    /\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']/g,
  ];
  const found = new Set<string>();
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found].sort();
}

function member(roles: string[], tenantId = "t-9"): Member {
  return { tenantId, userId: "u-9", roles, status: "ACTIVE" };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("finalizeRedeemAction — makes NO IAM call", () => {
  it("issues zero network requests of any kind (neither fetch nor an axios client)", async () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      await finalizeRedeemAction(member(["TEACHER"]), TOKENS).catch(() => {});
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("imports no DI factory, repository or http client — the redeem call must originate in the browser", () => {
    const source = actionsSource();
    expect(source).not.toMatch(/bootstrap\/di/);
    expect(source).not.toMatch(/infrastructure\/repositories/);
    expect(source).not.toMatch(/bootstrap\/lib\/http/);
    expect(source).not.toMatch(/UseCase/);
  });

  /**
   * The denylist above is necessary but NOT sufficient: it only catches the
   * import shapes we thought of. A tech-lead mutation probe proved the hole —
   * adding `import axios from "axios"` + `axios.post(...)` left the file 10/10
   * green (axios does not go through `globalThis.fetch` in node, so the runtime
   * spy misses it too). So the module's import surface is an EXACT ALLOWLIST:
   * any new import — HTTP client, DI factory, or something innocuous — fails
   * here until someone deliberately adds it to this list, which is the moment
   * to re-ask "does this action still make zero IAM calls?".
   */
  it("imports EXACTLY the allowlisted specifiers — any addition is a deliberate edit here", () => {
    const specifiers = importSpecifiersOf(actionsSource());
    expect(specifiers).toEqual([
      "@/bootstrap/lib/auth-token.server",
      "@/bootstrap/lib/jwt",
      "@/bootstrap/tenant",
      "@/features/auth/domain/entities/auth-user.entity",
      "@/features/auth/domain/entities/member.entity",
      "@/features/auth/domain/entities/role-meta",
      "next-intl/server",
      "next/navigation",
    ]);
  });
});

describe("finalizeRedeemAction — session + landing", () => {
  it("persists the BE-issued tokens and lands in the tenant workspace", async () => {
    const err = await finalizeRedeemAction(member(["TEACHER"]), TOKENS).catch(
      (e) => e,
    );

    expect(mockSetAuthCookies).toHaveBeenCalledWith(TOKENS);
    expect(redirectUrl(err)).toBe("/vi/t/t-9/teacher");
  });

  it("cookies are set BEFORE the redirect — landing in a guarded route without a session would bounce to /select-tenant", async () => {
    const order: string[] = [];
    mockSetAuthCookies.mockImplementation(async () => {
      order.push("cookies");
    });
    mockRedirect.mockImplementation(((url: string) => {
      order.push("redirect");
      throw { digest: `NEXT_REDIRECT;${url}` };
      // biome-ignore lint/suspicious/noExplicitAny: mocked redirect returns never
    }) as any);

    await finalizeRedeemAction(member(["TEACHER"]), TOKENS).catch(() => {});
    expect(order).toEqual(["cookies", "redirect"]);
  });

  it("normalises the BE role ENUM to the appRole route segment (ADMIN/MANAGER → principal, STAFF → teacher)", async () => {
    for (const [wire, segment] of [
      ["ADMIN", "principal"],
      ["MANAGER", "principal"],
      ["STAFF", "teacher"],
      ["STUDENT", "student"],
      ["PARENT", "parent"],
    ] as const) {
      vi.clearAllMocks();
      const err = await finalizeRedeemAction(member([wire]), TOKENS).catch(
        (e) => e,
      );
      expect(redirectUrl(err)).toBe(`/vi/t/t-9/${segment}`);
    }
  });

  it("an unknown future role enum degrades to its lowercase form rather than crashing the landing", async () => {
    const err = await finalizeRedeemAction(member(["LIBRARIAN"]), TOKENS).catch(
      (e) => e,
    );
    expect(redirectUrl(err)).toBe("/vi/t/t-9/librarian");
  });

  it("an empty roles[] falls back to the tenant root path", async () => {
    const err = await finalizeRedeemAction(member([]), TOKENS).catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-9");
  });
});

describe("finalizeRedeemAction — the payload now crosses the client boundary", () => {
  it("prefers the ACCESS TOKEN's tenant claim over the submitted member when they disagree", async () => {
    // Both halves arrive from the browser since ADR 0072, so an incoherent pair
    // must resolve to the tenant the session can actually authorize — never to
    // a workspace named by the (mismatched) member payload.
    const claim = btoa(JSON.stringify({ tenantId: "t-from-token" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const err = await finalizeRedeemAction(member(["TEACHER"], "t-claimed"), {
      ...TOKENS,
      accessToken: `h.${claim}.sig`,
    }).catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-from-token/teacher");
  });

  it("falls back to the member's tenant when the token carries no readable claim", async () => {
    const err = await finalizeRedeemAction(member(["TEACHER"], "t-9"), {
      ...TOKENS,
      accessToken: "opaque",
    }).catch((e) => e);
    expect(redirectUrl(err)).toBe("/vi/t/t-9/teacher");
  });

  it("the landing path is always a locale + tenant route, never a caller-supplied URL", async () => {
    const err = await finalizeRedeemAction(
      member(["TEACHER"], "https://evil.example.com"),
      TOKENS,
    ).catch((e) => e);
    expect(redirectUrl(err).startsWith("/vi/t/")).toBe(true);
    expect(redirectUrl(err)).not.toMatch(/^https?:/);
  });
});
