import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import {
  type ApiEnvelope,
  ApiError,
  unwrapResponse,
} from "@/bootstrap/lib/api-envelope";
import type { AssessmentScheme } from "../../domain/entities/assessment-scheme.entity";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import type {
  AssessmentSchemeResponseDto,
  SubjectListItemDto,
} from "../dtos/assessment-scheme-response.dto";
import { AssessmentSchemeRepository } from "./assessment-scheme.repository";

// The http interceptor unwraps the success envelope (US-E06.1): calls resolve to
// the payload directly and reject with a normalised ApiError.
function apiError(code: string, status = 400) {
  return new ApiError({ code, message: code, retryable: false, status });
}

/** 422 VALIDATION_FAILED as `core` emits it: code + blamed `fields[]`. */
function validationError(...fields: string[]) {
  return new ApiError({
    code: "VALIDATION_FAILED",
    message: "validation failed",
    retryable: false,
    status: 422,
    fields: fields.map((field) => ({ field, message: "invalid" })),
  });
}

function subjectDto(
  over: Partial<SubjectListItemDto> = {},
): SubjectListItemDto {
  return {
    subjectId: "subj-toan-10",
    tenantId: "t1",
    subjectParentId: "parent-toan",
    name: "Toán",
    code: "TOAN",
    gradeLevel: 10,
    status: "ACTIVE",
    createdAt: "2024-09-01T00:00:00.000Z",
    updatedAt: "2024-09-01T00:00:00.000Z",
    ...over,
  };
}

function listEnvelope(
  data: SubjectListItemDto[],
  pagination?: { nextCursor: string | null; hasMore: boolean },
): ApiEnvelope<SubjectListItemDto[]> {
  return {
    success: true,
    data,
    error: null,
    meta: { requestId: "req-1", ...(pagination ? { pagination } : {}) },
  };
}

function makeHttp(over: Partial<AxiosInstance> = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    ...over,
  } as unknown as AxiosInstance;
}

describe("AssessmentSchemeRepository — grade scale", () => {
  it("getGradeScale calls the real path and maps the response", async () => {
    const get = vi.fn().mockResolvedValue({
      tenantId: "t1",
      scaleType: "HE_10",
      minValue: "0",
      maxValue: "10.0",
      effectiveFrom: "2024-09-01T00:00:00.000Z",
      updatedAt: "2024-09-02T00:00:00.000Z",
    });
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.getGradeScale();

    expect(get).toHaveBeenCalledWith("/core/api/v1/grade-scale");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.type).toBe("SCALE_10");
      expect(res.data.maxScore).toBe(10);
      expect(res.data.effectiveFrom).toBe("2024-09-01T00:00:00.000Z");
    }
  });

  it("saveGradeScale PUTs the mapped request DTO including the real bands (BE US-189)", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const repo = new AssessmentSchemeRepository(makeHttp({ put }));

    const res = await repo.saveGradeScale(GRADE_SCALE_PRESETS.SCALE_10);

    expect(res.ok).toBe(true);
    expect(put).toHaveBeenCalledWith("/core/api/v1/grade-scale", {
      scaleType: "HE_10",
      minValue: "0",
      maxValue: "10",
      effectiveFrom: GRADE_SCALE_PRESETS.SCALE_10.effectiveFrom,
      bands: [
        { label: "Xuất sắc", minThreshold: "9.5" },
        { label: "Giỏi", minThreshold: "8.0" },
        { label: "Khá", minThreshold: "6.5" },
        { label: "Trung bình", minThreshold: "5.0" },
        { label: "Yếu", minThreshold: "0.0" },
      ],
    });
    // a numeric scale still must not send letterGrades
    expect(JSON.stringify(put.mock.calls[0][1])).not.toContain("letterGrades");
  });

  it("saveGradeScale sends letterGrades but NEVER bands for a LETTER scale", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const repo = new AssessmentSchemeRepository(makeHttp({ put }));

    await repo.saveGradeScale(GRADE_SCALE_PRESETS.LETTER);

    const body = put.mock.calls[0][1];
    expect(JSON.stringify(body)).toContain("letterGrades");
    expect(JSON.stringify(body)).not.toContain("bands");
  });
});

