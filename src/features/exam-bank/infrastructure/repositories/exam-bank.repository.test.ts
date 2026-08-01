import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { EXAM_BANK_EP } from "@/bootstrap/endpoint/exam-bank.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  type Pagination,
  unwrapResponse,
} from "@/bootstrap/lib/api-envelope";
import type { UpdateExamInput } from "../../domain/entities/exam-bank-input.entity";
import type { ExamBankQuestion } from "../../domain/entities/exam-bank-question.entity";
import type { ExamBankSummaryDto } from "../dtos/exam-bank-list-response.dto";
import { ExamBankRepository } from "./exam-bank.repository";
import { MockExamBankRepository } from "./mocks/exam-bank.mock.repository";

// ── Mock repo (USE_MOCK path — full authoring against the in-memory store) ───
describe("MockExamBankRepository", () => {
  it("listExamBank with status='draft' returns only draft items", async () => {
    const repo = new MockExamBankRepository();
    const items = await repo.listExamBank({ status: "draft" });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((e) => e.status === "draft")).toBe(true);
  });

  it("deleteExam on a published exam rejects with cannot-delete-published", async () => {
    const repo = new MockExamBankRepository();
    await expect(repo.deleteExam("e-4")).rejects.toThrow(
      "cannot-delete-published",
    );
  });

  it("publishExam flips status to published", async () => {
    const repo = new MockExamBankRepository();
    const summary = await repo.publishExam("e-2");
    expect(summary.status).toBe("published");
    const detail = await repo.getExamDetail("e-2");
    expect(detail.status).toBe("published");
  });

  it("createExam creates a new exam with the correct fields", async () => {
    const repo = new MockExamBankRepository();
    const created = await repo.createExam({
      title: "Đề thi mới",
      subjectId: "s-math",
      durationMinutes: 30,
      maxAttempts: 2,
      questions: [],
    });
    expect(created.id).toBeTruthy();
    expect(created.title).toBe("Đề thi mới");
    expect(created.subjectId).toBe("s-math");
    expect(created.status).toBe("draft");
    const detail = await repo.getExamDetail(created.id);
    expect(detail.title).toBe("Đề thi mới");
  });
});

// ── Real repo (Option A — /lms/exam-papers, US-E18.15/ADR 0056) ──────────────

// Loose method typing — the concrete `vi.fn(async …)` return types don't unify
// with axios's generic method signatures; casting the whole instance is the
// established test idiom (see subject-catalogue.repository.test.ts).
function makeHttp(
  over: {
    get?: unknown;
    post?: unknown;
    put?: unknown;
    patch?: unknown;
    delete?: unknown;
  } = {},
): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function envelope<T>(data: T, pagination?: Pagination): ApiEnvelope<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: pagination ?? { nextCursor: null, hasMore: false },
    },
  };
}

function paperDto(over: Partial<ExamBankSummaryDto> = {}): ExamBankSummaryDto {
  return {
    examPaperId: "ep-1",
    authorId: "author-1",
    subjectId: "subj-1",
    gradeLevel: "10",
    title: "Đề Toán",
    totalMarks: 6,
    durationMinutes: 45,
    status: "DRAFT",
    questions: [
      {
        questionId: "eq-1",
        position: 1,
        questionType: "MCQ",
        body: "1+1?",
        answerKey: "B",
        marks: 2,
      },
    ],
    createdAt: "2026-07-01T08:00:00Z",
    updatedAt: "2026-07-01T09:00:00Z",
    ...over,
  };
}

