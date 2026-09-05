/**
 * Unit tests — student course-timeline Server Actions (US-E24.1).
 * Story requirement: "RBAC: chỉ student" — the action must reject a non-student
 * caller BEFORE touching the DI/use-case layer. Guards + DI factories are
 * mocked at the module boundary.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

const listItemsExecute = vi.fn();

vi.mock("@/bootstrap/di/lms.di", () => ({
  makeListCourseItemsUseCase: vi.fn(async () => ({
    execute: listItemsExecute,
  })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { retryListItemsAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

const ITEM = {
  id: "i1",
  courseId: "c1",
  itemType: "LESSON" as const,
  refId: "i1",
  title: "Bài 1",
  description: null,
  url: null,
  position: 0,
  startAt: "2026-04-20T07:00:00Z",
  dueAt: null,
  state: "OPEN" as const,
  createdBy: "t1",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  exam: null,
};

describe("retryListItemsAction (US-E24.3)", () => {
  it("rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    await expect(retryListItemsAction("c1")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(listItemsExecute).not.toHaveBeenCalled();
  });

  it("hands back the SAME week-grouped VM shape the page derived", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    listItemsExecute.mockResolvedValue({
      ok: true,
      data: [ITEM, { ...ITEM, id: "i2", state: "CLOSED" }],
    });

    const result = await retryListItemsAction("c1");

    expect(listItemsExecute).toHaveBeenCalledWith("c1");
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.weeks.map((w) => w.key)).toEqual(["2026-W17"]);
    expect(result.data.weeks[0]?.items.map((i) => i.id)).toEqual(["i1", "i2"]);
    // Only the OPEN item counts — the state is BE-computed, never re-derived.
    expect(result.data.openCount).toBe(1);
  });

  it("returns the failure key verbatim so presentation can translate it", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    listItemsExecute.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });

    await expect(retryListItemsAction("c1")).resolves.toEqual({
      ok: false,
      errorKey: "network-error",
    });
  });
});
