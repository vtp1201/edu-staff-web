import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { AssessmentScheme } from "../../domain/entities/assessment-scheme.entity";
import { GRADE_SCALE_PRESETS } from "../../domain/entities/grade-scale.entity";
import type { AssessmentSchemeResponseDto } from "../dtos/assessment-scheme-response.dto";
import { AssessmentSchemeRepository } from "./assessment-scheme.repository";

// The http interceptor unwraps the success envelope (US-E06.1): calls resolve to
// the payload directly and reject with a normalised ApiError.
function apiError(code: string, status = 400) {
  return new ApiError({ code, message: code, retryable: false, status });
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

  it("saveGradeScale PUTs the mapped request DTO (not the raw domain object)", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const repo = new AssessmentSchemeRepository(makeHttp({ put }));

    const res = await repo.saveGradeScale(GRADE_SCALE_PRESETS.SCALE_10);

    expect(res.ok).toBe(true);
    expect(put).toHaveBeenCalledWith("/core/api/v1/grade-scale", {
      scaleType: "HE_10",
      minValue: "0",
      maxValue: "10",
      effectiveFrom: GRADE_SCALE_PRESETS.SCALE_10.effectiveFrom,
    });
    // numeric scale must not send letterGrades / bands
    const body = put.mock.calls[0][1];
    expect(JSON.stringify(body)).not.toContain("letterGrades");
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
          { name: "TX", columnType: "TX", coefficient: 4, ordinal: 1 },
          { name: "CK", columnType: "CK", coefficient: 6, ordinal: 2 },
        ],
      },
    );
    const body = put.mock.calls[0][1];
    expect(JSON.stringify(body)).not.toContain("count");
    expect(JSON.stringify(body)).not.toContain("termId");
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
