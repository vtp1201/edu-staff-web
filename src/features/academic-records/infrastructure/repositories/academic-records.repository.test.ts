/**
 * Unit tests — `AcademicRecordsRepository` (US-E18.21, ADR 0055 §Context #6).
 *
 * The viewer repository is a PERMANENT blocked stub: the real
 * `AcademicRecordResponse` is keyed by `(classId, termId, studentMemberId)`
 * with a dynamic `gradeSnapshot` column array — it cannot serve this feature's
 * `(studentId, yearId?)` year-grouped tx1/tx2/giuaKy/cuoiKy model. These tests
 * are the dormant-method guard (same style as
 * `academic-records-seal.repository.test.ts`): every method must resolve a
 * deterministic blocked failure WITHOUT ever touching the injected http client,
 * so flipping `NEXT_PUBLIC_USE_MOCK=false` can never fire a 404-ing real call.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AxiosInstance } from "axios";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import {
  AcademicRecordsRepository,
  toFailure,
} from "./academic-records.repository";

function makeSpyHttp() {
  const get = vi.fn(async () => {
    throw new Error("the blocked stub must never perform an HTTP call");
  });
  return { http: { get } as unknown as AxiosInstance, get };
}

describe("AcademicRecordsRepository — permanent blocked stub", () => {
  it("getRecord resolves a blocked failure without calling http.get", async () => {
    const { http, get } = makeSpyHttp();
    const repo = new AcademicRecordsRepository(http);

    await expect(repo.getRecord("student-1")).resolves.toEqual({
      ok: false,
      error: { type: "network-error" },
    });
    await expect(repo.getRecord("student-1", "2025-2026")).resolves.toEqual({
      ok: false,
      error: { type: "network-error" },
    });
    expect(get).not.toHaveBeenCalled();
  });

  it("listYears resolves a blocked failure without calling http.get", async () => {
    const { http, get } = makeSpyHttp();
    const repo = new AcademicRecordsRepository(http);

    await expect(repo.listYears("student-1")).resolves.toEqual({
      ok: false,
      error: { type: "network-error" },
    });
    expect(get).not.toHaveBeenCalled();
  });
});

describe("toFailure — kept correct + tested for the day this unblocks", () => {
  function apiError(code: string, status: number) {
    return new ApiError({ code, message: code, retryable: false, status });
  }

  it.each([
    ["USER_NOT_FOUND", 404, "not-found"],
    ["RECORD_NOT_FOUND", 404, "not-found"],
    ["SOMETHING_ELSE", 404, "not-found"],
    ["FORBIDDEN", 403, "forbidden"],
    ["ANY_CODE", 403, "forbidden"],
    ["NETWORK_ERROR", 0, "network-error"],
    ["ACADEMIC_RECORD_WEIRD", 500, "unknown"],
  ])("maps %s/%d → %s", (code, status, type) => {
    expect(toFailure(apiError(code, status))).toEqual({ type });
  });
});
