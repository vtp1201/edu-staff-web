/**
 * Integration tests — PrincipalTeachersRepository (US-E13.5).
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly (or the full envelope for `{ raw: true }` list calls) and receive a
 * normalised ApiError on failure. Mock at that boundary; branch on error.code.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { PrincipalTeachersRepository } from "./principal-teachers.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function networkError() {
  // No HTTP response → statusOf returns undefined.
  return new ApiError({
    code: "NETWORK_ERROR",
    message: "network",
    retryable: true,
  });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function listEnvelope<T>(items: T[]) {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor: null, hasMore: false },
    },
  };
}

describe("PrincipalTeachersRepository", () => {
  describe("assignHomeroomTeacher", () => {
    it("calls PUT classHomeroomTeacher endpoint with { teacherId } body", async () => {
      const put = vi.fn().mockResolvedValue(undefined);
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "t-001");
      expect(put).toHaveBeenCalledWith(
        CLASS_EP.classHomeroomTeacher("c-10a1"),
        {
          teacherId: "t-001",
        },
      );
      expect(res.ok).toBe(true);
    });

    it("maps 403 → forbidden failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("FORBIDDEN", 403));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "t-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("forbidden");
    });

    it("maps 404 → not-found failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "t-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("not-found");
    });

    it("maps TIMETABLE_CONFLICT code → conflict-exists failure", async () => {
      const put = vi
        .fn()
        .mockRejectedValue(apiError("TIMETABLE_CONFLICT", 409));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "t-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("conflict-exists");
    });

    it("maps network error → network-error failure", async () => {
      const put = vi.fn().mockRejectedValue(networkError());
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "t-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("network-error");
    });
  });

  describe("assignSubjectTeacher", () => {
    it("calls PUT classSubjectTeacher endpoint with { teacherId } body", async () => {
      const put = vi.fn().mockResolvedValue(undefined);
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignSubjectTeacher("c-10a1", "s-toan", "t-001");
      expect(put).toHaveBeenCalledWith(
        CLASS_EP.classSubjectTeacher("c-10a1", "s-toan"),
        { teacherId: "t-001" },
      );
      expect(res.ok).toBe(true);
    });

    it("maps 403 → forbidden failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("FORBIDDEN", 403));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignSubjectTeacher("c-10a1", "s-toan", "t-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("forbidden");
    });
  });

  describe("listTeachers", () => {
    it("calls GET principalTeachers with { raw: true }", async () => {
      const get = vi.fn().mockResolvedValue(listEnvelope([]));
      const repo = new PrincipalTeachersRepository(makeHttp({ get }));
      await repo.listTeachers();
      expect(get).toHaveBeenCalledWith(CLASS_EP.principalTeachers, {
        params: { raw: true },
      });
    });

    it("maps response via PrincipalTeachersMapper.toTeacher", async () => {
      const get = vi.fn().mockResolvedValue(
        listEnvelope([
          {
            teacherId: "t-001",
            displayName: "Nguyễn Thị Lan",
            email: "lan@edu.vn",
            primarySubjectName: "Toán",
            homeroomClassId: "c-10a1",
            homeroomClassName: "10A1",
            subjectAssignments: [],
            status: "ACTIVE",
          },
        ]),
      );
      const repo = new PrincipalTeachersRepository(makeHttp({ get }));
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(1);
        expect(res.value[0].teacherId).toBe("t-001");
        expect(res.value[0].displayName).toBe("Nguyễn Thị Lan");
      }
    });
  });

  describe("getClassSubjects", () => {
    it("calls GET classSubjects endpoint for the given classId", async () => {
      const get = vi.fn().mockResolvedValue([]);
      const repo = new PrincipalTeachersRepository(makeHttp({ get }));
      await repo.getClassSubjects("c-11b1");
      expect(get).toHaveBeenCalledWith(CLASS_EP.classSubjects("c-11b1"));
    });

    it("returns mapped class subjects", async () => {
      const get = vi.fn().mockResolvedValue([
        {
          id: "cs-001",
          classId: "c-11b1",
          subjectId: "s-van",
          subjectName: "Ngữ văn",
          teacherId: "t-002",
          teacherName: "Trần Văn Minh",
        },
      ]);
      const repo = new PrincipalTeachersRepository(makeHttp({ get }));
      const res = await repo.getClassSubjects("c-11b1");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toHaveLength(1);
        expect(res.value[0].id).toBe("cs-001");
        expect(res.value[0].subjectName).toBe("Ngữ văn");
      }
    });
  });
});
