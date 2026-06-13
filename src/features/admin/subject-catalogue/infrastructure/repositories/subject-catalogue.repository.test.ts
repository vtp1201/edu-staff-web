/**
 * Integration tests — SubjectCatalogueRepository error-code mapping (TR-030, US-E06.6).
 * The http interceptor unwraps the envelope; repositories receive the payload directly
 * and receive a normalised ApiError on failure. Mock at that boundary.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
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

// Minimal valid envelope for raw list calls
function makeListEnvelope<T>(items: T[]) {
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

describe("SubjectCatalogueRepository — error-code mapping (TR-026)", () => {
  // ── listParents (paginated) ──────────────────────────────────────────────
  it("listParents returns mapped parents from envelope", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(
        makeListEnvelope([
          {
            id: "sp-math",
            name: "Toán học",
            conceptType: "BO_MON",
            conceptLabelCustom: null,
            status: "ACTIVE",
            childCount: 3,
            activeChildCount: 2,
          },
        ]),
      ),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.listParents();
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0].id).toBe("sp-math");
    }
  });

  // ── archiveParent — SUBJECT_PARENT_IN_USE (blocked) ─────────────────────
  it("archiveParent: SUBJECT_PARENT_IN_USE → archive-blocked-parent failure", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("SUBJECT_PARENT_IN_USE", 409)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.archiveParent("sp-math");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("parent-in-use");
  });

  // ── archiveSubject — SUBJECT_IN_USE (blocked) ────────────────────────────
  it("archiveSubject: SUBJECT_IN_USE → archive-blocked-subject failure", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("SUBJECT_IN_USE", 409)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.archiveSubject("sub-math-10");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("archive-blocked-subject");
  });

  // ── createSubject — SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE ─────────────
  it("createSubject: SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE → grade-level-out-of-range", async () => {
    const http = makeHttp({
      post: vi
        .fn()
        .mockRejectedValue(
          apiError("SUBJECT_GRADE_LEVEL_OUTSIDE_TENANT_RANGE", 422),
        ),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.createSubject({
      parentId: "sp-math",
      name: "Toán lớp 1",
      code: null,
      gradeLevel: 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("grade-level-out-of-range");
  });

  // ── createSubject — SUBJECT_PARENT_NOT_ACTIVE ────────────────────────────
  it("createSubject: SUBJECT_PARENT_NOT_ACTIVE → parent-not-active", async () => {
    const http = makeHttp({
      post: vi
        .fn()
        .mockRejectedValue(apiError("SUBJECT_PARENT_NOT_ACTIVE", 422)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.createSubject({
      parentId: "sp-archived",
      name: "Toán lớp 10",
      code: null,
      gradeLevel: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("parent-not-active");
  });

  // ── createParent — SUBJECT_PARENT_ALREADY_EXISTS ─────────────────────────
  it("createParent: SUBJECT_PARENT_ALREADY_EXISTS → already-exists", async () => {
    const http = makeHttp({
      post: vi
        .fn()
        .mockRejectedValue(apiError("SUBJECT_PARENT_ALREADY_EXISTS", 409)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.createParent({
      name: "Toán học",
      conceptType: "BO_MON",
      conceptLabelCustom: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("already-exists");
  });

  // ── createSubject — SUBJECT_ALREADY_EXISTS ───────────────────────────────
  it("createSubject: SUBJECT_ALREADY_EXISTS → already-exists", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError("SUBJECT_ALREADY_EXISTS", 409)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.createSubject({
      parentId: "sp-math",
      name: "Toán lớp 10",
      code: null,
      gradeLevel: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("already-exists");
  });

  // ── SUBJECT_PARENT_NOT_FOUND (404) ───────────────────────────────────────
  it("getSubject: SUBJECT_PARENT_NOT_FOUND → not-found", async () => {
    const http = makeHttp({
      get: vi.fn().mockRejectedValue(apiError("SUBJECT_PARENT_NOT_FOUND", 404)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.getSubject("sub-missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("not-found");
  });

  // ── 403 Forbidden ────────────────────────────────────────────────────────
  it("archiveParent: SUBJECT_PARENT_FORBIDDEN → parent-forbidden", async () => {
    const http = makeHttp({
      post: vi
        .fn()
        .mockRejectedValue(apiError("SUBJECT_PARENT_FORBIDDEN", 403)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.archiveParent("sp-restricted");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.failure.type).toBe("parent-forbidden");
  });

  // ── ClassSubject error codes ─────────────────────────────────────────────
  it("patchSubject: CLASS_SUBJECT_LOCKED_FIELD_UPDATE → class-subject-locked-field-update", async () => {
    const http = makeHttp({
      patch: vi
        .fn()
        .mockRejectedValue(apiError("CLASS_SUBJECT_LOCKED_FIELD_UPDATE", 400)),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.patchSubject("sub-10", { name: "New name" });
    expect(res.ok).toBe(false);
    if (!res.ok)
      expect(res.failure.type).toBe("class-subject-locked-field-update");
  });

  // ── network/transport error ──────────────────────────────────────────────
  it("listParents: network error (no response) → network-error", async () => {
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

  // ── listSubjects (paginated) ─────────────────────────────────────────────
  it("listSubjects returns subjects from paginated envelope", async () => {
    const http = makeHttp({
      get: vi.fn().mockResolvedValue(
        makeListEnvelope([
          {
            id: "sub-math-10",
            parentId: "sp-math",
            name: "Toán lớp 10",
            code: "MATH10",
            gradeLevel: 10,
            status: "ACTIVE",
            inUse: false,
            periodCount: null,
            requiredAssessmentCount: null,
            outcomeTargets: "",
            masterSyllabus: "",
            exerciseBankRef: "",
            examBankRef: "",
          },
        ]),
      ),
    });
    const repo = new SubjectCatalogueRepository(http);
    const res = await repo.listSubjects("sp-math");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toHaveLength(1);
      expect(res.value[0].code).toBe("MATH10");
    }
  });
});
