/**
 * Server-Action authorization tests for the ADMIN/MANAGER grade view
 * (US-E18.44). A Server Action is a publicly callable endpoint: the absence of a
 * capability in the VM removes the UI affordance, it is NOT an authorization
 * boundary. These tests forge the caller's role at the guard seam and assert the
 * action refuses BEFORE constructing any DI/use-case (zero HTTP), which is the
 * property `requireRole` exists to provide (decision 0022/0024/0063).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({ requireRole: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const rejectExecute = vi.fn();
const approveExecute = vi.fn();
const pendingExecute = vi.fn();
const makeApproveColumnEntryUseCase = vi.fn(async (_key: unknown) => ({
  execute: approveExecute,
}));
const makeListPendingApprovalBatchesUseCase = vi.fn(async () => ({
  execute: pendingExecute,
}));
const lockExecute = vi.fn();
const makeRejectColumnEntryUseCase = vi.fn(async (_key: unknown) => ({
  execute: rejectExecute,
}));
const makeLockTermUseCase = vi.fn(async (_key: unknown) => ({
  execute: lockExecute,
}));

vi.mock("@/bootstrap/di/grades.di", () => ({
  makeRejectColumnEntryUseCase: (key: unknown) =>
    makeRejectColumnEntryUseCase(key as never),
  makeApproveColumnEntryUseCase: (key: unknown) =>
    makeApproveColumnEntryUseCase(key as never),
  makeListPendingApprovalBatchesUseCase: () =>
    makeListPendingApprovalBatchesUseCase(),
  makeLockTermUseCase: (key: unknown) => makeLockTermUseCase(key as never),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import {
  approveEntryAction,
  loadPendingApprovalPageAction,
  lockTermAction,
  rejectEntryAction,
} from "./actions";

const mockRequireRole = vi.mocked(requireRole);

const KEY: ClassSubjectTermKey = {
  classId: "class-001",
  subjectId: "subj-toan-10",
  termId: "HK1",
  academicYearLabel: "2025-2026",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rejectEntryAction", () => {
  it("requires exactly the ADMIN/MANAGER-mapped roles", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    rejectExecute.mockResolvedValue(undefined);
    await rejectEntryAction(KEY, "hs-001", "ck", "Sai điểm");
    expect(mockRequireRole).toHaveBeenCalledWith(["principal", "admin"]);
  });

  it.each([
    ["forbidden-role" as const],
    ["unauthenticated" as const],
  ])("refuses a %s caller without touching the use-case", async (reason) => {
    mockRequireRole.mockResolvedValue({ ok: false, reason });
    const res = await rejectEntryAction(KEY, "hs-001", "ck", "Sai điểm");
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(makeRejectColumnEntryUseCase).not.toHaveBeenCalled();
    expect(rejectExecute).not.toHaveBeenCalled();
  });

  it("passes the bound key + per-cell target through on success", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "principal" });
    rejectExecute.mockResolvedValue(undefined);
    const res = await rejectEntryAction(KEY, "hs-001", "ck", "  Sai điểm  ");
    expect(res).toEqual({ ok: true });
    expect(makeRejectColumnEntryUseCase).toHaveBeenCalledWith(KEY);
    expect(rejectExecute).toHaveBeenCalledWith(
      KEY,
      "hs-001",
      "ck",
      "  Sai điểm  ",
    );
  });

  it("returns the typed failure key, not translated copy", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    rejectExecute.mockResolvedValue({ type: "not-pending-approval" });
    const res = await rejectEntryAction(KEY, "hs-001", "ck", "Sai điểm");
    expect(res).toEqual({ ok: false, errorKey: "not-pending-approval" });
  });
});

describe("lockTermAction", () => {
  /**
   * The term lock is IRREVERSIBLE (ADR 0054 §4) and, before US-E18.44, this
   * action had no role guard of its own — it relied entirely on the route
   * layout, which a direct Server-Action invocation bypasses. It now fails
   * closed like every other role-gated mutation.
   */
  it("refuses a non-ADMIN/MANAGER caller without locking anything", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await lockTermAction(KEY);
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(makeLockTermUseCase).not.toHaveBeenCalled();
    expect(lockExecute).not.toHaveBeenCalled();
  });

  it("locks and reports the count for an authorized caller", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    lockExecute.mockResolvedValue({ lockedCount: 12 });
    const res = await lockTermAction(KEY);
    expect(res).toEqual({ ok: true, lockedCount: 12 });
    expect(mockRequireRole).toHaveBeenCalledWith(["principal", "admin"]);
  });

  it("maps a typed failure to its stable key", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    lockExecute.mockResolvedValue({ type: "locked" });
    const res = await lockTermAction(KEY);
    expect(res).toEqual({ ok: false, errorKey: "locked" });
  });
});

