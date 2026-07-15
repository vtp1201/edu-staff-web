/**
 * Integration tests — SubjectCatalogueRepository against the REAL core contract
 * (US-E18.3). The http interceptor unwraps the envelope; repositories receive
 * the payload directly and a normalised ApiError on failure. Mock at that
 * boundary. Covers: error-code matrix, subjects fan-out pagination + count
 * derivation, listSubjects client-side filter, getSubject empty classOfferings,
 * restoreParent WEB-ONLY fallback, and request-body shaping.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { SUBJECT_CATALOGUE_EP } from "@/bootstrap/endpoint/subject-catalogue.endpoint";
import {
  type ApiEnvelope,
  ApiError,
  type Pagination,
  unwrapResponse,
} from "@/bootstrap/lib/api-envelope";
import type { SubjectParentResponseDto } from "../dtos/subject-parent-response.dto";
import type { SubjectResponseDto } from "../dtos/subject-response.dto";
import { SubjectCatalogueRepository } from "./subject-catalogue.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

function envelope<T>(items: T, pagination?: Pagination): ApiEnvelope<T> {
  return {
    success: true,
    data: items,
    error: null,
    meta: {
      requestId: "req-test",
      pagination: pagination ?? { nextCursor: null, hasMore: false },
    },
  };
}

function parentDto(
  over: Partial<SubjectParentResponseDto> = {},
): SubjectParentResponseDto {
  return {
    subjectParentId: "sp-math",
    tenantId: "t-1",
    name: "Bộ môn Toán",
    conceptLabelSuggested: "BO_MON",
    conceptLabelCustom: null,
    effectiveConceptLabel: "Bộ môn",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

function subjectDto(
  over: Partial<SubjectResponseDto> = {},
): SubjectResponseDto {
  return {
    subjectId: "sub-math-10",
    tenantId: "t-1",
    subjectParentId: "sp-math",
    name: "Toán 10",
    code: "MATH10",
    gradeLevel: 10,
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    ...over,
  };
}

/**
 * URL-dispatching `http.get` mock. `subjectPages` lets a test return a
 * multi-page cursor sequence for the subjects fan-out.
 */
function dispatchGet(opts: {
  parents?: SubjectParentResponseDto[];
  subjectPages?: Array<{
    items: SubjectResponseDto[];
    pagination?: Pagination;
  }>;
  subject?: SubjectResponseDto;
}) {
  let subjectCall = 0;
  return vi.fn(async (url: string) => {
    if (url === SUBJECT_CATALOGUE_EP.parents) {
      return envelope(opts.parents ?? []);
    }
    if (url === SUBJECT_CATALOGUE_EP.subjects) {
      const page = opts.subjectPages?.[subjectCall] ?? { items: [] };
      subjectCall += 1;
      return envelope(page.items, page.pagination);
    }
    // single subject detail (SUBJECT_CATALOGUE_EP.subject(id)) — non-envelope
    // (interceptor already unwrapped) → return the payload directly.
    if (opts.subject) return opts.subject;
    throw apiError("SUBJECT_NOT_FOUND", 404);
  }) as unknown as AxiosInstance["get"];
}

describe("SubjectCatalogueRepository — error-code matrix (branch on code)", () => {
  const cases: Array<{
    code: string;
    status: number;
    type: string;
  }> = [
    { code: "SUBJECT_PARENT_NOT_FOUND", status: 404, type: "not-found" },
    { code: "SUBJECT_NOT_FOUND", status: 404, type: "not-found" },
    { code: "CLASS_SUBJECT_NOT_FOUND", status: 404, type: "not-found" },
    {
      code: "SUBJECT_PARENT_ALREADY_EXISTS",
      status: 409,
      type: "already-exists",
    },
    { code: "SUBJECT_ALREADY_EXISTS", status: 409, type: "already-exists" },
    { code: "SUBJECT_PARENT_IN_USE", status: 409, type: "parent-in-use" },
    { code: "SUBJECT_PARENT_ARCHIVED", status: 409, type: "parent-archived" },
    {
      code: "SUBJECT_PARENT_FORBIDDEN",
      status: 403,
      type: "parent-forbidden",
    },
    { code: "SUBJECT_IN_USE", status: 409, type: "archive-blocked-subject" },
    { code: "SUBJECT_ARCHIVED", status: 409, type: "subject-archived" },
    { code: "CLASS_SUBJECT_ARCHIVED", status: 409, type: "subject-archived" },
    {
      code: "SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE",
      status: 422,
      type: "grade-level-out-of-range",
    },
    {
      code: "SUBJECT_PARENT_NOT_ACTIVE",
      status: 422,
      type: "parent-not-active",
    },
    {
      code: "CLASS_SUBJECT_ALREADY_EXISTS",
      status: 409,
      type: "class-subject-already-exists",
    },
    {
      code: "CLASS_SUBJECT_LOCKED_FIELD_UPDATE",
      status: 400,
      type: "class-subject-locked-field-update",
    },
    { code: "CLASS_SUBJECT_IN_USE", status: 409, type: "class-subject-in-use" },
    { code: "SUBJECT_INVALID_CODE", status: 400, type: "code-format" },
    // Generic fallbacks.
    { code: "CLASS_SUBJECT_FORBIDDEN", status: 403, type: "forbidden" },
    { code: "SUBJECT_FORBIDDEN", status: 403, type: "forbidden" },
    { code: "SOME_UNKNOWN_CODE", status: 500, type: "unknown" },
  ];

  for (const { code, status, type } of cases) {
    it(`${code} (${status}) → ${type}`, async () => {
      // Drive it through createSubject (POST) — a verb the matrix is
      // exercised on regardless of the specific code's real endpoint.
      const http = makeHttp({
        post: vi.fn().mockRejectedValue(apiError(code, status)),
      });
      const repo = new SubjectCatalogueRepository(http);
      const res = await repo.createSubject({
        parentId: "sp-math",
        name: "X",
        code: null,
        gradeLevel: 10,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.failure.type).toBe(type);
    });
  }

  it("network/transport error (no status) → network-error", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(
        new ApiError({
          code: "NETWORK_ERROR",
          message: "Network error",
          retryable: true,
        }),
      ),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.listParents();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("network-error");
  });
});

