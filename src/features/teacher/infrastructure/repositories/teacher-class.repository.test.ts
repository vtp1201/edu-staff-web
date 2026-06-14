/**
 * Integration tests — TeacherClassRepository (US-E13.1).
 * The http interceptor unwraps the envelope only when `config.raw` is truthy at
 * config level; this repo passes `{ params: { limit: 100, raw: true } }` so the
 * raw flag is nested under params — the interceptor does NOT unwrap, and the repo
 * calls `parseEnvelope()` itself. We therefore mock `http.get` to resolve the
 * full ApiEnvelope<T> shape (what `parseEnvelope` consumes). Errors arrive as a
 * normalised ApiError and map through `toTeacherClassFailure`.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { TeacherClassRepository } from "./teacher-class.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(get: ReturnType<typeof vi.fn>) {
  return { get } as unknown as AxiosInstance;
}

/** Build a list envelope page; `nextCursor` non-null → more pages follow. */
function listEnvelope<T>(items: T[], nextCursor: string | null = null) {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: { nextCursor, hasMore: nextCursor != null },
    },
  };
}

function classDto(over: Record<string, unknown> = {}) {
  return {
    classId: "cls-10a1",
    tenantId: "t1",
    name: "10A1",
    gradeLevel: 10,
    academicYearLabel: "2025–2026",
    status: "active",
    homeroomTeacherId: null,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
    ...over,
  };
}

function enrollmentDto(over: Record<string, unknown> = {}) {
  return {
    enrollmentId: "enr-1",
    classId: "cls-10a1",
    studentMemberId: "HS25001",
    displayName: "Nguyễn Văn A",
    academicYearLabel: "2025–2026",
    enrolledAt: "2025-01-01",
    status: "active",
    ...over,
  };
}

describe("TeacherClassRepository (US-E13.1)", () => {
  // ── listMyClasses maps DTOs + derives isHomeroom from currentUserId ───────
  it("listMyClasses maps DTOs to TeacherClass[] with correct isHomeroom", async () => {
    const get = vi.fn();
    get.mockImplementation((url: string) => {
      if (url === "/core/api/v1/classes") {
        return Promise.resolve(
          listEnvelope([
            classDto({ classId: "cls-a", homeroomTeacherId: "USR-me" }),
            classDto({ classId: "cls-b", homeroomTeacherId: "USR-other" }),
          ]),
        );
      }
      // roster lookups for the student-count per class
      return Promise.resolve(listEnvelope([enrollmentDto(), enrollmentDto()]));
    });
    const repo = new TeacherClassRepository(makeHttp(get), "USR-me");
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0].id).toBe("cls-a");
      expect(res.data[0].isHomeroom).toBe(true);
      expect(res.data[0].studentCount).toBe(2);
      expect(res.data[1].isHomeroom).toBe(false);
    }
  });

  // ── listMyClasses drains 2-page cursor pagination ────────────────────────
  it("listMyClasses drains a 2-page cursor for the class list", async () => {
    // Page the class list: first call returns cursor, second returns last page.
    let classCall = 0;
    const get = vi.fn();
    get.mockImplementation((url: string) => {
      if (url === "/core/api/v1/classes") {
        classCall += 1;
        return classCall === 1
          ? Promise.resolve(
              listEnvelope([classDto({ classId: "cls-a" })], "C2"),
            )
          : Promise.resolve(
              listEnvelope([classDto({ classId: "cls-b" })], null),
            );
      }
      return Promise.resolve(listEnvelope([enrollmentDto()]));
    });

    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.listMyClasses();

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.map((c) => c.id)).toEqual(["cls-a", "cls-b"]);
    }
    // The class endpoint was called twice (page 1 + page 2 via cursor).
    const classListCalls = get.mock.calls.filter(
      (c) => c[0] === "/core/api/v1/classes",
    );
    expect(classListCalls).toHaveLength(2);
    expect(classListCalls[1][1]).toEqual({
      params: { limit: 100, raw: true, cursor: "C2" },
    });
  });

  // ── listMyClasses maps errors via toTeacherClassFailure ──────────────────
  it("listMyClasses: 401 → unauthorized", async () => {
    const get = vi.fn().mockRejectedValue(apiError("UNAUTHORIZED", 401));
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.listMyClasses();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("unauthorized");
  });

  // ── getClassStudents returns mapped TeacherRosterStudent[] ────────────────
  it("getClassStudents returns mapped TeacherRosterStudent[]", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([
        enrollmentDto({
          enrollmentId: "enr-1",
          studentMemberId: "HS25001",
          displayName: "Nguyễn Văn A",
          status: "active",
        }),
        enrollmentDto({
          enrollmentId: "enr-2",
          studentMemberId: "HS25002",
          displayName: "  ",
          status: "transferred",
        }),
      ]),
    );
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.getClassStudents("cls-10a1");

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toHaveLength(2);
      expect(res.data[0].displayName).toBe("Nguyễn Văn A");
      expect(res.data[0].status).toBe("active");
      // blank displayName falls back to the member id
      expect(res.data[1].displayName).toBe("HS25002");
      expect(res.data[1].status).toBe("transferred");
    }
    expect(get).toHaveBeenCalledWith("/core/api/v1/classes/cls-10a1/students", {
      params: { limit: 100, raw: true },
    });
  });

  // ── getClassStudents handles empty result ────────────────────────────────
  it("getClassStudents returns an empty array for an empty class", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([]));
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.getClassStudents("cls-empty");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toEqual([]);
  });

  // ── getClassStudents maps CLASS_NOT_FOUND → not-found ─────────────────────
  it("getClassStudents: CLASS_NOT_FOUND → not-found", async () => {
    const get = vi.fn().mockRejectedValue(apiError("CLASS_NOT_FOUND", 404));
    const repo = new TeacherClassRepository(makeHttp(get), null);
    const res = await repo.getClassStudents("missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("not-found");
  });
});
