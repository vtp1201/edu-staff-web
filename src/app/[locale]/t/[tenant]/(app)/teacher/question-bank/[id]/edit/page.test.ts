import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestionEntity } from "@/features/question-bank/domain/entities/question.entity";

/**
 * Edit-route visibility gate (state-architecture.md §3) + AC-907 role guard.
 * `redirect()` throws a `NEXT_REDIRECT;<type>;<url>;...` digest synchronously;
 * assert on the thrown target.
 */

const requireRole = vi.fn();
const getExec = vi.fn();

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/question-bank.di", () => ({
  makeGetQuestionUseCase: async () => ({ execute: getExec }),
  getSubjectOptions: async () => [{ id: "sub-math", name: "Toán" }],
}));

const question: QuestionEntity = {
  id: "q-9",
  tenantId: "tn-1",
  authorId: "t-me",
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "12",
  difficulty: "HARD",
  body: "Nội dung",
  expectedAnswer: null,
  status: "DRAFT",
  tags: [],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
};

function redirectTarget(err: unknown): string {
  const digest = (err as { digest?: string } | null)?.digest ?? "";
  return digest.split(";")[2] ?? "";
}

async function renderPage(id = "q-9") {
  const { default: Page } = await import("./page");
  try {
    const rendered = await Page({
      params: Promise.resolve({ locale: "vi", tenant: "t1", id }),
    });
    return { redirected: false, rendered, url: null as string | null };
  } catch (err) {
    return { redirected: true, rendered: null, url: redirectTarget(err) };
  }
}

const BASE = "/vi/t/t1/teacher/question-bank";

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ ok: true, role: "teacher" });
});

describe("EditQuestionPage — guard + visibility gate", () => {
  it("non-teacher redirects to the (guarded) list BEFORE any GET", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const result = await renderPage();
    expect(result.redirected).toBe(true);
    expect(result.url).toBe(BASE);
    expect(getExec).not.toHaveBeenCalled();
  });

  it("own DRAFT renders (no redirect)", async () => {
    getExec.mockResolvedValue({ ok: true, value: question });
    expect((await renderPage()).redirected).toBe(false);
  });

  it("cross-teacher PUBLISHED renders the locked view (no redirect)", async () => {
    getExec.mockResolvedValue({
      ok: true,
      value: { ...question, authorId: "t-other", status: "PUBLISHED" as const },
    });
    expect((await renderPage()).redirected).toBe(false);
  });

  it("not-found redirects with the not-found notice", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "not-found" } });
    const r = await renderPage();
    expect(r.url).toBe(`${BASE}?notice=not-found`);
  });

  it("not-visible redirects with the DISTINCT not-visible notice", async () => {
    getExec.mockResolvedValue({ ok: false, failure: { type: "not-visible" } });
    const r = await renderPage();
    expect(r.url).toBe(`${BASE}?notice=not-visible`);
  });

  it("forbidden-edit redirects with the forbidden-edit notice", async () => {
    getExec.mockResolvedValue({
      ok: false,
      failure: { type: "forbidden-edit" },
    });
    const r = await renderPage();
    expect(r.url).toBe(`${BASE}?notice=forbidden-edit`);
  });

  it("network-error stays on the route (loadFailed, no redirect)", async () => {
    getExec.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });
    expect((await renderPage()).redirected).toBe(false);
  });
});
