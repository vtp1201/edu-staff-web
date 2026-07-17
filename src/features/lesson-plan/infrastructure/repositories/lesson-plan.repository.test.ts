import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { LESSON_PLAN_EP } from "@/bootstrap/endpoint/lesson-plan.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  type Pagination,
} from "@/bootstrap/lib/api-envelope";
import type { LessonPlanResponseDto } from "../dtos/lesson-plan-response.dto";
import { LessonPlanRepository } from "./lesson-plan.repository";

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

function dto(over: Partial<LessonPlanResponseDto> = {}): LessonPlanResponseDto {
  return {
    planId: "lp-1",
    teacherId: "t-1",
    subjectId: "sub-math",
    gradeLevel: "11",
    title: "Giáo án — Đạo hàm",
    objectives: "o",
    contentOutline: "c",
    activities: "a",
    assessmentMethod: "m",
    status: "DRAFT",
    tags: [],
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...over,
  };
}

describe("LessonPlanRepository", () => {
  it("create POSTs the input and maps the returned plan", async () => {
    const post = vi.fn(async () => dto({ planId: "lp-new" }));
    const repo = new LessonPlanRepository(makeHttp({ post }));
    const plan = await repo.create({
      subjectId: "sub-math",
      gradeLevel: "11",
      title: "Giáo án — Đạo hàm",
    });
    expect(post).toHaveBeenCalledWith(LESSON_PLAN_EP.create, {
      subjectId: "sub-math",
      gradeLevel: "11",
      title: "Giáo án — Đạo hàm",
    });
    expect(plan.planId).toBe("lp-new");
  });

  it("get maps a DRAFT with an absent publishedAt to undefined", async () => {
    const { publishedAt: _o, ...draft } = dto({ status: "DRAFT" });
    const get = vi.fn(async () => draft);
    const repo = new LessonPlanRepository(makeHttp({ get }));
    const plan = await repo.get("lp-1");
    expect(plan.publishedAt).toBeUndefined();
    expect(plan.status).toBe("DRAFT");
  });

  it("listMine reads meta.pagination via raw:true (sibling of params)", async () => {
    const get = vi.fn(async () =>
      envelope(
        { items: [dto({ planId: "lp-1" }), dto({ planId: "lp-2" })] },
        { nextCursor: "c2", hasMore: true },
      ),
    );
    const repo = new LessonPlanRepository(makeHttp({ get }));
    const page = await repo.listMine({ cursor: "c1", limit: 6 });
    expect(page.items.map((p) => p.planId)).toEqual(["lp-1", "lp-2"]);
    expect(page.nextCursor).toBe("c2");
    expect(page.hasMore).toBe(true);
    expect(get).toHaveBeenCalledWith(LESSON_PLAN_EP.list, {
      params: { cursor: "c1", limit: "6" },
      raw: true,
    });
  });

  it("listMine returns no nextCursor when hasMore is false", async () => {
    const get = vi.fn(async () =>
      envelope({ items: [dto()] }, { nextCursor: "c9", hasMore: false }),
    );
    const repo = new LessonPlanRepository(makeHttp({ get }));
    const page = await repo.listMine({});
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeUndefined();
  });

  it("listBySubject sends the tag query param and hits the subject path", async () => {
    const get = vi.fn(async () =>
      envelope({ items: [dto({ status: "PUBLISHED" })] }),
    );
    const repo = new LessonPlanRepository(makeHttp({ get }));
    await repo.listBySubject({ subjectId: "sub-phys", tag: "Chương 3" });
    expect(get).toHaveBeenCalledWith(LESSON_PLAN_EP.bySubject("sub-phys"), {
      params: { tag: "Chương 3" },
      raw: true,
    });
  });

  it("update PUTs without subjectId and maps the result", async () => {
    const put = vi.fn(async () => dto({ title: "v2" }));
    const repo = new LessonPlanRepository(makeHttp({ put }));
    const plan = await repo.update("lp-1", { gradeLevel: "11", title: "v2" });
    expect(put).toHaveBeenCalledWith(LESSON_PLAN_EP.update("lp-1"), {
      gradeLevel: "11",
      title: "v2",
    });
    expect(plan.title).toBe("v2");
  });

  it("publish PUTs with no body to the publish path", async () => {
    const put = vi.fn(async () =>
      dto({ status: "PUBLISHED", publishedAt: "2026-07-02T00:00:00Z" }),
    );
    const repo = new LessonPlanRepository(makeHttp({ put }));
    const plan = await repo.publish("lp-1");
    expect(put).toHaveBeenCalledWith(LESSON_PLAN_EP.publish("lp-1"));
    expect(plan.status).toBe("PUBLISHED");
    expect(plan.publishedAt).toBe("2026-07-02T00:00:00Z");
  });

  it("maps an ApiError by code to the thrown failure key", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "LESSON_PLAN_NOT_VISIBLE",
        message: "no",
        retryable: false,
        status: 403,
      });
    });
    const repo = new LessonPlanRepository(makeHttp({ get }));
    await expect(repo.get("lp-x")).rejects.toThrow("not-visible");
  });

  it("throws already-published (422) on a publish conflict", async () => {
    const put = vi.fn(async () => {
      throw new ApiError({
        code: "LESSON_PLAN_ALREADY_PUBLISHED",
        message: "no",
        retryable: false,
        status: 422,
      });
    });
    const repo = new LessonPlanRepository(makeHttp({ put }));
    await expect(repo.publish("lp-1")).rejects.toThrow("already-published");
  });
});
