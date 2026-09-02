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

const getLessonExecute = vi.fn();

vi.mock("@/bootstrap/di/lms.di", () => ({
  makeGetLessonUseCase: vi.fn(async () => ({ execute: getLessonExecute })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { getLessonAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLessonAction", () => {
  it("rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    await expect(getLessonAction("c1", "l1")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(getLessonExecute).not.toHaveBeenCalled();
  });

  it("passes BOTH the route-bound courseId and the lessonId to the use-case", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    getLessonExecute.mockResolvedValue({
      ok: true,
      data: {
        id: "l1",
        courseId: "c1",
        title: "Bài 1",
        content: "Nội dung",
        position: 0,
        startAt: null,
        dueAt: null,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    });

    const result = await getLessonAction("c1", "l1");

    expect(getLessonExecute).toHaveBeenCalledWith("c1", "l1");
    expect(result).toEqual({
      ok: true,
      // Only the three fields the reader renders cross the boundary.
      data: { id: "l1", title: "Bài 1", content: "Nội dung" },
    });
  });

  it("returns the failure key verbatim so presentation can translate it", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    getLessonExecute.mockResolvedValue({
      ok: false,
      failure: { type: "not-found" },
    });

    await expect(getLessonAction("c1", "l1")).resolves.toEqual({
      ok: false,
      errorKey: "not-found",
    });
  });
});