describe("AssessmentSchemeRepository — assessment scheme", () => {
  const dto: AssessmentSchemeResponseDto = {
    tenantId: "t1",
    subjectId: "subj-1",
    academicYearLabel: "2024-2025",
    termId: "HK1",
    columns: [
      {
        columnId: "tx",
        name: "TX",
        columnType: "TX",
        coefficient: 2,
        ordinal: 1,
      },
      {
        columnId: "ck",
        name: "CK",
        columnType: "CK",
        coefficient: 8,
        ordinal: 2,
      },
    ],
    updatedAt: "2024-09-02T00:00:00.000Z",
  };

  it("getAssessmentScheme threads termId into the path", async () => {
    const get = vi.fn().mockResolvedValue(dto);
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.getAssessmentScheme("subj-1", "2024-2025", "HK1");

    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/subjects/subj-1/assessment-schemes/2024-2025/terms/HK1",
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.termId).toBe("HK1");
      expect(res.data.columns.map((c) => c.weight)).toEqual([20, 80]);
    }
  });

  it("saveAssessmentScheme PUTs the mapped body (columns only) to the term path", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const repo = new AssessmentSchemeRepository(makeHttp({ put }));
    const scheme: AssessmentScheme = {
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK2",
      columns: [
        { id: "tx", type: "TX", label: "TX", count: 2, weight: 40 },
        { id: "ck", type: "CK", label: "CK", count: 1, weight: 60 },
      ],
    };

    const res = await repo.saveAssessmentScheme(scheme);

    expect(res.ok).toBe(true);
    expect(put).toHaveBeenCalledWith(
      "/core/api/v1/subjects/subj-1/assessment-schemes/2024-2025/terms/HK2",
      {
        columns: [
          {
            name: "TX",
            columnType: "TX",
            coefficient: 4,
            ordinal: 1,
            requiredCount: 2,
          },
          {
            name: "CK",
            columnType: "CK",
            coefficient: 6,
            ordinal: 2,
            requiredCount: 1,
          },
        ],
      },
    );
    const body = put.mock.calls[0][1];
    expect(JSON.stringify(body)).not.toContain('"count"');
    expect(JSON.stringify(body)).not.toContain("termId");
  });

  it("getAssessmentScheme carries requiredCount through, leaving an omitted one unset", async () => {
    const get = vi.fn().mockResolvedValue({
      ...dto,
      columns: [{ ...dto.columns[0], requiredCount: 3 }, { ...dto.columns[1] }],
    });
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.getAssessmentScheme("subj-1", "2024-2025", "HK1");

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.columns.map((c) => c.count)).toEqual([3, null]);
  });

  it("saveAssessmentScheme omits requiredCount for an unset column (never sends null)", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const repo = new AssessmentSchemeRepository(makeHttp({ put }));

    await repo.saveAssessmentScheme({
      subjectId: "subj-1",
      yearLabel: "2024-2025",
      termId: "HK1",
      columns: [
        { id: "tx", type: "TX", label: "TX", count: null, weight: 100 },
      ],
    });

    expect(JSON.stringify(put.mock.calls[0][1])).not.toContain("requiredCount");
  });
});

describe("AssessmentSchemeRepository — listSubjectsForGrade (real GET /subjects, US-E18.42)", () => {
  it("sends gradeLevel + status=ACTIVE as params with `raw: true` at the TOP level of the config", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([subjectDto()]));
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(10);

    expect(res.ok).toBe(true);
    expect(get).toHaveBeenCalledWith("/core/api/v1/subjects", {
      params: { gradeLevel: 10, status: "ACTIVE" },
      raw: true,
    });
    // recurring bug class: `raw` must NOT be nested inside `params`.
    expect(get.mock.calls[0][1].raw).toBe(true);
    expect(get.mock.calls[0][1].params.raw).toBeUndefined();
  });

  it("maps the REAL wire shape (subjectId → id, master.requiredExamCount → requiredAssessmentCount)", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([
        subjectDto({
          subjectId: "subj-ly-10",
          name: "Vật lý",
          master: { requiredExamCount: 4, periodCount: 70 },
        }),
      ]),
    );
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(10);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual([
        {
          id: "subj-ly-10",
          name: "Vật lý",
          gradeLevel: 10,
          requiredAssessmentCount: 4,
        },
      ]);
    }
  });

  it("maps an absent / zero master.requiredExamCount to null (BE always serialises the struct)", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        listEnvelope([
          subjectDto({ subjectId: "a" }),
          subjectDto({ subjectId: "b", master: { requiredExamCount: 0 } }),
        ]),
      );
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(10);

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.map((s) => s.requiredAssessmentCount)).toEqual([
        null,
        null,
      ]);
    }
  });

  it("drains every cursor page (BE filters before pagination — each page is correct, not the only page)", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        listEnvelope([subjectDto({ subjectId: "p1" })], {
          nextCursor: "cur-2",
          hasMore: true,
        }),
      )
      .mockResolvedValueOnce(
        listEnvelope([subjectDto({ subjectId: "p2" })], {
          nextCursor: "cur-3",
          hasMore: true,
        }),
      )
      .mockResolvedValueOnce(
        listEnvelope([subjectDto({ subjectId: "p3" })], {
          nextCursor: null,
          hasMore: false,
        }),
      );
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(10);

    expect(get).toHaveBeenCalledTimes(3);
    expect(get.mock.calls[0][1].params.cursor).toBeUndefined();
    expect(get.mock.calls[1][1].params).toEqual({
      gradeLevel: 10,
      status: "ACTIVE",
      cursor: "cur-2",
    });
    expect(get.mock.calls[2][1].params.cursor).toBe("cur-3");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.map((s) => s.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("stops draining when hasMore is true but nextCursor is missing (no infinite loop)", async () => {
    const get = vi.fn().mockResolvedValue(
      listEnvelope([subjectDto()], {
        nextCursor: null,
        hasMore: true,
      }),
    );
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(10);

    expect(get).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
  });

  it("maps 422 VALIDATION_FAILED blaming `gradeLevel` → invalid-grade-level (BE US-177: int 1..13)", async () => {
    const get = vi.fn().mockRejectedValue(validationError("gradeLevel"));
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(99);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("invalid-grade-level");
  });

  it("does NOT misattribute a VALIDATION_FAILED blaming another field to gradeLevel", async () => {
    const put = vi.fn().mockRejectedValue(validationError("letterGrades"));
    const repo = new AssessmentSchemeRepository(makeHttp({ put }));

    const res = await repo.saveGradeScale(GRADE_SCALE_PRESETS.SCALE_10);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).not.toBe("invalid-grade-level");
  });

  it("maps a transport failure to network-error", async () => {
    const get = vi.fn().mockRejectedValue(apiError("NETWORK_ERROR", 0));
    const repo = new AssessmentSchemeRepository(makeHttp({ get }));

    const res = await repo.listSubjectsForGrade(10);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.type).toBe("network-error");
  });
});