describe("SubjectCatalogueRepository — listParents count derivation (fan-out)", () => {
  it("derives childCount/activeChildCount per parent from the subjects fan-out", async () => {
    const get = dispatchGet({
      parents: [
        parentDto({ subjectParentId: "sp-math", name: "Toán" }),
        parentDto({ subjectParentId: "sp-empty", name: "Trống" }),
      ],
      subjectPages: [
        {
          items: [
            subjectDto({ subjectId: "s1", subjectParentId: "sp-math" }),
            subjectDto({
              subjectId: "s2",
              subjectParentId: "sp-math",
              status: "ARCHIVED",
            }),
            subjectDto({ subjectId: "s3", subjectParentId: "sp-math" }),
          ],
        },
      ],
    });
    const repo = new SubjectCatalogueRepository(makeHttp({ get }));
    const res = await repo.listParents();
    expect(res.ok).toBe(true);
    if (res.ok) {
      const math = res.value.find((p) => p.id === "sp-math");
      const empty = res.value.find((p) => p.id === "sp-empty");
      expect(math?.childCount).toBe(3);
      expect(math?.activeChildCount).toBe(2);
      expect(empty?.childCount).toBe(0);
      expect(empty?.activeChildCount).toBe(0);
    }
  });

  it("pages through multiple subject pages (hasMore/nextCursor loop)", async () => {
    const get = dispatchGet({
      parents: [parentDto({ subjectParentId: "sp-math" })],
      subjectPages: [
        {
          items: [subjectDto({ subjectId: "s1" })],
          pagination: { nextCursor: "c2", hasMore: true },
        },
        {
          items: [
            subjectDto({ subjectId: "s2" }),
            subjectDto({ subjectId: "s3", status: "ARCHIVED" }),
          ],
          pagination: { nextCursor: null, hasMore: false },
        },
      ],
    });
    const repo = new SubjectCatalogueRepository(makeHttp({ get }));
    const res = await repo.listParents();
    expect(res.ok).toBe(true);
    if (res.ok) {
      const math = res.value.find((p) => p.id === "sp-math");
      expect(math?.childCount).toBe(3);
      expect(math?.activeChildCount).toBe(2);
    }
  });
});

describe("SubjectCatalogueRepository — listSubjects client-side filter", () => {
  it("returns only subjects whose subjectParentId matches, including ARCHIVED", async () => {
    const get = dispatchGet({
      subjectPages: [
        {
          items: [
            subjectDto({ subjectId: "s1", subjectParentId: "sp-math" }),
            subjectDto({
              subjectId: "s2",
              subjectParentId: "sp-math",
              status: "ARCHIVED",
            }),
            subjectDto({ subjectId: "s3", subjectParentId: "sp-lit" }),
          ],
        },
      ],
    });
    const repo = new SubjectCatalogueRepository(makeHttp({ get }));
    const res = await repo.listSubjects("sp-math");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.map((s) => s.id)).toEqual(["s1", "s2"]);
      expect(res.value.some((s) => s.status === "ARCHIVED")).toBe(true);
    }
  });
});