describe("approveEntryAction", () => {
  it("requires exactly the ADMIN/MANAGER-mapped roles", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    approveExecute.mockResolvedValue(undefined);
    await approveEntryAction(KEY, "hs-001", "ck");
    expect(mockRequireRole).toHaveBeenCalledWith(["principal", "admin"]);
  });

  it.each([
    ["forbidden-role" as const],
    ["unauthenticated" as const],
  ])("refuses a %s caller without publishing anything", async (reason) => {
    mockRequireRole.mockResolvedValue({ ok: false, reason });
    const res = await approveEntryAction(KEY, "hs-001", "ck");
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(makeApproveColumnEntryUseCase).not.toHaveBeenCalled();
    expect(approveExecute).not.toHaveBeenCalled();
  });

  it("passes ONLY the bound key + per-cell target (approve has no reason)", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "principal" });
    approveExecute.mockResolvedValue({
      studentId: "hs-001",
      columnId: "ck",
      cell: { value: 9, status: "PUBLISHED" },
    });
    const res = await approveEntryAction(KEY, "hs-001", "ck");
    expect(res).toEqual({ ok: true });
    expect(makeApproveColumnEntryUseCase).toHaveBeenCalledWith(KEY);
    expect(approveExecute).toHaveBeenCalledWith(KEY, "hs-001", "ck");
    expect(approveExecute.mock.calls[0]).toHaveLength(3);
  });

  it("returns the typed failure key, not translated copy", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    approveExecute.mockResolvedValue({ type: "not-pending-approval" });
    expect(await approveEntryAction(KEY, "hs-001", "ck")).toEqual({
      ok: false,
      errorKey: "not-pending-approval",
    });
  });
});

describe("loadPendingApprovalPageAction", () => {
  const PAGE = { items: [], nextCursor: null, hasMore: false };

  /**
   * A READ, but still role-gated: the rollup discloses tenant-wide which
   * classes have outstanding grade work — the same oversight scope BE limits to
   * ADMIN/MANAGER.
   */
  it("refuses a non-ADMIN/MANAGER caller without reading anything", async () => {
    mockRequireRole.mockResolvedValue({ ok: false, reason: "forbidden-role" });
    const res = await loadPendingApprovalPageAction(null);
    expect(res).toEqual({ ok: false, errorKey: "forbidden" });
    expect(makeListPendingApprovalBatchesUseCase).not.toHaveBeenCalled();
    expect(pendingExecute).not.toHaveBeenCalled();
  });

  it("reads the first page for a null cursor", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    pendingExecute.mockResolvedValue(PAGE);
    expect(await loadPendingApprovalPageAction(null)).toEqual({
      ok: true,
      page: PAGE,
    });
    expect(pendingExecute).toHaveBeenCalledWith({ cursor: undefined });
  });

  it("threads a cursor through for a follow-up page", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "principal" });
    pendingExecute.mockResolvedValue(PAGE);
    await loadPendingApprovalPageAction("cur-2");
    expect(pendingExecute).toHaveBeenCalledWith({ cursor: "cur-2" });
  });

  it("maps an undecodable cursor to its stable failure key", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    pendingExecute.mockResolvedValue({ type: "invalid-cursor" });
    expect(await loadPendingApprovalPageAction("bad")).toEqual({
      ok: false,
      errorKey: "invalid-cursor",
    });
  });

  /** A read must not invalidate any route cache. */
  it("does not revalidate any path", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "admin" });
    pendingExecute.mockResolvedValue(PAGE);
    const { revalidatePath } = await import("next/cache");
    vi.mocked(revalidatePath).mockClear();
    await loadPendingApprovalPageAction(null);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
