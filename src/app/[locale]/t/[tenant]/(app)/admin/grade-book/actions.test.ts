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
  makeLockTermUseCase: (key: unknown) => makeLockTermUseCase(key as never),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import type { ClassSubjectTermKey } from "@/features/grades/domain/entities/class-subject-term-key.entity";
import { lockTermAction, rejectEntryAction } from "./actions";

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
