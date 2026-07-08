/**
 * Unit tests — student lesson-player Server Actions.
 * Story requirement: "RBAC: Chi student" — every action must reject a
 * non-student caller BEFORE touching the DI/use-case layer. Guards + DI
 * factories are mocked at the module boundary (same pattern as
 * admin/grades/approval/actions.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: vi.fn(),
}));

const markLessonCompleteExecute = vi.fn();
const getNoteExecute = vi.fn();
const saveNoteExecute = vi.fn();
const listQuestionsExecute = vi.fn();
const askQuestionExecute = vi.fn();

vi.mock("@/bootstrap/di/lms.di", () => ({
  makeMarkLessonCompleteUseCase: vi.fn(async () => ({
    execute: markLessonCompleteExecute,
  })),
  makeGetNoteUseCase: vi.fn(async () => ({ execute: getNoteExecute })),
  makeSaveNoteUseCase: vi.fn(async () => ({ execute: saveNoteExecute })),
  makeListQuestionsUseCase: vi.fn(async () => ({
    execute: listQuestionsExecute,
  })),
  makeAskQuestionUseCase: vi.fn(async () => ({ execute: askQuestionExecute })),
}));

import { requireRole } from "@/bootstrap/auth-guard";
import {
  askQuestionAction,
  getNoteAction,
  listQuestionsAction,
  markLessonCompleteAction,
  saveNoteAction,
} from "./actions";

const mockRequireRole = vi.mocked(requireRole);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("student lesson-player Server Actions — RBAC (AC: RBAC: Chi student)", () => {
  it("markLessonCompleteAction rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await markLessonCompleteAction("l1");

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(markLessonCompleteExecute).not.toHaveBeenCalled();
  });

  it("getNoteAction rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await getNoteAction("l1");

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(getNoteExecute).not.toHaveBeenCalled();
  });

  it("saveNoteAction rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await saveNoteAction("l1", "note content");

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(saveNoteExecute).not.toHaveBeenCalled();
  });

  it("listQuestionsAction rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await listQuestionsAction("l1");

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(listQuestionsExecute).not.toHaveBeenCalled();
  });

  it("askQuestionAction rejects a non-student caller without invoking the use-case", async () => {
    mockRequireRole.mockResolvedValue({
      ok: false,
      reason: "wrong-role",
    } as never);

    const result = await askQuestionAction("l1", "Câu hỏi?");

    expect(result).toEqual({ ok: false, errorKey: "forbidden" });
    expect(askQuestionExecute).not.toHaveBeenCalled();
  });

  it("markLessonCompleteAction proceeds to the use-case when the caller IS a student", async () => {
    mockRequireRole.mockResolvedValue({ ok: true, role: "student" } as never);
    markLessonCompleteExecute.mockResolvedValue({
      ok: true,
      data: {
        lesson: {
          id: "l1",
          chapterId: "ch1",
          type: "video",
          order: 1,
          title: "Bài 1",
          durationLabel: "32 phút",
          done: true,
        },
        courseProgress: { done: 1, total: 3, pct: 33, status: "in-progress" },
      },
    });

    const result = await markLessonCompleteAction("l1");

    expect(result.ok).toBe(true);
    expect(markLessonCompleteExecute).toHaveBeenCalledWith("l1");
  });
});
