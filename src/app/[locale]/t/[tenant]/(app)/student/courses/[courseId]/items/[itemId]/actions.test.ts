/**
 * `submitAssignmentAction` — the one-way mutation of US-E24.5 (high-risk lane).
 *
 * What these tests pin down, beyond happy path:
 * - RBAC: a non-student is refused BEFORE the DI layer is touched.
 * - The action is a pure pass-through for `content`: it never trims, truncates
 *   or re-validates length. The 20 000-char cap in the UI is UX; BE's
 *   `invalid-content` is the boundary, and silently mutating over-long input
 *   would hide it.
 * - The 409 race returns the REAL submission (re-read server-side), so the UI
 *   can never print a fabricated "Đã nộp lúc …" from local state.
 * - Both routes that display the submitted state are revalidated.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({ requireRole: vi.fn() }));

const submitExecute = vi.fn();
const detailExecute = vi.fn();
const revalidatePath = vi.fn();

vi.mock("@/bootstrap/di/lms.di", () => ({
  makeSubmitAssignmentUseCase: vi.fn(async () => ({ execute: submitExecute })),
  makeGetAssignmentDetailUseCase: vi.fn(async () => ({
    execute: detailExecute,
  })),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import { submitAssignmentAction } from "./actions";

const mockRequireRole = vi.mocked(requireRole);

const SUBMISSION = {
  assignmentId: "as-1",
  studentUserId: "u1",
  content: "Bài làm của em",
  status: "SUBMITTED" as const,
  submittedAt: "2026-09-02T09:05:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
});

describe("submitAssignmentAction", () => {
  it("refuses a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    await expect(submitAssignmentAction("as-1", "Bài làm")).resolves.toEqual({
      ok: false,
      errorKey: "forbidden",
    });
    expect(submitExecute).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("submits and returns ONLY the two fields the banner renders", async () => {
    submitExecute.mockResolvedValue({ ok: true, data: SUBMISSION });

    const result = await submitAssignmentAction("as-1", "Bài làm của em");

    expect(submitExecute).toHaveBeenCalledWith("as-1", "Bài làm của em");
    expect(result).toEqual({
      ok: true,
      submission: {
        content: "Bài làm của em",
        submittedAt: "2026-09-02T09:05:00Z",
      },
    });
  });

  it("revalidates BOTH the item route and the course timeline that shows its state", async () => {
    submitExecute.mockResolvedValue({ ok: true, data: SUBMISSION });

    await submitAssignmentAction("as-1", "Bài làm");

    expect(revalidatePath.mock.calls).toEqual([
      [
        "/[locale]/t/[tenant]/(app)/student/courses/[courseId]/items/[itemId]",
        "page",
      ],
      ["/[locale]/t/[tenant]/(app)/student/courses/[courseId]", "page"],
    ]);
  });

  it("passes over-long content through VERBATIM — the cap is not enforced here", async () => {
    const tooLong = "x".repeat(20_050);
    submitExecute.mockResolvedValue({
      ok: false,
      failure: { type: "invalid-content" },
    });

    const result = await submitAssignmentAction("as-1", tooLong);

    expect(submitExecute).toHaveBeenCalledWith("as-1", tooLong);
    expect(result).toEqual({ ok: false, errorKey: "invalid-content" });
  });

  it("on a 409 race re-reads the REAL submission and hands it back", async () => {
    submitExecute.mockResolvedValue({
      ok: false,
      failure: { type: "already-submitted" },
    });
    detailExecute.mockResolvedValue({
      ok: true,
      data: {
        assignment: { id: "as-1" },
        mySubmission: {
          ...SUBMISSION,
          content: "Bài làm nộp từ tab khác",
          submittedAt: "2026-09-02T08:00:00Z",
        },
      },
    });

    const result = await submitAssignmentAction("as-1", "Bài làm ở tab này");

    expect(detailExecute).toHaveBeenCalledWith("as-1");
    expect(result).toEqual({
      ok: false,
      errorKey: "already-submitted",
      submission: {
        // The SERVER's copy, never the text still in this tab's textarea.
        content: "Bài làm nộp từ tab khác",
        submittedAt: "2026-09-02T08:00:00Z",
      },
    });
  });

  it("still reports the 409 when the re-read itself fails (no invented banner)", async () => {
    submitExecute.mockResolvedValue({
      ok: false,
      failure: { type: "already-submitted" },
    });
    detailExecute.mockResolvedValue({
      ok: false,
      failure: { type: "network-error" },
    });

    await expect(submitAssignmentAction("as-1", "Bài làm")).resolves.toEqual({
      ok: false,
      errorKey: "already-submitted",
      submission: null,
    });
  });

  it.each([
    "closed",
    "not-found",
    "network-error",
  ] as const)("returns the %s failure key verbatim for presentation to translate", async (type) => {
    submitExecute.mockResolvedValue({ ok: false, failure: { type } });

    await expect(submitAssignmentAction("as-1", "Bài làm")).resolves.toEqual({
      ok: false,
      errorKey: type,
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
