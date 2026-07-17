import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AC-907 route guard: the create route's `requireRole(["teacher"])` MUST
 * precede any DI/network call (getSubjectOptions). A non-teacher redirects
 * BEFORE any subject-catalogue lookup fires — no partial render.
 */

const requireRole = vi.fn();
const getSubjectOptions = vi.fn(async () => [{ id: "sub-math", name: "Toán" }]);

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/question-bank.di", () => ({
  getSubjectOptions: () => getSubjectOptions(),
}));

function redirectTarget(err: unknown): string {
  const digest = (err as { digest?: string } | null)?.digest ?? "";
  return digest.split(";")[2] ?? "";
}

async function renderPage() {
  const { default: Page } = await import("./page");
  try {
    const rendered = await Page({
      params: Promise.resolve({ locale: "vi", tenant: "t1" }),
    });
    return { redirected: false, rendered, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

const BASE = "/vi/t/t1/teacher/question-bank";

beforeEach(() => vi.clearAllMocks());

describe("CreateQuestionPage — route guard (AC-907.1/.2/.4)", () => {
  it("rejects a non-teacher (student) BEFORE any DI/network call — redirects to the list", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe(BASE);
    expect(getSubjectOptions).not.toHaveBeenCalled();
  });

  it("rejects a non-teacher (parent) BEFORE any DI/network call — same treatment", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe(BASE);
    expect(getSubjectOptions).not.toHaveBeenCalled();
  });

  it("a teacher renders normally (guard passes → subject DI runs)", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "teacher" });
    const result = await renderPage();
    expect(result.redirected).toBe(false);
    expect(getSubjectOptions).toHaveBeenCalledTimes(1);
  });
});
