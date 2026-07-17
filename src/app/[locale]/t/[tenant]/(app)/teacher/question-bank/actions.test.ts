import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRole = vi.fn();
const listMineExec = vi.fn();
const searchExec = vi.fn();
const makeListMine = vi.fn(async () => ({ execute: listMineExec }));
const makeSearch = vi.fn(async () => ({ execute: searchExec }));

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/question-bank.di", () => ({
  makeListMyQuestionsUseCase: () => makeListMine(),
  makeSearchQuestionsUseCase: () => makeSearch(),
}));

import { listMineAction, searchAction } from "./actions";

const page = { items: [], hasMore: false };

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ ok: true, role: "teacher" });
});

describe("question-bank list actions — role guard (NFR-008/UC-907)", () => {
  it("listMineAction rejects a non-teacher with forbidden-browse BEFORE any DI/network call", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const res = await listMineAction();
    expect(res).toEqual({ ok: false, errorKey: "forbidden-browse" });
    expect(makeListMine).not.toHaveBeenCalled();
    expect(listMineExec).not.toHaveBeenCalled();
  });

  it("searchAction rejects a non-teacher with forbidden-browse BEFORE any DI/network call", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const res = await searchAction({ subjectId: "sub-math" });
    expect(res).toEqual({ ok: false, errorKey: "forbidden-browse" });
    expect(makeSearch).not.toHaveBeenCalled();
    expect(searchExec).not.toHaveBeenCalled();
  });

  it("listMineAction returns the page for a teacher", async () => {
    listMineExec.mockResolvedValue({ ok: true, value: page });
    const res = await listMineAction("c1");
    expect(res).toEqual({ ok: true, page });
    expect(listMineExec).toHaveBeenCalledWith({ cursor: "c1" });
  });

  it("searchAction forwards params + cursor for a teacher", async () => {
    searchExec.mockResolvedValue({ ok: true, value: page });
    const res = await searchAction({ subjectId: "sub-math", tag: "x" }, "c2");
    expect(res).toEqual({ ok: true, page });
    expect(searchExec).toHaveBeenCalledWith({
      subjectId: "sub-math",
      tag: "x",
      cursor: "c2",
    });
  });

  it("searchAction maps a domain failure key through", async () => {
    searchExec.mockResolvedValue({
      ok: false,
      failure: { type: "search-filter-required" },
    });
    expect(await searchAction({})).toEqual({
      ok: false,
      errorKey: "search-filter-required",
    });
  });
});