/**
 * Regression guard for the `{ raw: true }` placement bug class
 * (`EPIC-OVERVIEW.md` §"Bug class xuyên suốt"). The suite above mocks `http.get`
 * to resolve an envelope directly, so it cannot catch `raw` sitting inside
 * `params`: only the REAL `unwrapResponse` interceptor does (it reads
 * `config.raw` at the TOP level → otherwise the envelope is unwrapped to a bare
 * array and `parseEnvelope(array)` throws UNKNOWN_ERROR).
 */
describe("AssessmentSchemeRepository — real interceptor pipeline (raw-flag placement)", () => {
  it("listSubjectsForGrade survives the real unwrap", async () => {
    const get = vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: listEnvelope([subjectDto()], {
            nextCursor: null,
            hasMore: false,
          }),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];

    const res = await new AssessmentSchemeRepository(
      makeHttp({ get }),
    ).listSubjectsForGrade(10);

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data[0].id).toBe("subj-toan-10");
  });
});

describe("AssessmentSchemeRepository — failure mapping (ground-truthed UPPER_SNAKE)", () => {
  const cases: Array<[string, number, string]> = [
    ["GRADE_SCALE_FORBIDDEN", 403, "forbidden"],
    ["ASSESSMENT_SCHEME_FORBIDDEN", 403, "forbidden"],
    ["GRADE_SCALE_NOT_FOUND", 404, "not-found"],
    ["ASSESSMENT_SCHEME_NOT_FOUND", 404, "not-found"],
    ["SUBJECT_NOT_FOUND", 404, "not-found"],
    ["GRADE_SCALE_INVALID_TYPE", 400, "invalid-scale-type"],
    ["GRADE_SCALE_LETTER_GRADES_REQUIRED", 422, "letter-grades-required"],
    // BE US-189 — one shared code for every band violation (label, threshold
    // range, ordering, count, or bands sent on a LETTER scale).
    ["GRADE_SCALE_INVALID_BANDS", 422, "invalid-bands"],
    ["ASSESSMENT_SCHEME_COLUMN_IN_USE", 409, "column-in-use"],
    ["ASSESSMENT_SCHEME_MAX_COLUMNS", 422, "max-columns"],
    ["ASSESSMENT_SCHEME_INVALID_COLUMN", 400, "invalid-column"],
    ["NETWORK_ERROR", 0, "network-error"],
    ["SOMETHING_ELSE", 500, "unknown"],
  ];

  for (const [code, status, expected] of cases) {
    it(`maps ${code} → ${expected}`, async () => {
      const get = vi.fn().mockRejectedValue(apiError(code, status));
      const repo = new AssessmentSchemeRepository(makeHttp({ get }));

      const res = await repo.getGradeScale();

      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.type).toBe(expected);
    });
  }
});
