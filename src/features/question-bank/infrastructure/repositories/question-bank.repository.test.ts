import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { QUESTION_BANK_EP } from "@/bootstrap/endpoint/lms.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  type Pagination,
} from "@/bootstrap/lib/api-envelope";
import type { QuestionResponseDto } from "../dtos/question-response.dto";
import { QuestionBankRepository } from "./question-bank.repository";

function makeHttp(
  over: { get?: unknown; post?: unknown; put?: unknown } = {},
): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
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

function dto(over: Partial<QuestionResponseDto> = {}): QuestionResponseDto {
  return {
    id: "q-1",
    tenantId: "tn-1",
    authorId: "t-me",
    questionType: "ESSAY",
    subjectId: "sub-math",
    gradeLevel: "12",
    difficulty: "HARD",
    body: "Nội dung",
    expectedAnswer: "Đáp án",
    status: "DRAFT",
    tags: [],
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...over,
  };
}

describe("QuestionBankRepository", () => {
  it("create POSTs the input to the list path and maps the result", async () => {
    const post = vi.fn(async () => dto({ id: "q-new" }));
    const repo = new QuestionBankRepository(makeHttp({ post }));
    const input = {
      questionType: "ESSAY" as const,
      subjectId: "sub-math",
      gradeLevel: "12",
      difficulty: "HARD" as const,
      body: "Nội dung",
    };
    const q = await repo.create(input);
    expect(post).toHaveBeenCalledWith(QUESTION_BANK_EP.list, input);
    expect(q.id).toBe("q-new");
  });

  it("getById maps a DRAFT with an absent publishedAt to undefined", async () => {
    const { publishedAt: _o, ...draft } = dto({ status: "DRAFT" });
    const get = vi.fn(async () => draft);
    const repo = new QuestionBankRepository(makeHttp({ get }));
    const q = await repo.getById("q-1");
    expect(q.publishedAt).toBeUndefined();
    expect(q.status).toBe("DRAFT");
  });

  it("listMine reads meta.pagination via raw:true (sibling of params)", async () => {
    const get = vi.fn(async () =>
      envelope(
        { items: [dto({ id: "q-1" }), dto({ id: "q-2" })] },
        { nextCursor: "c2", hasMore: true },
      ),
    );
    const repo = new QuestionBankRepository(makeHttp({ get }));
    const page = await repo.listMine({ cursor: "c1", limit: 6 });
    expect(page.items.map((q) => q.id)).toEqual(["q-1", "q-2"]);
    expect(page.nextCursor).toBe("c2");
    expect(page.hasMore).toBe(true);
    expect(get).toHaveBeenCalledWith(QUESTION_BANK_EP.list, {
      params: { cursor: "c1", limit: "6" },
      raw: true,
    });
  });

  it("listMine returns no nextCursor when hasMore is false", async () => {
    const get = vi.fn(async () =>
      envelope({ items: [dto()] }, { nextCursor: "c9", hasMore: false }),
    );
    const repo = new QuestionBankRepository(makeHttp({ get }));
    const page = await repo.listMine({});
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeUndefined();
  });

  it("search sends subject/tag/grade/difficulty query params to the search path", async () => {
    const get = vi.fn(async () =>
      envelope({ items: [dto({ status: "PUBLISHED" })] }),
    );
    const repo = new QuestionBankRepository(makeHttp({ get }));
    await repo.search({
      subjectId: "sub-phys",
      tag: "Điện trường",
      gradeLevel: "11",
      difficulty: "HARD",
    });
    expect(get).toHaveBeenCalledWith(QUESTION_BANK_EP.search, {
      params: {
        subjectId: "sub-phys",
        tag: "Điện trường",
        gradeLevel: "11",
        difficulty: "HARD",
      },
      raw: true,
    });
  });

  it("update PUTs only body/expectedAnswer/tags to the detail path (FR-009)", async () => {
    const put = vi.fn(async () => dto({ body: "v2" }));
    const repo = new QuestionBankRepository(makeHttp({ put }));
    const q = await repo.update("q-1", {
      body: "v2",
      expectedAnswer: "a",
      tags: ["t"],
    });
    expect(put).toHaveBeenCalledWith(QUESTION_BANK_EP.detail("q-1"), {
      body: "v2",
      expectedAnswer: "a",
      tags: ["t"],
    });
    expect(q.body).toBe("v2");
  });

  it("publish PUTs with no body to the publish path", async () => {
    const put = vi.fn(async () =>
      dto({ status: "PUBLISHED", publishedAt: "2026-07-02T00:00:00Z" }),
    );
    const repo = new QuestionBankRepository(makeHttp({ put }));
    const q = await repo.publish("q-1");
    expect(put).toHaveBeenCalledWith(QUESTION_BANK_EP.publish("q-1"));
    expect(q.status).toBe("PUBLISHED");
    expect(q.publishedAt).toBe("2026-07-02T00:00:00Z");
  });

  it("throws not-visible on a 403 QUESTION_NOT_VISIBLE from getById", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "QUESTION_NOT_VISIBLE",
        message: "no",
        retryable: false,
        status: 403,
      });
    });
    const repo = new QuestionBankRepository(makeHttp({ get }));
    await expect(repo.getById("q-x")).rejects.toThrow("not-visible");
  });

  it("throws forbidden-browse on a 403 FORBIDDEN_ACTION from search (browse call-site)", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "FORBIDDEN_ACTION",
        message: "no",
        retryable: false,
        status: 403,
      });
    });
    const repo = new QuestionBankRepository(makeHttp({ get }));
    await expect(repo.search({ subjectId: "sub-math" })).rejects.toThrow(
      "forbidden-browse",
    );
  });

  it("throws forbidden-edit on a 403 FORBIDDEN_ACTION from update (edit call-site)", async () => {
    const put = vi.fn(async () => {
      throw new ApiError({
        code: "FORBIDDEN_ACTION",
        message: "no",
        retryable: false,
        status: 403,
      });
    });
    const repo = new QuestionBankRepository(makeHttp({ put }));
    await expect(repo.update("q-1", { body: "v2" })).rejects.toThrow(
      "forbidden-edit",
    );
  });

  it("throws already-published (422) on a publish conflict", async () => {
    const put = vi.fn(async () => {
      throw new ApiError({
        code: "QUESTION_ALREADY_PUBLISHED",
        message: "no",
        retryable: false,
        status: 422,
      });
    });
    const repo = new QuestionBankRepository(makeHttp({ put }));
    await expect(repo.publish("q-1")).rejects.toThrow("already-published");
  });
});
