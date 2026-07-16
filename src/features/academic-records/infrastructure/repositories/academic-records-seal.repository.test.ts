/**
 * Integration tests — AcademicRecordsSealRepository (US-E18.13, ADR 0055).
 * Only `sealBatch` is wired REAL against
 * `POST /core/api/v1/classes/{classId}/terms/{termId}/academic-records/seal`
 * (bare POST, no body — the server derives the actor from the Bearer token).
 * The http interceptor unwraps the envelope; the repo receives the payload
 * directly and a normalised ApiError on failure — branch on error.code. Every
 * other method stays permanently dormant (`notImplemented`), reached only via
 * the mock through the hybrid facade.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AxiosInstance } from "axios";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { SealBatchKey } from "../../domain/entities/seal-batch.entity";
import type { SealAcademicRecordResponseDto } from "../dtos/seal-response.dto";
import { AcademicRecordsSealRepository } from "./academic-records-seal.repository";

const KEY: SealBatchKey = { classId: "12C1", term: "HK1", year: "2025-2026" };

function makeHttp(post: AxiosInstance["post"]) {
  return { post } as unknown as AxiosInstance;
}

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

describe("AcademicRecordsSealRepository.sealBatch", () => {
  it("posts to the real class/term path with NO request body and maps the result", async () => {
    const payload: SealAcademicRecordResponseDto = {
      sealedCount: 5,
      failedCount: 0,
    };
    const post = vi.fn(async () => payload) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(makeHttp(post));

    const res = await repo.sealBatch(KEY, "admin-1");

    expect(res).toEqual({
      ok: true,
      data: { sealedCount: 5, failedCount: 0, errors: [] },
    });
    // bare POST: exact class/term path, actorId NOT on the wire.
    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/classes/12C1/terms/HK1/academic-records/seal",
    );
  });

  it("defaults errors to [] and forwards a partial-failure count", async () => {
    const payload: SealAcademicRecordResponseDto = {
      sealedCount: 4,
      failedCount: 1,
      errors: ["s-9: điểm chưa khoá"],
    };
    const post = vi.fn(async () => payload) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(makeHttp(post));

    const res = await repo.sealBatch(KEY, "admin-1");
    expect(res).toEqual({
      ok: true,
      data: { sealedCount: 4, failedCount: 1, errors: ["s-9: điểm chưa khoá"] },
    });
  });

  it.each([
    ["ACADEMIC_RECORD_FORBIDDEN", 403, "forbidden"],
    ["ACADEMIC_RECORD_NOT_FOUND", 404, "not-found"],
    ["ACADEMIC_RECORD_UNLOCKED_GRADES_EXIST", 422, "unlocked-grades-exist"],
    ["ACADEMIC_RECORD_TOO_MANY_RESEALS", 422, "too-many-reseals"],
    ["NETWORK_ERROR", 0, "network-error"],
    ["SOMETHING_ELSE", 400, "unknown"],
  ] as const)("maps %s → %s failure", async (code, status, expected) => {
    const post = vi.fn(async () => {
      throw apiError(code, status);
    }) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(makeHttp(post));

    const res = await repo.sealBatch(KEY, "admin-1");
    expect(res).toEqual({ ok: false, error: { type: expected } });
  });

  it("maps a bare 5xx (no code) → network-error", async () => {
    const post = vi.fn(async () => {
      throw apiError("UNKNOWN_ERROR", 503);
    }) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(makeHttp(post));

    const res = await repo.sealBatch(KEY, "admin-1");
    expect(res).toEqual({ ok: false, error: { type: "network-error" } });
  });

  it("keeps every other method dormant (notImplemented) — proves the class isn't fully real", () => {
    const repo = new AcademicRecordsSealRepository(
      makeHttp(vi.fn() as unknown as AxiosInstance["post"]),
    );
    expect(() => repo.getSealAuditTrail()).toThrow("not-implemented");
    expect(() =>
      repo.getSealStatus({ classId: "x", term: "HK1", year: "y" }),
    ).toThrow("not-implemented");
  });
});
