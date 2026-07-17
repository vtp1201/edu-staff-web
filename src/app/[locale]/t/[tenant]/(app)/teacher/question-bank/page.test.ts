import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * AC-907 route guard: the list page's `requireRole(["teacher"])` MUST precede
 * any DI/network call. A non-teacher gets a forbidden VM and the use-case
 * factory is never invoked.
 */

const requireRole = vi.fn();
const listMineExec = vi.fn();
const makeListMine = vi.fn(async () => ({ execute: listMineExec }));
const getSubjectOptions = vi.fn(async () => [{ id: "sub-math", name: "Toán" }]);

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/question-bank.di", () => ({
  makeListMyQuestionsUseCase: () => makeListMine(),
  getSubjectOptions: () => getSubjectOptions(),
}));

async function renderPage() {
  const { default: Page } = await import("./page");
  return Page({
    params: Promise.resolve({ locale: "vi", tenant: "t1" }),
    searchParams: Promise.resolve({}),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("TeacherQuestionBankPage — route guard", () => {
  it("rejects a non-teacher with a forbidden VM and NEVER calls the use-case factory", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const el = (await renderPage()) as {
      props: { vm: { forbidden?: boolean } };
    };
    expect(el.props.vm.forbidden).toBe(true);
    expect(makeListMine).not.toHaveBeenCalled();
    expect(listMineExec).not.toHaveBeenCalled();
    expect(getSubjectOptions).not.toHaveBeenCalled();
  });

  it("seeds the first mine page for a teacher (guard passes → DI runs)", async () => {
    requireRole.mockResolvedValue({ ok: true, role: "teacher" });
    listMineExec.mockResolvedValue({
      ok: true,
      value: { items: [], hasMore: false },
    });
    const el = (await renderPage()) as {
      props: { vm: { forbidden?: boolean; initialMinePage: unknown } };
    };
    expect(el.props.vm.forbidden).toBeUndefined();
    expect(makeListMine).toHaveBeenCalledTimes(1);
    expect(el.props.vm.initialMinePage).toEqual({ items: [], hasMore: false });
  });
});
