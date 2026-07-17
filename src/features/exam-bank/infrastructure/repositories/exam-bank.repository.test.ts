import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { EXAM_BANK_EP } from "@/bootstrap/endpoint/exam-bank.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  type Pagination,
  unwrapResponse,
} from "@/bootstrap/lib/api-envelope";
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
  over: { get?: unknown; post?: unknown; put?: unknown; delete?: unknown } = {},
): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

  it.each([
    "createExam",
    "updateExam",
    "deleteExam",
  ] as const)("%s is a permanently blocked stub (throws not-supported)", async (method) => {
    const repo = new ExamBankRepository(makeHttp());
    const call =
      method === "createExam"
        ? repo.createExam({
            title: "x",
            subjectId: "s",
            durationMinutes: 1,
            maxAttempts: 1,
            questions: [],
          })
        : method === "updateExam"
          ? repo.updateExam("ep-1", {
              id: "ep-1",
              title: "x",
              subjectId: "s",
              durationMinutes: 1,
              maxAttempts: 1,
              questions: [],
            })
          : repo.deleteExam("ep-1");
    await expect(call).rejects.toThrow("not-supported");
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
