import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Route-level proof for the US-E18.31 review fixes:
 *
 * 1. `writesEnabled` is wired to `USE_MOCK` — in real mode the screen must NOT
 *    offer composer / reaction / comment / pin / report affordances, because
 *    `HybridFeedRepository` degrades every mutation to `forbidden`. A wrong
 *    value here re-introduces the fake-publish (optimistic success toast, then
 *    the write vanishes on the next refetch).
 * 2. The VIEWER's role resolves through the SAME `feedRoleOfAppRole` narrowing
 *    the author badge uses (no second inline switch), with the two documented
 *    viewer-only widenings: `admin` → principal, unresolved → student.
 *
 * `USE_MOCK` is a module-eval-time const → mock the module + `vi.resetModules()`
 * per test (recipe from the sibling exam-bank `page.test.ts`).
 */

const listExec = vi.fn();
const requireRole = vi.fn();

function mockDeps(useMock: boolean) {
  vi.doMock("@/bootstrap/lib/mock", () => ({ USE_MOCK: useMock }));
  vi.doMock("@/bootstrap/di/feed.di", () => ({
    makeListFeedUseCase: async () => ({ execute: listExec }),
  }));
  vi.doMock("@/bootstrap/auth-guard/require-role.server", () => ({
    requireRole,
  }));
  vi.doMock("./actions", () => ({
    fetchFeedPageAction: vi.fn(),
    createPostAction: vi.fn(),
    reactToPostAction: vi.fn(),
    listCommentsAction: vi.fn(),
    addCommentAction: vi.fn(),
    togglePinAction: vi.fn(),
    reportContentAction: vi.fn(),
    removeContentAction: vi.fn(),
  }));
}

async function renderPage(useMock: boolean) {
  vi.resetModules();
  mockDeps(useMock);
  const { default: FeedPage } = await import("./page");
  return (await FeedPage()) as { props: Record<string, unknown> };
}

describe("FeedPage — write gating + viewer role (US-E18.31 fix)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listExec.mockResolvedValue({
      ok: true,
      value: { posts: [], nextCursor: null, hasMore: false },
    });
    requireRole.mockResolvedValue({ ok: true, role: "teacher" });
  });

  it("real mode passes writesEnabled=false (no dead write affordances)", async () => {
    const el = await renderPage(false);
    expect(el.props.writesEnabled).toBe(false);
  });

  it("mock mode passes writesEnabled=true (full demo experience)", async () => {
    const el = await renderPage(true);
    expect(el.props.writesEnabled).toBe(true);
  });

  it("resolves the viewer role through the shared appRole → FeedRole narrowing", async () => {
    for (const [appRole, expected] of [
      ["teacher", "teacher"],
      ["principal", "principal"],
      ["student", "student"],
      ["parent", "parent"],
      // `admin` has no feed BADGE but moderates like a principal — and it is
      // what decodeRoleClaim returns under NEXT_PUBLIC_USE_MOCK.
      ["admin", "principal"],
    ] as const) {
      requireRole.mockResolvedValue({ ok: true, role: appRole });
      const el = await renderPage(true);
      expect(el.props.role, `${appRole} → ${expected}`).toBe(expected);
    }
  });

  it("falls back to the least-privileged viewer when the guard rejects", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "unauthenticated" });
    const el = await renderPage(true);
    expect(el.props.role).toBe("student");
  });
});
