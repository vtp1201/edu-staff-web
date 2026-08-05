/**
 * Integration tests — PrincipalTeachersRepository (US-E13.5, repointed US-E18.40).
 *
 * The http interceptor unwraps the envelope; repositories receive the payload
 * directly (or the full envelope for `{ raw: true }` list calls) and receive a
 * normalised ApiError on failure. Mock at that boundary; branch on error.code.
 *
 * `listTeachers()` no longer has an endpoint of its own: it reads the IAM member
 * directory through an injected port and COMPOSES core reads on top (US-E18.40).
 * Those tests therefore assert the fan-out's call COUNTS and grouping, not just
 * the mapped output.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { CLASS_EP } from "@/bootstrap/endpoint/class.endpoint";
import { SUBJECT_CATALOGUE_EP } from "@/bootstrap/endpoint/subject-catalogue.endpoint";
import { ApiError, unwrapResponse } from "@/bootstrap/lib/api-envelope";
import { ok } from "@/features/admin/class-management/domain/use-cases/result";
import type { DirectoryMember } from "@/features/iam-directory/domain/entities/directory-member.entity";
import { fail as directoryFail } from "@/features/iam-directory/domain/use-cases/result";
import {
  MAX_SUBJECT_ASSIGNMENT_FANOUT,
  PrincipalTeachersRepository,
} from "./principal-teachers.repository";

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

function member(over: Partial<DirectoryMember> = {}): DirectoryMember {
  return {
    memberId: "m-001",
    userId: "m-001",
    displayName: "Nguyễn Thị Lan",
    email: "lan@edu.vn",
    roles: ["TEACHER"],
    status: "ACTIVE",
    ...over,
  };
}

function classDto(over: Record<string, unknown> = {}) {
  return {
    classId: "c-10a1",
    tenantId: "tenant-1",
    name: "10A1",
    gradeLevel: 10,
    status: "ACTIVE",
    academicYearLabel: "2025-2026",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    studentCount: 32,
    homeroomTeacherId: null,
    homeroomTeacherName: null,
    ...over,
  };
}

function assignmentDto(over: Record<string, unknown> = {}) {
  return {
    classId: "c-10a1",
    subjectId: "s-toan",
    teacherMemberId: "m-001",
    assignedAt: "2026-01-05T02:00:00Z",
    assignedBy: "m-admin",
    ...over,
  };
}

/**
 * Routes each GET by url so a single `http.get` mock can serve the whole
 * composition (classes → per-class assignments → subject catalogue).
 */
function routedGet(routes: {
  classes?: unknown;
  assignments?: (classId: string) => unknown;
  subjects?: unknown;
}) {
  return vi.fn(async (url: string) => {
    if (url === CLASS_EP.classes) {
      if (routes.classes instanceof Error) throw routes.classes;
      return routes.classes ?? listEnvelope([]);
    }
    if (url === SUBJECT_CATALOGUE_EP.subjects) {
      if (routes.subjects instanceof Error) throw routes.subjects;
      return routes.subjects ?? listEnvelope([]);
    }
    const match = url.match(/\/classes\/([^/]+)\/subject-assignments$/);
    if (match) {
      const result = routes.assignments?.(match[1]) ?? [];
      if (result instanceof Error) throw result;
      return result;
    }
    throw new Error(`unexpected GET ${url}`);
  });
}

/** `routedGet`'s loose signature needs the axios generic cast at the seam. */
function httpWithGet(get: unknown) {
  return makeHttp({ get: get as AxiosInstance["get"] });
}

