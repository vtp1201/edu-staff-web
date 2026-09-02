/**
 * Integration tests — `LmsRepository` ↔ mocked http boundary (US-E24.1).
 *
 * Asserts the three things a wire-level bug hides behind: the exact PATH
 * (incl. the double `lms` segment), the exact request SHAPE (params vs body),
 * and the `error.code` → `LmsFailure` mapping. The interceptor is assumed to
 * have unwrapped the envelope already (`.data` is never read), which is why
 * the stubs resolve payloads directly.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { CourseItemResponseDto } from "../dtos/course-item-response.dto";
import { LmsRepository } from "./lms.repository";

const BASE = "/lms/api/v1/lms";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

type HttpStub = AxiosInstance & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
};

function makeHttp(overrides: Partial<Record<string, unknown>> = {}): HttpStub {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    ...overrides,
  } as unknown as HttpStub;
}

const ITEM_DTO: CourseItemResponseDto = {
  id: "i1",
  courseId: "c1",
  itemType: "LESSON",
  refId: "i1",
  title: "Bài 1",
  description: null,
  url: null,
  position: 0,
  startAt: null,
  dueAt: null,
  state: "OPEN",
  createdBy: "t1",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  examId: null,
  scheduledDate: null,
  durationMinutes: null,
  examUrl: null,
};

describe("listCourses", () => {
  it("GETs the class-scoped list with classId as a query param", async () => {
    const http = makeHttp({ get: vi.fn(async () => []) });
    await new LmsRepository(http).listCourses("cl1");

    expect(http.get).toHaveBeenCalledWith(`${BASE}/courses`, {
      params: { classId: "cl1" },
    });
  });

  it("adds subjectId only when given", async () => {
    const http = makeHttp({ get: vi.fn(async () => []) });
    await new LmsRepository(http).listCourses("cl1", "s1");

    expect(http.get).toHaveBeenCalledWith(`${BASE}/courses`, {
      params: { classId: "cl1", subjectId: "s1" },
    });
  });

  it("maps the rows and never invents description/createdAt", async () => {
    const http = makeHttp({
      get: vi.fn(async () => [
        {
          id: "c1",
          classId: "cl1",
          subjectId: "s1",
          title: "Toán 10",
          status: "PUBLISHED",
          isDefault: true,
          createdBy: "t1",
          updatedAt: "2026-08-02T00:00:00Z",
          publishedAt: "2026-08-02T00:00:00Z",
        },
      ]),
    });

    const rows = await new LmsRepository(http).listCourses("cl1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("description");
  });

  it("surfaces a class-scope denial (403 LMS_CLASS_NOT_FOUND) as `forbidden`", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("LMS_CLASS_NOT_FOUND", 403)),
      ),
    });

    await expect(new LmsRepository(http).listCourses("cl1")).rejects.toEqual({
      type: "forbidden",
    });
  });
});

describe("getCourse", () => {
  it("maps 404 LMS_COURSE_NOT_FOUND to `not-found` — never an empty result", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("LMS_COURSE_NOT_FOUND", 404)),
      ),
    });

    await expect(new LmsRepository(http).getCourse("c1")).rejects.toEqual({
      type: "not-found",
    });
  });
});

describe("listItems", () => {
  it("GETs the timeline and preserves BE order verbatim", async () => {
    const second = {
      ...ITEM_DTO,
      id: "i2",
      position: 1,
      itemType: "DOCUMENT" as const,
      refId: null,
    };
    const third = {
      ...ITEM_DTO,
      id: "i3",
      position: 2,
      itemType: "EXAM" as const,
      examId: "i3",
    };
    const http = makeHttp({
      get: vi.fn(async () => [third, ITEM_DTO, second]),
    });

    const items = await new LmsRepository(http).listItems("c1");

    expect(http.get).toHaveBeenCalledWith(`${BASE}/courses/c1/items`);
    // Returned in the ORDER BE sent them, not re-sorted by `position`.
    expect(items.map((i) => i.id)).toEqual(["i3", "i1", "i2"]);
    expect(items[0].exam).toEqual({
      examId: "i3",
      scheduledDate: null,
      durationMinutes: null,
      examUrl: null,
    });
  });

  it("maps an unauthorized timeline read to `not-found`, not `[]`", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("LMS_COURSE_NOT_FOUND", 404)),
      ),
    });

    await expect(new LmsRepository(http).listItems("c1")).rejects.toEqual({
      type: "not-found",
    });
  });
});

describe("listAssignments", () => {
  it("passes classId, and the optional narrowing filters when present", async () => {
    const http = makeHttp({ get: vi.fn(async () => []) });
    const repo = new LmsRepository(http);

    await repo.listAssignments("cl1");
    expect(http.get).toHaveBeenLastCalledWith(`${BASE}/assignments`, {
      params: { classId: "cl1" },
    });

    await repo.listAssignments("cl1", { courseId: "c1", subjectId: "s1" });
    expect(http.get).toHaveBeenLastCalledWith(`${BASE}/assignments`, {
      params: { classId: "cl1", subjectId: "s1", courseId: "c1" },
    });
  });
});

describe("getMySubmission", () => {
  const SUB = {
    assignmentId: "a1",
    studentUserId: "u1",
    content: "Bài làm",
    status: "SUBMITTED" as const,
    submittedAt: "2026-09-05T00:00:00Z",
  };

  it("GETs the `/me` route and returns the submission WITH content", async () => {
    const http = makeHttp({ get: vi.fn(async () => SUB) });

    const sub = await new LmsRepository(http).getMySubmission("a1");

    expect(http.get).toHaveBeenCalledWith(
      `${BASE}/assignments/a1/submissions/me`,
    );
    expect(sub).toEqual(SUB);
  });

  it("resolves NULL for 404 LMS_SUBMISSION_NOT_FOUND (= not submitted yet)", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("LMS_SUBMISSION_NOT_FOUND", 404)),
      ),
    });

    await expect(
      new LmsRepository(http).getMySubmission("a1"),
    ).resolves.toBeNull();
  });

  it("still THROWS for 404 LMS_ASSIGNMENT_NOT_FOUND (denied, not 'unsubmitted')", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("LMS_ASSIGNMENT_NOT_FOUND", 404)),
      ),
    });

    await expect(new LmsRepository(http).getMySubmission("a1")).rejects.toEqual(
      { type: "not-found" },
    );
  });
});

describe("submitAssignment", () => {
  it("POSTs `{ content }` to the submissions route", async () => {
    const http = makeHttp({
      post: vi.fn(async () => ({
        assignmentId: "a1",
        studentUserId: "u1",
        content: "Bài làm",
        status: "SUBMITTED",
        submittedAt: "2026-09-05T00:00:00Z",
      })),
    });

    await new LmsRepository(http).submitAssignment("a1", "Bài làm");

    expect(http.post).toHaveBeenCalledWith(
      `${BASE}/assignments/a1/submissions`,
      { content: "Bài làm" },
    );
  });

  it("maps a second attempt (409) to `already-submitted`", async () => {
    const http = makeHttp({
      post: vi.fn(async () =>
        Promise.reject(apiError("LMS_SUBMISSION_ALREADY_SUBMITTED", 409)),
      ),
    });

    await expect(
      new LmsRepository(http).submitAssignment("a1", "x"),
    ).rejects.toEqual({ type: "already-submitted" });
  });

  it("maps a past-deadline submit (409 LMS_ITEM_CLOSED) to `closed`", async () => {
    const http = makeHttp({
      post: vi.fn(async () => Promise.reject(apiError("LMS_ITEM_CLOSED", 409))),
    });

    await expect(
      new LmsRepository(http).submitAssignment("a1", "x"),
    ).rejects.toEqual({ type: "closed" });
  });

  it("maps an unknown/absent assignment to `not-found`", async () => {
    const http = makeHttp({
      post: vi.fn(async () =>
        Promise.reject(apiError("LMS_ASSIGNMENT_NOT_FOUND", 404)),
      ),
    });

    await expect(
      new LmsRepository(http).submitAssignment("a1", "x"),
    ).rejects.toEqual({ type: "not-found" });
  });
});

describe("teacher commands (no UI yet — E24.10)", () => {
  it("reorderItems PUTs the COMPLETE ordering as `{ itemIds }`", async () => {
    const http = makeHttp({ put: vi.fn(async () => [ITEM_DTO]) });

    await new LmsRepository(http).reorderItems("c1", ["i2", "i1"]);

    expect(http.put).toHaveBeenCalledWith(`${BASE}/courses/c1/items/order`, {
      itemIds: ["i2", "i1"],
    });
  });

  it("reorderItems maps a partial/unknown ordering to `not-found`", async () => {
    const http = makeHttp({
      put: vi.fn(async () =>
        Promise.reject(apiError("LMS_ITEM_NOT_FOUND", 404)),
      ),
    });

    await expect(
      new LmsRepository(http).reorderItems("c1", ["i1"]),
    ).rejects.toEqual({ type: "not-found" });
  });

  it("patchItem forwards an explicit null (three-state window CLEAR)", async () => {
    const http = makeHttp({ patch: vi.fn(async () => ITEM_DTO) });

    await new LmsRepository(http).patchItem("c1", "i1", { dueAt: null });

    expect(http.patch).toHaveBeenCalledWith(`${BASE}/courses/c1/items/i1`, {
      dueAt: null,
    });
  });

  it("patchItem maps an EXAM window edit to `exam-window-not-editable`", async () => {
    const http = makeHttp({
      patch: vi.fn(async () =>
        Promise.reject(apiError("LMS_EXAM_WINDOW_NOT_EDITABLE", 409)),
      ),
    });

    await expect(
      new LmsRepository(http).patchItem("c1", "i1", { dueAt: "x" }),
    ).rejects.toEqual({ type: "exam-window-not-editable" });
  });

  it("patchItem maps a LESSON-tile title edit to `not-document`", async () => {
    const http = makeHttp({
      patch: vi.fn(async () =>
        Promise.reject(apiError("LMS_ITEM_NOT_DOCUMENT", 409)),
      ),
    });

    await expect(
      new LmsRepository(http).patchItem("c1", "i1", { title: "x" }),
    ).rejects.toEqual({ type: "not-document" });
  });

  it("addDocumentItem POSTs to the documents route and maps a bad URL to `invalid-url`", async () => {
    const ok = makeHttp({ post: vi.fn(async () => ITEM_DTO) });
    await new LmsRepository(ok).addDocumentItem("c1", {
      title: "Tài liệu",
      url: "https://example.org/a.pdf",
    });
    expect(ok.post).toHaveBeenCalledWith(`${BASE}/courses/c1/items/documents`, {
      title: "Tài liệu",
      url: "https://example.org/a.pdf",
    });

    const bad = makeHttp({
      post: vi.fn(async () =>
        Promise.reject(apiError("LMS_ITEM_URL_INVALID", 422)),
      ),
    });
    await expect(
      new LmsRepository(bad).addDocumentItem("c1", {
        title: "x",
        url: "javascript:alert(1)",
      }),
    ).rejects.toEqual({ type: "invalid-url" });
  });

  it("createAssignment maps the per-class cap to `limit-exceeded`", async () => {
    const http = makeHttp({
      post: vi.fn(async () =>
        Promise.reject(apiError("LMS_ASSIGNMENT_LIMIT_EXCEEDED", 409)),
      ),
    });

    await expect(
      new LmsRepository(http).createAssignment({
        classId: "cl1",
        subjectId: "s1",
        courseId: "c1",
        title: "x",
      }),
    ).rejects.toEqual({ type: "limit-exceeded" });
  });
});

describe("failure fallback", () => {
  it("maps a transport/gateway error with no code to `network-error`", async () => {
    const http = makeHttp({
      get: vi.fn(async () => Promise.reject(new Error("socket hang up"))),
    });

    await expect(new LmsRepository(http).getCourse("c1")).rejects.toEqual({
      type: "network-error",
    });
  });

  it("maps a 5xx to `network-error` (retryable class), not `unknown`", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("INTERNAL_SERVER_ERROR", 500)),
      ),
    });

    await expect(new LmsRepository(http).getCourse("c1")).rejects.toEqual({
      type: "network-error",
    });
  });

  it("maps a malformed-uuid 400 to `unknown` (a client bug, no user copy)", async () => {
    const http = makeHttp({
      get: vi.fn(async () =>
        Promise.reject(apiError("LMS_INVALID_COURSE_ID", 400)),
      ),
    });

    await expect(new LmsRepository(http).getCourse("c1")).rejects.toEqual({
      type: "unknown",
    });
  });
});