describe("SubjectCatalogueRepository — getSubject", () => {
  it("maps the real subject and returns an empty classOfferings list (no reverse endpoint)", async () => {
    const get = dispatchGet({ subject: subjectDto({ subjectId: "sub-x" }) });
    const repo = new SubjectCatalogueRepository(makeHttp({ get }));
    const res = await repo.getSubject("sub-x");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.subject.id).toBe("sub-x");
      expect(res.value.classOfferings).toEqual([]);
    }
  });

  it("SUBJECT_NOT_FOUND → not-found", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("SUBJECT_NOT_FOUND", 404)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.getSubject("missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });
});

describe("SubjectCatalogueRepository — restoreParent WEB-ONLY fallback", () => {
  it("succeeds without any HTTP call (BE has no un-archive endpoint)", async () => {
    const post = vi.fn();
    const repo = new SubjectCatalogueRepository(makeHttp({ post }));
    const res = await repo.restoreParent("sp-any-real-uuid");
    expect(res.ok).toBe(true);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("SubjectCatalogueRepository — request-body shaping", () => {
  it("createParent sends CreateSubjectParentRequest (conceptLabelSuggested split)", async () => {
    const post = vi.fn().mockResolvedValue(parentDto());
    const repo = new SubjectCatalogueRepository(makeHttp({ post }));
    await repo.createParent({
      name: "Bộ môn Toán",
      conceptType: "BO_MON",
      conceptLabelCustom: null,
    });
    expect(post).toHaveBeenCalledWith(SUBJECT_CATALOGUE_EP.parents, {
      name: "Bộ môn Toán",
      conceptLabelSuggested: "BO_MON",
    });
  });

  it("createSubject sends CreateSubjectRequest (subjectParentId, no master)", async () => {
    const post = vi.fn().mockResolvedValue(subjectDto());
    const repo = new SubjectCatalogueRepository(makeHttp({ post }));
    await repo.createSubject({
      parentId: "sp-math",
      name: "Toán 10",
      code: "MATH10",
      gradeLevel: 10,
    });
    expect(post).toHaveBeenCalledWith(SUBJECT_CATALOGUE_EP.subjects, {
      subjectParentId: "sp-math",
      name: "Toán 10",
      code: "MATH10",
      gradeLevel: 10,
    });
  });

  it("patchSubject nests master fields and wraps ResourceRefs", async () => {
    const patch = vi.fn().mockResolvedValue(subjectDto());
    const repo = new SubjectCatalogueRepository(makeHttp({ patch }));
    await repo.patchSubject("sub-math-10", {
      name: "Toán 10",
      code: "MATH10",
      periodCount: 105,
      requiredAssessmentCount: 4,
      outcomeTargets: "Mục tiêu",
      masterSyllabus: "s.pdf",
      exerciseBankRef: "ex-1",
      examBankRef: "",
    });
    expect(patch).toHaveBeenCalledWith(
      SUBJECT_CATALOGUE_EP.subject("sub-math-10"),
      {
        name: "Toán 10",
        code: "MATH10",
        master: {
          periodCount: 105,
          requiredExamCount: 4,
          learningOutcomes: "Mục tiêu",
          masterSyllabus: "s.pdf",
          exerciseBankRef: { type: "OPAQUE", ref: "ex-1" },
        },
      },
    );
  });
});

/**
 * Regression guard for `{ raw: true }` config placement (US-E18.19). The suites
 * above mock `http.get` to return an envelope directly, so they cannot catch
 * `raw` being nested inside `params`. Here `http.get` runs the REAL
 * `unwrapResponse` interceptor against the config the repo actually passes: if a
 * paginated call puts `raw` inside `params`, isRawCall reads `config.raw` at the
 * TOP level → returns false → the envelope is unwrapped to its array → the repo's
 * `parseEnvelope(array)` throws UNKNOWN_ERROR → the call fails. Passes only when
 * `raw` sits at the top level of the config (sibling of `params`).
 */
describe("SubjectCatalogueRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("listParents survives the real unwrap (raw is top-level on both fan-outs)", async () => {
    const get = interceptedGet((url) => {
      if (url === SUBJECT_CATALOGUE_EP.parents) {
        return envelope([parentDto({ subjectParentId: "sp-math" })]);
      }
      return envelope([subjectDto({ subjectParentId: "sp-math" })]);
    });
    const res = await new SubjectCatalogueRepository(
      makeHttp({ get }),
    ).listParents();
    expect(res.ok).toBe(true);
    if (res.ok) {
      const math = res.value.find((p) => p.id === "sp-math");
      expect(math?.childCount).toBe(1);
    }
  });

  it("listSubjects survives the real unwrap (raw top-level)", async () => {
    const get = interceptedGet(() =>
      envelope([subjectDto({ subjectId: "sub-math-10" })]),
    );
    const res = await new SubjectCatalogueRepository(
      makeHttp({ get }),
    ).listSubjects("sp-math");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value[0]?.code).toBe("MATH10");
  });
});