describe("PrincipalTeachersRepository", () => {
  describe("assignHomeroomTeacher", () => {
    it("calls PUT classHomeroomTeacher with the wire's { teacherMemberId } body", async () => {
      const put = vi.fn().mockResolvedValue(undefined);
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "m-001");
      expect(put).toHaveBeenCalledWith(
        CLASS_EP.classHomeroomTeacher("c-10a1"),
        { teacherMemberId: "m-001" },
      );
      expect(res.ok).toBe(true);
    });

    it("maps CLASS_FORBIDDEN → forbidden failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("CLASS_FORBIDDEN", 403));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("forbidden");
    });

    it("maps CLASS_ASSIGNMENT_TEACHER_NOT_FOUND → not-found failure", async () => {
      const put = vi
        .fn()
        .mockRejectedValue(apiError("CLASS_ASSIGNMENT_TEACHER_NOT_FOUND", 404));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("not-found");
    });

    it("maps CLASS_ARCHIVED (409) → conflict-exists failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("CLASS_ARCHIVED", 409));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("conflict-exists");
    });

    it("maps network error → network-error failure", async () => {
      const put = vi.fn().mockRejectedValue(networkError());
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignHomeroomTeacher("c-10a1", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("network-error");
    });
  });

  describe("assignSubjectTeacher", () => {
    it("calls PUT classSubjectTeacher with the wire's { teacherMemberId } body", async () => {
      const put = vi.fn().mockResolvedValue(undefined);
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignSubjectTeacher("c-10a1", "s-toan", "m-001");
      expect(put).toHaveBeenCalledWith(
        CLASS_EP.classSubjectTeacher("c-10a1", "s-toan"),
        { teacherMemberId: "m-001" },
      );
      expect(res.ok).toBe(true);
    });

    it("maps 403 → forbidden failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("CLASS_FORBIDDEN", 403));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignSubjectTeacher("c-10a1", "s-toan", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("forbidden");
    });

    it("maps a bare 409 with no known code → conflict-exists failure", async () => {
      const put = vi.fn().mockRejectedValue(apiError("SOME_NEW_CODE", 409));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignSubjectTeacher("c-10a1", "s-toan", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("conflict-exists");
    });

    it("maps CLASS_ASSIGNMENT_NOT_TEACHER_ROLE (422) → unknown, never conflict", async () => {
      const put = vi
        .fn()
        .mockRejectedValue(apiError("CLASS_ASSIGNMENT_NOT_TEACHER_ROLE", 422));
      const repo = new PrincipalTeachersRepository(makeHttp({ put }));
      const res = await repo.assignSubjectTeacher("c-10a1", "s-toan", "m-001");
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("unknown");
    });
  });

  describe("listTeachers — IAM directory + composed subject assignments", () => {
    it("fails closed with `unknown` and hits ZERO endpoints without the directory port", async () => {
      const get = vi.fn();
      const repo = new PrincipalTeachersRepository(makeHttp({ get }));
      const res = await repo.listTeachers();
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("unknown");
      expect(get).not.toHaveBeenCalled();
    });

    it("never calls a /core/api/v1/teachers endpoint (BE will never ship it)", async () => {
      const get = routedGet({ classes: listEnvelope([]) });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      await repo.listTeachers();
      for (const [url] of get.mock.calls) {
        expect(url).not.toMatch(/\/core\/api\/v1\/teachers/);
      }
    });

    it("maps directory members to teacher rows", async () => {
      const get = routedGet({ classes: listEnvelope([]) });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([
          member(),
          member({
            memberId: "m-002",
            userId: "m-002",
            displayName: "Trần Văn Minh",
            email: "minh@edu.vn",
            status: "INACTIVE",
          }),
        ]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value).toHaveLength(2);
      expect(res.value[0]).toMatchObject({
        teacherId: "m-001",
        displayName: "Nguyễn Thị Lan",
        email: "lan@edu.vn",
        status: "ACTIVE",
      });
      expect(res.value[1].status).toBe("INACTIVE");
    });

    it("translates the directory's forbidden failure into this feature's union", async () => {
      const repo = new PrincipalTeachersRepository(makeHttp(), async () =>
        directoryFail({ type: "forbidden" }),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe("forbidden");
    });

    it("translates the directory's network-error, and too-many-ids → unknown", async () => {
      const netRepo = new PrincipalTeachersRepository(makeHttp(), async () =>
        directoryFail({ type: "network-error" }),
      );
      const netRes = await netRepo.listTeachers();
      expect(netRes.ok).toBe(false);
      if (!netRes.ok) expect(netRes.failure.type).toBe("network-error");

      const idsRepo = new PrincipalTeachersRepository(makeHttp(), async () =>
        directoryFail({ type: "too-many-ids" }),
      );
      const idsRes = await idsRepo.listTeachers();
      expect(idsRes.ok).toBe(false);
      if (!idsRes.ok) expect(idsRes.failure.type).toBe("unknown");
    });

    it("derives homeroom from the enriched class list — no extra call", async () => {
      const get = routedGet({
        classes: listEnvelope([
          classDto({
            homeroomTeacherId: "m-001",
            homeroomTeacherName: "Nguyễn Thị Lan",
          }),
        ]),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member(), member({ memberId: "m-002" })]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value[0]).toMatchObject({
        homeroomClassId: "c-10a1",
        homeroomClassName: "10A1",
      });
      expect(res.value[1].homeroomClassId).toBeNull();
      // exactly: 1 × GET /classes + 1 × per-class assignments (no homeroom read)
      const urls = get.mock.calls.map(([url]) => url as string);
      expect(urls.filter((u) => u.includes("homeroom-teacher"))).toHaveLength(
        0,
      );
    });

    it("fans out subject-assignments per class and groups by teacherMemberId", async () => {
      const get = routedGet({
        classes: listEnvelope([
          classDto(),
          classDto({ classId: "c-11b1", name: "11B1", gradeLevel: 11 }),
        ]),
        assignments: (classId) =>
          classId === "c-10a1"
            ? [
                assignmentDto(),
                assignmentDto({ subjectId: "s-ly", teacherMemberId: "m-002" }),
              ]
            : [
                assignmentDto({
                  classId: "c-11b1",
                  subjectId: "s-van",
                  teacherMemberId: "m-002",
                }),
              ],
        subjects: listEnvelope([
          { subjectId: "s-toan", name: "Toán" },
          { subjectId: "s-ly", name: "Vật lý" },
          { subjectId: "s-van", name: "Ngữ văn" },
        ]),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member(), member({ memberId: "m-002" })]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const urls = get.mock.calls.map(([url]) => url as string);
      expect(urls).toContain(CLASS_EP.classSubjectAssignments("c-10a1"));
      expect(urls).toContain(CLASS_EP.classSubjectAssignments("c-11b1"));
      // one call per class, no more
      expect(
        urls.filter((u) => u.endsWith("/subject-assignments")),
      ).toHaveLength(2);

      expect(res.value[0].subjectAssignments).toEqual([
        {
          classId: "c-10a1",
          className: "10A1",
          subjectId: "s-toan",
          subjectName: "Toán",
        },
      ]);
      expect(res.value[1].subjectAssignments).toHaveLength(2);
      expect(res.value[1].subjectAssignments.map((a) => a.className)).toEqual([
        "10A1",
        "11B1",
      ]);
    });

    it("resolves subject names with ONE catalogue drain for the whole fan-out", async () => {
      const get = routedGet({
        classes: listEnvelope([
          classDto(),
          classDto({ classId: "c-11b1", name: "11B1" }),
        ]),
        assignments: (classId) => [assignmentDto({ classId })],
        subjects: listEnvelope([{ subjectId: "s-toan", name: "Toán" }]),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      await repo.listTeachers();
      const urls = get.mock.calls.map(([url]) => url as string);
      expect(
        urls.filter((u) => u === SUBJECT_CATALOGUE_EP.subjects),
      ).toHaveLength(1);
    });

    it("skips the catalogue drain entirely when no class has an assignment", async () => {
      const get = routedGet({
        classes: listEnvelope([classDto()]),
        assignments: () => [],
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      await repo.listTeachers();
      const urls = get.mock.calls.map(([url]) => url as string);
      expect(urls).not.toContain(SUBJECT_CATALOGUE_EP.subjects);
    });

    it("leaves subjectName null (never the uuid) when the catalogue read fails", async () => {
      const get = routedGet({
        classes: listEnvelope([classDto()]),
        assignments: () => [assignmentDto()],
        subjects: apiError("UNKNOWN_ERROR", 500),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value[0].subjectAssignments[0].subjectName).toBeNull();
      expect(res.value[0].primarySubjectName).toBeNull();
    });

    it("derives primarySubjectName as the most-taught resolvable subject", async () => {
      const get = routedGet({
        classes: listEnvelope([
          classDto(),
          classDto({ classId: "c-10a2", name: "10A2" }),
          classDto({ classId: "c-11b1", name: "11B1" }),
        ]),
        assignments: (classId) =>
          classId === "c-11b1"
            ? [assignmentDto({ classId, subjectId: "s-ly" })]
            : [assignmentDto({ classId })],
        subjects: listEnvelope([
          { subjectId: "s-toan", name: "Toán" },
          { subjectId: "s-ly", name: "Vật lý" },
        ]),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value[0].primarySubjectName).toBe("Toán");
    });

    it("degrades ONE class only when its assignment read fails", async () => {
      const get = routedGet({
        classes: listEnvelope([
          classDto(),
          classDto({ classId: "c-11b1", name: "11B1" }),
        ]),
        assignments: (classId) =>
          classId === "c-10a1"
            ? apiError("CLASS_FORBIDDEN", 403)
            : [assignmentDto({ classId: "c-11b1", subjectId: "s-van" })],
        subjects: listEnvelope([{ subjectId: "s-van", name: "Ngữ văn" }]),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value[0].subjectAssignments).toEqual([
        {
          classId: "c-11b1",
          className: "11B1",
          subjectId: "s-van",
          subjectName: "Ngữ văn",
        },
      ]);
    });

    it("still lists teachers when the class list itself fails (no enrichment)", async () => {
      const get = routedGet({ classes: apiError("CLASS_FORBIDDEN", 403) });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value).toHaveLength(1);
      expect(res.value[0].subjectAssignments).toEqual([]);
      expect(res.value[0].homeroomClassId).toBeNull();
    });

    it("drops assignments whose teacher is not in the directory", async () => {
      const get = routedGet({
        classes: listEnvelope([classDto()]),
        assignments: () => [
          assignmentDto({ teacherMemberId: "m-gone" }),
          assignmentDto({ subjectId: "s-ly" }),
        ],
        subjects: listEnvelope([
          { subjectId: "s-toan", name: "Toán" },
          { subjectId: "s-ly", name: "Vật lý" },
        ]),
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value).toHaveLength(1);
      expect(res.value[0].subjectAssignments.map((a) => a.subjectId)).toEqual([
        "s-ly",
      ]);
    });

    it(`skips the fan-out beyond ${MAX_SUBJECT_ASSIGNMENT_FANOUT} classes but keeps homeroom`, async () => {
      const many = Array.from(
        { length: MAX_SUBJECT_ASSIGNMENT_FANOUT + 1 },
        (_, i) =>
          classDto({
            classId: `c-${i}`,
            name: `C${i}`,
            ...(i === 0
              ? {
                  homeroomTeacherId: "m-001",
                  homeroomTeacherName: "Nguyễn Thị Lan",
                }
              : {}),
          }),
      );
      const get = routedGet({
        classes: listEnvelope(many),
        assignments: () => [assignmentDto()],
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      const res = await repo.listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const urls = get.mock.calls.map(([url]) => url as string);
      expect(
        urls.filter((u) => u.endsWith("/subject-assignments")),
      ).toHaveLength(0);
      expect(urls).not.toContain(SUBJECT_CATALOGUE_EP.subjects);
      expect(res.value[0].subjectAssignments).toEqual([]);
      expect(res.value[0].homeroomClassId).toBe("c-0");
    });

    it(`still fans out at exactly ${MAX_SUBJECT_ASSIGNMENT_FANOUT} classes`, async () => {
      const many = Array.from(
        { length: MAX_SUBJECT_ASSIGNMENT_FANOUT },
        (_, i) => classDto({ classId: `c-${i}`, name: `C${i}` }),
      );
      const get = routedGet({
        classes: listEnvelope(many),
        assignments: () => [],
      });
      const repo = new PrincipalTeachersRepository(httpWithGet(get), async () =>
        ok([member()]),
      );
      await repo.listTeachers();
      const urls = get.mock.calls.map(([url]) => url as string);
      expect(
        urls.filter((u) => u.endsWith("/subject-assignments")),
      ).toHaveLength(MAX_SUBJECT_ASSIGNMENT_FANOUT);
    });
  });

  /**
   * Regression guard for `{ raw: true }` config placement. The suites above mock
   * `http.get` to return an envelope directly, so they cannot catch `raw` being
   * nested inside `params` (isRawCall reads `config.raw` at the TOP level). Here
   * `http.get` runs the REAL `unwrapResponse` interceptor against the config the
   * repo actually passes: if a list call puts `raw` inside `params`, isRawCall
   * returns false → the envelope is unwrapped to its array → the repo's
   * `parseEnvelope(array)` throws UNKNOWN_ERROR → the call fails. Passes only
   * when `raw` sits at the top level of the config.
   *
   * `subject-assignments` is the reverse case: BE answers with `response.OK`
   * (no pagination meta), so the repo must NOT pass `raw` and must read the
   * unwrapped array.
   */
  describe("real interceptor pipeline (raw-flag placement)", () => {
    /** Mimics bootstrap/lib/http.ts: resolve get() to unwrapResponse(response). */
    function interceptedGet(bodyFor: (url: string) => unknown) {
      return vi.fn(
        async (url: string, config?: { params?: unknown; raw?: boolean }) =>
          unwrapResponse({
            data: bodyFor(url),
            config: { url, raw: config?.raw },
          }),
      ) as unknown as AxiosInstance["get"];
    }

    it("listClasses survives the real unwrap (raw is top-level)", async () => {
      const get = interceptedGet(() => listEnvelope([classDto()]));
      const res = await new PrincipalTeachersRepository(
        httpWithGet(get),
      ).listClasses();
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.value[0].id).toBe("c-10a1");
    });

    it("the composed listTeachers survives the real unwrap end to end", async () => {
      const get = interceptedGet((url) => {
        if (url === CLASS_EP.classes) return listEnvelope([classDto()]);
        if (url === SUBJECT_CATALOGUE_EP.subjects)
          return listEnvelope([{ subjectId: "s-toan", name: "Toán" }]);
        return listEnvelope([assignmentDto()]);
      });
      const res = await new PrincipalTeachersRepository(
        httpWithGet(get),
        async () => ok([member()]),
      ).listTeachers();
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      expect(res.value[0].subjectAssignments).toEqual([
        {
          classId: "c-10a1",
          className: "10A1",
          subjectId: "s-toan",
          subjectName: "Toán",
        },
      ]);
      expect(res.value[0].primarySubjectName).toBe("Toán");
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
      const repo = new PrincipalTeachersRepository(httpWithGet(get));
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