describe("ExamBankRepository (real /lms/exam-papers)", () => {
  it("listExamBank fan-outs subject names, maps camelCase + status", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === EXAM_BANK_EP.list) {
        return envelope({
          items: [paperDto({ examPaperId: "ep-1", subjectId: "subj-1" })],
        });
      }
      return envelope([{ subjectId: "subj-1", name: "Toán" }]);
    });
    const repo = new ExamBankRepository(makeHttp({ get }));
    const items = await repo.listExamBank({});
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("ep-1");
    expect(items[0].subjectName).toBe("Toán");
    expect(items[0].status).toBe("draft");
    expect(items[0].totalQuestions).toBe(1);
    expect(items[0].teacherName).toBe("author-1");
  });

  it("listExamBank passes the status filter as the UPPER wire value", async () => {
    const get = vi.fn(async (url: string, _config?: unknown) => {
      if (url === EXAM_BANK_EP.list) return envelope({ items: [] });
      return envelope([]);
    });
    const repo = new ExamBankRepository(makeHttp({ get }));
    await repo.listExamBank({ status: "published" });
    const listCall = get.mock.calls.find((c) => c[0] === EXAM_BANK_EP.list);
    expect(listCall?.[1]).toMatchObject({
      params: { status: "PUBLISHED" },
      raw: true,
    });
  });

  it("getExamDetail maps the paper and resolves its subject name", async () => {
    const get = vi.fn(async (url: string) => {
      if (url === EXAM_BANK_EP.detail("ep-9")) {
        return paperDto({ examPaperId: "ep-9", subjectId: "subj-2" });
      }
      return { subjectId: "subj-2", name: "Vật lý" };
    });
    const repo = new ExamBankRepository(makeHttp({ get }));
    const detail = await repo.getExamDetail("ep-9");
    expect(detail.id).toBe("ep-9");
    expect(detail.subjectName).toBe("Vật lý");
    expect(detail.questions[0].options).toEqual([]);
    expect(detail.questions[0].correctOptionId).toBe("B");
  });

  it("publishExam PUTs {status:'PUBLISHED'} to the status endpoint", async () => {
    const put = vi.fn(async () =>
      paperDto({ examPaperId: "ep-1", status: "PUBLISHED" }),
    );
    const get = vi.fn(async () => ({ subjectId: "subj-1", name: "Toán" }));
    const repo = new ExamBankRepository(makeHttp({ get, put }));
    const summary = await repo.publishExam("ep-1");
    expect(put).toHaveBeenCalledWith(EXAM_BANK_EP.status("ep-1"), {
      status: "PUBLISHED",
    });
    expect(summary.status).toBe("published");
  });

  it("maps an ApiError by code to the failure key it throws", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "EXAM_PAPER_NOT_FOUND",
        message: "no",
        retryable: false,
        status: 404,
      });
    });
    const repo = new ExamBankRepository(makeHttp({ get }));
    await expect(repo.getExamDetail("missing")).rejects.toThrow("not-found");
  });

  it("throws invalid-transition on a 409 conflict at publish", async () => {
    const put = vi.fn(async () => {
      throw new ApiError({
        code: "EXAM_STATUS_TRANSITION_INVALID",
        message: "no",
        retryable: false,
        status: 409,
      });
    });
    const repo = new ExamBankRepository(makeHttp({ put }));
    await expect(repo.publishExam("ep-1")).rejects.toThrow(
      "invalid-transition",
    );
  });

  it("createExam is still a permanently blocked stub (no bulk-create endpoint — ADR 0056 Amendment 2)", async () => {
    const repo = new ExamBankRepository(makeHttp());
    await expect(
      repo.createExam({
        title: "x",
        subjectId: "s",
        durationMinutes: 1,
        maxAttempts: 1,
        questions: [],
      }),
    ).rejects.toThrow("not-supported");
  });
});

// ── US-E18.28: deleteExam + updateExam diff-sync (core US-152) ───────────────

describe("ExamBankRepository.deleteExam (real DELETE /exam-papers/:id)", () => {
  it("DELETEs the paper and resolves (204, no body)", async () => {
    const del = vi.fn(async () => undefined);
    const repo = new ExamBankRepository(makeHttp({ delete: del }));
    await expect(repo.deleteExam("ep-1")).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith(EXAM_BANK_EP.detail("ep-1"));
  });

  it.each([
    ["EXAM_STATUS_INVALID_FOR_EDIT", 409, "not-editable"],
    ["EXAM_PAPER_FORBIDDEN", 403, "forbidden"],
    ["EXAM_PAPER_NOT_FOUND", 404, "not-found"],
  ] as const)("maps %s → %s", async (code, status, key) => {
    const del = vi.fn(async () => {
      throw new ApiError({ code, message: "no", retryable: false, status });
    });
    const repo = new ExamBankRepository(makeHttp({ delete: del }));
    await expect(repo.deleteExam("ep-1")).rejects.toThrow(key);
  });
});

