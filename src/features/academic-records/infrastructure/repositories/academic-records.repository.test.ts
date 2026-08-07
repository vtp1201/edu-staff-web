/**
 * Unit tests — `AcademicRecordsRepository` (US-E18.54).
 *
 * The viewer was a PERMANENT blocked stub since US-E18.21 (the entity shape
 * assumed a year-keyed contract that never existed). BE's 2026-08-07 answer
 * unblocked it: `GET /members/{memberId}/academic-records` (BE US-064) returns
 * every `(classId, termId)` record, and the year dimension is derived
 * client-side. These tests pin the wire call, the deduped year join, the
 * honest degrade when that join cannot resolve, and the failure mapping.
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

  it("passes the DISTINCT classIds (deduped) and the wire studentMemberId to the year resolver", async () => {
    const { http } = makeHttp({
      studentMemberId: "stu-wire",
      records: [
        row({ classId: "c-9", termId: "HK1" }),
        row({ classId: "c-9", termId: "HK2" }),
        row({ classId: "c-10", termId: "HK1" }),
      ],
    });
    const resolveYears = vi.fn(async () => new Map([["c-9", "2024-2025"]]));

    await new AcademicRecordsRepository(http, resolveYears).getRecords("stu-1");

    expect(resolveYears).toHaveBeenCalledTimes(1);
    expect(resolveYears).toHaveBeenCalledWith(["c-9", "c-10"], "stu-wire");
  });

  it("groups the flat records into the derived year view", async () => {
    const { http } = makeHttp({
      studentMemberId: "stu-1",
      records: [
        row({ classId: "c-9", termId: "HK1" }),
        row({ classId: "c-9", termId: "HK2" }),
        row({ classId: "c-10", termId: "HK1" }),
      ],
    });
    const resolveYears = async () =>
      new Map([
        ["c-9", "2024-2025"],
        ["c-10", "2025-2026"],
      ]);

    const result = await new AcademicRecordsRepository(
      http,
      resolveYears,
    ).getRecords("stu-1");

    if (!result.ok) throw new Error("expected ok");
    expect(result.data.studentMemberId).toBe("stu-1");
    expect(result.data.years.map((y) => y.yearId)).toEqual([
      "2024-2025",
      "2025-2026",
    ]);
    expect(result.data.years[0].terms).toHaveLength(2);
  });

  it("degrades to the unresolved-year bucket (never fails, never fabricates) when NO resolver is injected", async () => {
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

  it("does not call the year resolver when the student has no records", async () => {
    const { http } = makeHttp({ studentMemberId: "stu-1", records: [] });
    const resolveYears = vi.fn(async () => new Map<string, string>());

    const result = await new AcademicRecordsRepository(
      http,
      resolveYears,
    ).getRecords("stu-1");

    expect(resolveYears).not.toHaveBeenCalled();
    if (!result.ok) throw new Error("expected ok");
    expect(result.data.years).toEqual([]);
    expect(result.data.sealed).toBe(false);
  });

  it("resolves subject names through the injected catalogue collaborator", async () => {
    const { http } = makeHttp({ studentMemberId: "stu-1", records: [row()] });
    const resolveSubjectNames = vi.fn(
      async () => new Map([["s-math", "Toán"]]),
    );

    const result = await new AcademicRecordsRepository(
      http,
      undefined,
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
