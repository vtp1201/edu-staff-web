/**
 * Unit tests — `AcademicRecordsRepository` (US-E18.54).
 *
 * The viewer was a PERMANENT blocked stub since US-E18.21 (the entity shape
 * assumed a year-keyed contract that never existed). BE's 2026-08-07 answer
 * unblocked it: `GET /members/{memberId}/academic-records` (BE US-064) returns
 * every `(classId, termId)` record. US-E18.56 then removed the enrollment
 * fan-out that used to resolve the year per classId — BE denormalized
 * `academicYear` onto every row (ask #47) — so these tests pin the SINGLE wire
 * call, the grouping straight off that field, the honest degrade when the field
 * is absent (an unhealed pre-migration row), and the failure mapping.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AxiosInstance } from "axios";
import { ACADEMIC_RECORDS_EP } from "@/bootstrap/endpoint/academic-records.endpoint";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { UNRESOLVED_YEAR_ID } from "../../domain/entities/academic-record.entity";
import type {
  AcademicRecordRowDto,
  ListStudentAcademicRecordsResponseDto,
} from "../dtos/academic-record-response.dto";
import {
  AcademicRecordsRepository,
  toFailure,
} from "./academic-records.repository";

function row(over: Partial<AcademicRecordRowDto> = {}): AcademicRecordRowDto {
  return {
    classId: "c-10a1",
    termId: "HK1",
    studentMemberId: "stu-1",
    status: "SEALED",
    gradeSnapshot: [
      {
        subjectId: "s-math",
        columnId: "col-1",
        columnName: "TX1",
        columnType: "REGULAR",
        coefficient: "1.0",
        value: "8.0",
      },
    ],
    termAverage: "8.00",
    resealCount: 0,
    ...over,
  };
}

function makeHttp(payload: ListStudentAcademicRecordsResponseDto) {
  const get = vi.fn(async () => payload);
  return { http: { get } as unknown as AxiosInstance, get };
}

describe("AcademicRecordsRepository.getRecords", () => {
  it("reads the member-scoped endpoint once (unpaginated, no raw flag)", async () => {
    const { http, get } = makeHttp({
      studentMemberId: "stu-1",
      records: [row()],
    });

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(
      ACADEMIC_RECORDS_EP.memberRecords("stu-1"),
    );
    expect(result.ok).toBe(true);
  });

  it("issues NO per-class enrollment read any more — one call total, whatever the class count (US-E18.56)", async () => {
    const { http, get } = makeHttp({
      studentMemberId: "stu-wire",
      records: [
        row({ classId: "c-9", termId: "HK1", academicYear: "2024-2025" }),
        row({ classId: "c-9", termId: "HK2", academicYear: "2024-2025" }),
        row({ classId: "c-10", termId: "HK1", academicYear: "2025-2026" }),
      ],
    });

    await new AcademicRecordsRepository(http).getRecords("stu-1");

    expect(get).toHaveBeenCalledTimes(1);
  });

  it("groups the flat records into the derived year view using the wire academicYear", async () => {
    const { http } = makeHttp({
      studentMemberId: "stu-1",
      records: [
        row({ classId: "c-9", termId: "HK1", academicYear: "2024-2025" }),
        row({ classId: "c-9", termId: "HK2", academicYear: "2024-2025" }),
        row({ classId: "c-10", termId: "HK1", academicYear: "2025-2026" }),
      ],
    });

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.data.studentMemberId).toBe("stu-1");
    expect(result.data.years.map((y) => y.yearId)).toEqual([
      "2024-2025",
      "2025-2026",
    ]);
    expect(result.data.years[0].terms).toHaveLength(2);
  });

  it("degrades to the unresolved-year bucket (never fails, never fabricates) when the wire omits academicYear", async () => {
    const { http } = makeHttp({ studentMemberId: "stu-1", records: [row()] });

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.data.years).toHaveLength(1);
    expect(result.data.years[0].yearId).toBe(UNRESOLVED_YEAR_ID);
    expect(result.data.years[0].yearLabel).toBeNull();
    expect(result.data.years[0].terms).toHaveLength(1);
  });

  it("returns an empty year list — and still exactly one call — when the student has no records", async () => {
    const { http, get } = makeHttp({ studentMemberId: "stu-1", records: [] });

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    expect(get).toHaveBeenCalledTimes(1);
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.years).toEqual([]);
    expect(result.data.sealed).toBe(false);
  });

  /**
   * US-E18.57 regression guard (BE ADR 0136, ask #48). The TEACHER read is now
   * homeroom-SCOPED, not all-or-nothing: BE narrows `records[]` to the classes
   * the caller is the current GVCN of, and a teacher with ZERO homeroom overlap
   * gets `200 { records: [] }` — explicitly NOT a 403. A "no rows means the
   * caller isn't allowed, so fail" shortcut anywhere in this repository would
   * turn that into the forbidden alert and lie to the teacher; pin the
   * success-with-empty contract so it cannot be reintroduced.
   */
  it("treats BE's homeroom-filtered-to-EMPTY response as SUCCESS, never a forbidden failure", async () => {
    const { http } = makeHttp({ studentMemberId: "stu-1", records: [] });

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    expect(result).toEqual({
      ok: true,
      data: { studentMemberId: "stu-1", years: [], sealed: false },
    });
  });

  it("resolves subject names through the injected catalogue collaborator", async () => {
    const { http } = makeHttp({ studentMemberId: "stu-1", records: [row()] });
    const resolveSubjectNames = vi.fn(
      async () => new Map([["s-math", "Toán"]]),
    );

    const result = await new AcademicRecordsRepository(
      http,
      resolveSubjectNames,
    ).getRecords("stu-1");

    if (!result.ok) throw new Error("expected ok");
    expect(result.data.years[0].terms[0].subjects[0].subjectName).toBe("Toán");
    expect(resolveSubjectNames).toHaveBeenCalledTimes(1);
  });

  it("keeps a null subject name when no catalogue collaborator is injected", async () => {
    const { http } = makeHttp({ studentMemberId: "stu-1", records: [row()] });

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.data.years[0].terms[0].subjects[0].subjectName).toBeNull();
  });

  it("tolerates a missing records array", async () => {
    const { http } = makeHttp({
      studentMemberId: "stu-1",
    } as ListStudentAcademicRecordsResponseDto);

    const result = await new AcademicRecordsRepository(http).getRecords(
      "stu-1",
    );

    if (!result.ok) throw new Error("expected ok");
    expect(result.data.years).toEqual([]);
  });

  it("maps a wire error to the failure union", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "ACADEMIC_RECORD_FORBIDDEN",
        message: "forbidden",
        retryable: false,
        status: 403,
      });
    });

    const result = await new AcademicRecordsRepository({
      get,
    } as unknown as AxiosInstance).getRecords("stu-1");

    expect(result).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});

describe("toFailure", () => {
  function apiError(code: string, status: number) {
    return new ApiError({ code, message: code, retryable: false, status });
  }

  it.each([
    ["ACADEMIC_RECORD_NOT_FOUND", 404, "not-found"],
    ["USER_NOT_FOUND", 404, "not-found"],
    ["SOMETHING_ELSE", 404, "not-found"],
    ["ACADEMIC_RECORD_FORBIDDEN", 403, "forbidden"],
    ["ROSTER_ACCESS_FORBIDDEN", 403, "forbidden"],
    ["NETWORK_ERROR", 0, "network-error"],
    ["ANYTHING", 503, "network-error"],
    ["ACADEMIC_RECORD_WEIRD", 400, "unknown"],
  ])("maps %s/%d → %s", (code, status, type) => {
    expect(toFailure(apiError(code, status))).toEqual({ type });
  });
});