describe("ExamBankRepository.updateExam (diff-sync composition)", () => {
  /** Server question (already persisted, has a real `questionId`). */
  function serverQuestion(questionId: string, position: number) {
    return {
      questionId,
      position,
      questionType: "MCQ" as const,
      body: `Q${position}`,
      answerKey: "A",
      marks: 1,
      options: [
        { id: "A", text: "a" },
        { id: "B", text: "b" },
      ],
      correctOptionId: "A",
      difficulty: "MEDIUM" as const,
    };
  }

  /** Local (builder) question — `id` matches a server questionId, or is temp. */
  function localQuestion(id: string, index: number): ExamBankQuestion {
    return {
      id,
      index,
      content: `Q${index + 1}`,
      options: [
        { id: "A", text: "a" },
        { id: "B", text: "b" },
      ],
      correctOptionId: "A",
      difficulty: "medium",
      subjectId: "subj-1",
    };
  }

  function updateInput(
    questions: ExamBankQuestion[],
    over: Partial<UpdateExamInput> = {},
  ): UpdateExamInput {
    return {
      id: "ep-1",
      title: "Đề Toán",
      subjectId: "subj-1",
      durationMinutes: 45,
      maxAttempts: 1,
      questions,
      ...over,
    };
  }

  /** Wires a real repo whose GET returns `server`, tracking every call. */
  function harness(serverQuestions: ReturnType<typeof serverQuestion>[]) {
    const calls: string[] = [];
    const get = vi.fn(async (url: string) => {
      if (url === EXAM_BANK_EP.detail("ep-1")) {
        calls.push("GET detail");
        return paperDto({ questions: serverQuestions });
      }
      return { subjectId: "subj-1", name: "Toán" };
    });
    const patch = vi.fn(async (url: string) => {
      calls.push(`PATCH ${url}`);
      return paperDto({ questions: serverQuestions });
    });
    const put = vi.fn(async (url: string) => {
      calls.push(`PUT ${url}`);
      return undefined;
    });
    const post = vi.fn(async (url: string) => {
      calls.push(`POST ${url}`);
      return undefined;
    });
    const del = vi.fn(async (url: string) => {
      calls.push(`DELETE ${url}`);
      return undefined;
    });
    const repo = new ExamBankRepository(
      makeHttp({ get, patch, put, post, delete: del }),
    );
    return { repo, calls, get, patch, put, post, del };
  }

  it("PATCHes {title, durationMinutes} only — gradeLevel/subjectId are never sent", async () => {
    const h = harness([serverQuestion("eq-1", 1)]);
    await h.repo.updateExam(
      "ep-1",
      updateInput([localQuestion("eq-1", 0)], { title: "Tiêu đề mới" }),
    );
    expect(h.patch).toHaveBeenCalledTimes(1);
    expect(h.patch).toHaveBeenCalledWith(EXAM_BANK_EP.detail("ep-1"), {
      title: "Tiêu đề mới",
      durationMinutes: 45,
    });
  });

  it("skips the PATCH entirely when neither title nor duration changed", async () => {
    const h = harness([serverQuestion("eq-1", 1)]);
    await h.repo.updateExam("ep-1", updateInput([localQuestion("eq-1", 0)]));
    expect(h.patch).not.toHaveBeenCalled();
  });

  // QA (US-E18.28): the skip-optimization must not accidentally skip an actual
  // change — cover the OTHER asymmetric case (duration changes, title doesn't),
  // complementing the existing title-only-changed test above.
  it("PATCHes when only durationMinutes changed (title unchanged)", async () => {
    const h = harness([serverQuestion("eq-1", 1)]);
    await h.repo.updateExam(
      "ep-1",
      updateInput([localQuestion("eq-1", 0)], { durationMinutes: 90 }),
    );
    expect(h.patch).toHaveBeenCalledTimes(1);
    expect(h.patch).toHaveBeenCalledWith(EXAM_BANK_EP.detail("ep-1"), {
      title: "Đề Toán",
      durationMinutes: 90,
    });
  });

  it("DELETEs a server question that is absent from the local list", async () => {
    const h = harness([serverQuestion("eq-1", 1), serverQuestion("eq-2", 2)]);
    await h.repo.updateExam("ep-1", updateInput([localQuestion("eq-1", 0)]));
    expect(h.del).toHaveBeenCalledTimes(1);
    expect(h.del).toHaveBeenCalledWith(EXAM_BANK_EP.question("ep-1", "eq-2"));
  });

  it("PUTs every question whose id already exists on the server", async () => {
    const h = harness([serverQuestion("eq-1", 1), serverQuestion("eq-2", 2)]);
    await h.repo.updateExam(
      "ep-1",
      updateInput([localQuestion("eq-1", 0), localQuestion("eq-2", 1)]),
    );
    expect(h.put).toHaveBeenCalledTimes(2);
    expect(h.put).toHaveBeenNthCalledWith(
      1,
      EXAM_BANK_EP.question("ep-1", "eq-1"),
      expect.objectContaining({ questionType: "MCQ", marks: 1 }),
    );
    expect(h.del).not.toHaveBeenCalled();
    expect(h.post).not.toHaveBeenCalled();
  });

  it("POSTs a client-temp-id question as an append", async () => {
    const h = harness([serverQuestion("eq-1", 1)]);
    await h.repo.updateExam(
      "ep-1",
      updateInput([localQuestion("eq-1", 0), localQuestion("q-1754000000", 1)]),
    );
    expect(h.post).toHaveBeenCalledTimes(1);
    expect(h.post).toHaveBeenCalledWith(
      EXAM_BANK_EP.questions("ep-1"),
      expect.objectContaining({ body: "Q2" }),
    );
  });

  it("runs the combined case in order: GET → PATCH → DELETE → PUT → POST → GET", async () => {
    const h = harness([serverQuestion("eq-1", 1), serverQuestion("eq-2", 2)]);
    await h.repo.updateExam(
      "ep-1",
      updateInput([localQuestion("eq-1", 0), localQuestion("q-999", 1)], {
        durationMinutes: 60,
      }),
    );
    expect(h.calls).toEqual([
      "GET detail",
      `PATCH ${EXAM_BANK_EP.detail("ep-1")}`,
      `DELETE ${EXAM_BANK_EP.question("ep-1", "eq-2")}`,
      `PUT ${EXAM_BANK_EP.question("ep-1", "eq-1")}`,
      `POST ${EXAM_BANK_EP.questions("ep-1")}`,
      "GET detail",
    ]);
  });

  it("returns the authoritative final state from the trailing GET", async () => {
    const server = [serverQuestion("eq-1", 1)];
    const get = vi.fn(async (url: string) => {
      if (url === EXAM_BANK_EP.detail("ep-1")) {
        return paperDto({ title: "Từ server", questions: server });
      }
      return { subjectId: "subj-1", name: "Toán" };
    });
    const repo = new ExamBankRepository(makeHttp({ get }));
    const detail = await repo.updateExam(
      "ep-1",
      updateInput([localQuestion("eq-1", 0)], { title: "Từ server" }),
    );
    expect(detail.title).toBe("Từ server");
    expect(detail.subjectName).toBe("Toán");
    expect(detail.questions[0].id).toBe("eq-1");
  });

  it.each([
    ["EXAM_QUESTION_NOT_FOUND", 404, "question-not-found"],
    ["EXAM_MCQ_OPTIONS_INVALID", 422, "mcq-options-invalid"],
    ["EXAM_CORRECT_OPTION_INVALID", 422, "correct-option-invalid"],
    ["EXAM_OPTIONS_NOT_ALLOWED", 422, "options-not-allowed"],
    ["EXAM_QUESTION_DIFFICULTY_INVALID", 422, "question-difficulty-invalid"],
    ["EXAM_STATUS_INVALID_FOR_EDIT", 409, "not-editable"],
  ] as const)("maps a mid-sequence %s to the %s failure key", async (code, status, key) => {
    const get = vi.fn(async (url: string) =>
      url === EXAM_BANK_EP.detail("ep-1")
        ? paperDto({ questions: [serverQuestion("eq-1", 1)] })
        : { subjectId: "subj-1", name: "Toán" },
    );
    const put = vi.fn(async () => {
      throw new ApiError({ code, message: "no", retryable: false, status });
    });
    const repo = new ExamBankRepository(makeHttp({ get, put }));
    await expect(
      repo.updateExam("ep-1", updateInput([localQuestion("eq-1", 0)])),
    ).rejects.toThrow(key);
  });
});

/**
 * Regression guard for `{ raw: true }` placement (epic bug class US-E18.2/19):
 * `raw` MUST sit at the top level of the axios config, not nested in `params`,
 * or `isRawCall` returns false → the envelope is unwrapped early → the repo's
 * `parseEnvelope` throws. Runs the REAL `unwrapResponse` against the config the
 * repo actually passes.
 */
describe("ExamBankRepository — real interceptor pipeline (raw-flag placement)", () => {
  it("listExamBank survives the real unwrap (raw top-level on both fan-outs)", async () => {
    const get = vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data:
            url === EXAM_BANK_EP.list
              ? envelope({ items: [paperDto({ subjectId: "subj-1" })] })
              : envelope([{ subjectId: "subj-1", name: "Toán" }]),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
    const repo = new ExamBankRepository(makeHttp({ get }));
    const items = await repo.listExamBank({});
    expect(items).toHaveLength(1);
    expect(items[0].subjectName).toBe("Toán");
  });
});
