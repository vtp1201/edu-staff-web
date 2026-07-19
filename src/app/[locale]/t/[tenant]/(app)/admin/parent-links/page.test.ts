import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParentStudentLinkFailure } from "@/features/admin/parent-links/domain/failures/parent-student-link.failure";
import type { Result } from "@/features/admin/parent-links/domain/use-cases/result";
import type { ParentLinksPage } from "@/features/admin/parent-links/presentation/parent-links-screen/parent-links-screen.i-vm";

/**
 * AC-001.6 (DEF-1): a `forbidden` result on the INITIAL server-side list fetch
 * must `redirect()` the actor to their own workspace — NOT seed an in-page
 * error. `redirect()` throws a `NEXT_REDIRECT;<type>;<url>;...` digest
 * synchronously; assert on the thrown target. A non-forbidden failure (network)
 * must NOT redirect — it seeds `initialErrorKey` for the in-page error+retry.
 */

const listExec = vi.fn();
const getAccessToken = vi.fn();
const decodeRoleClaim = vi.fn();

vi.mock("@/bootstrap/di/parent-student-link.di", () => ({
  makeListParentStudentLinksUseCase: async () => ({ execute: listExec }),
}));
vi.mock("@/bootstrap/lib/auth-token.server", () => ({
  getAccessToken: () => getAccessToken(),
}));
vi.mock("@/bootstrap/lib/jwt", () => ({
  decodeRoleClaim: (...args: unknown[]) => decodeRoleClaim(...args),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));

const ok = (
  value: ParentLinksPage,
): Result<ParentLinksPage, ParentStudentLinkFailure> => ({ ok: true, value });
const fail = (
  type: ParentStudentLinkFailure["type"],
): Result<ParentLinksPage, ParentStudentLinkFailure> =>
  ({ ok: false, failure: { type } }) as Result<
    ParentLinksPage,
    ParentStudentLinkFailure
  >;

const EMPTY: ParentLinksPage = { items: [], nextCursor: null, hasMore: false };

function redirectTarget(err: unknown): string {
  const digest = (err as { digest?: string } | null)?.digest ?? "";
  return digest.split(";")[2] ?? "";
}

async function renderPage() {
  const { default: Page } = await import("./page");
  try {
    const rendered = await Page({
      params: Promise.resolve({ locale: "vi", tenant: "t1" }),
      searchParams: Promise.resolve({}),
    });
    return { redirected: false, rendered, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  getAccessToken.mockResolvedValue("token");
});

describe("AdminParentLinksPage — initial-load forbidden redirect (AC-001.6)", () => {
  it("redirects a non-admin actor to their own workspace on a forbidden initial fetch", async () => {
    listExec.mockResolvedValue(fail("forbidden"));
    decodeRoleClaim.mockReturnValue("teacher");
    const r = await renderPage();
    expect(r.redirected).toBe(true);
    expect(r.url).toContain("/teacher");
    expect(r.url).toContain("t1");
  });

  it("redirects to select-tenant when the token yields no role", async () => {
    listExec.mockResolvedValue(fail("forbidden"));
    decodeRoleClaim.mockReturnValue(null);
    const r = await renderPage();
    expect(r.redirected).toBe(true);
    expect(r.url).toContain("/select-tenant");
  });

  it("does NOT redirect on a network-error — seeds the in-page error state", async () => {
    listExec.mockResolvedValue(fail("network-error"));
    const r = await renderPage();
    expect(r.redirected).toBe(false);
    expect(decodeRoleClaim).not.toHaveBeenCalled();
  });

  it("does NOT redirect on a successful fetch", async () => {
    listExec.mockResolvedValue(ok(EMPTY));
    const r = await renderPage();
    expect(r.redirected).toBe(false);
  });
});
