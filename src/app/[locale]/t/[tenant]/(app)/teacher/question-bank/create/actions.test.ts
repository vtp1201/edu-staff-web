import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestionEntity } from "@/features/question-bank/domain/entities/question.entity";
import type { SaveQuestionInput } from "@/features/question-bank/presentation/question-bank-builder-screen/question-bank-builder-screen.i-vm";

const requireRole = vi.fn();
const createExec = vi.fn();
const updateExec = vi.fn();
const publishExec = vi.fn();
const getExec = vi.fn();

vi.mock("@/bootstrap/auth-guard", () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}));
vi.mock("@/bootstrap/di/question-bank.di", () => ({
  makeCreateQuestionUseCase: async () => ({ execute: createExec }),
  makeUpdateQuestionUseCase: async () => ({ execute: updateExec }),
  makePublishQuestionUseCase: async () => ({ execute: publishExec }),
  makeGetQuestionUseCase: async () => ({ execute: getExec }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { publishAction, refetchAction, saveQuestionAction } from "./actions";

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

const createInput: SaveQuestionInput = {
  questionType: "ESSAY",
  subjectId: "sub-math",
  gradeLevel: "12",
  difficulty: "HARD",
  body: "Nội dung",
  expectedAnswer: "",
  tags: ["a"],
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue({ ok: true, role: "teacher" });
});

describe("question-bank builder actions — guard + FR-009 immutable-field drop", () => {
  it("rejects a non-teacher on save BEFORE any DI call", async () => {
    requireRole.mockResolvedValue({ ok: false, reason: "forbidden" });
    const res = await saveQuestionAction(createInput);
    expect(res).toEqual({ ok: false, errorKey: "forbidden-edit" });
    expect(createExec).not.toHaveBeenCalled();
    expect(updateExec).not.toHaveBeenCalled();
  });

  it("create sends all 7 fields (no id)", async () => {
    createExec.mockResolvedValue({ ok: true, value: question });
    const res = await saveQuestionAction(createInput);
    expect(res).toEqual({ ok: true, question });
    expect(createExec).toHaveBeenCalledWith({
      questionType: "ESSAY",
      subjectId: "sub-math",
      gradeLevel: "12",
      difficulty: "HARD",
      body: "Nội dung",
      expectedAnswer: "",
      tags: ["a"],
    });
  });

  it("update sends ONLY body/expectedAnswer/tags — drops the 4 immutable fields (FR-009)", async () => {
    updateExec.mockResolvedValue({ ok: true, value: question });
    await saveQuestionAction({ ...createInput, id: "q-9", body: "v2" });
    expect(updateExec).toHaveBeenCalledWith("q-9", {
      body: "v2",
      expectedAnswer: "",
      tags: ["a"],
    });
    // The immutable fields must NOT reach the update DTO.
    const [, sentBody] = updateExec.mock.calls[0] as [string, object];
    expect(sentBody).not.toHaveProperty("questionType");
    expect(sentBody).not.toHaveProperty("subjectId");
    expect(sentBody).not.toHaveProperty("gradeLevel");
    expect(sentBody).not.toHaveProperty("difficulty");
  });

  it("publishAction maps the already-published race key through", async () => {
    publishExec.mockResolvedValue({
      ok: false,
      failure: { type: "already-published" },
    });
    expect(await publishAction("q-9")).toEqual({
      ok: false,
      errorKey: "already-published",
    });
  });

  it("refetchAction re-gets the question for race resync", async () => {
    getExec.mockResolvedValue({
      ok: true,
      value: { ...question, status: "PUBLISHED" },
    });
    const res = await refetchAction("q-9");
    expect(res.ok).toBe(true);
    expect(getExec).toHaveBeenCalledWith("q-9");
  });
});
