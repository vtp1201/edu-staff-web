/**
 * Integration tests — AcademicRecordsSealRepository (US-E18.13 + US-E18.24 +
 * US-E18.43).
 *
 * SIX methods are wired REAL: `sealBatch` (US-E18.13); `getSealStatus`,
 * `getPendingUnsealRequests`, `initiateUnseal`, `confirmUnseal` (US-E18.24,
 * BE US-150); and `listSealedStudents` (US-E18.43, BE US-183). The http
 * interceptor unwraps the envelope; the repo receives the payload directly and a
 * normalised ApiError on failure — branch on error.code.
 * `listAvailableClasses`/`getSealAuditTrail`/`listTenantAdmins` stay permanently
 * dormant (`notImplemented`) — no BE endpoint exists (and none can exist for the
 * audit trail: no multi-cycle seal event log) — reached only via the mock through
 * the hybrid facade.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AxiosInstance } from "axios";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { MemberSummary } from "@/features/iam-directory/domain/entities/member-summary.entity";
import type { SealBatchKey } from "../../domain/entities/seal-batch.entity";
import type {
  SealAcademicRecordResponseDto,
  SealedStudentListItemDto,
} from "../dtos/seal-response.dto";
import type {
  ApproveUnsealResponseDto,
  SealStatusResponseDto,
  UnsealRequestListItemDto,
} from "../dtos/unseal-response.dto";
import { AcademicRecordsSealRepository } from "./academic-records-seal.repository";

const KEY: SealBatchKey = { classId: "12C1", term: "HK1", year: "2025-2026" };

function makeHttp(parts: Partial<AxiosInstance>) {
  return parts as unknown as AxiosInstance;
}

function postHttp(post: AxiosInstance["post"]) {
  return makeHttp({ post });
}

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function envelope<T>(data: T, pagination?: unknown) {
  return {
    success: true,
    data,
    error: null,
    meta: {
      requestId: "req-1",
      timestamp: "t",
      ...(pagination ? { pagination } : {}),
    },
  };
}

function member(memberId: string, displayName: string): MemberSummary {
  return { memberId, displayName, email: `${memberId}@e.vn`, roles: [] };
}

describe("AcademicRecordsSealRepository.sealBatch", () => {
  it("posts to the real class/term path with NO request body and maps the result", async () => {
    const payload: SealAcademicRecordResponseDto = {
      sealedCount: 5,
      failedCount: 0,
    };
    const post = vi.fn(async () => payload) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

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
    const repo = new AcademicRecordsSealRepository(postHttp(post));

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
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    const res = await repo.sealBatch(KEY, "admin-1");
    expect(res).toEqual({ ok: false, error: { type: expected } });
  });

  it("maps a bare 5xx (no code) → network-error", async () => {
    const post = vi.fn(async () => {
      throw apiError("UNKNOWN_ERROR", 503);
    }) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    const res = await repo.sealBatch(KEY, "admin-1");
    expect(res).toEqual({ ok: false, error: { type: "network-error" } });
  });

  it("keeps the three no-BE-endpoint methods dormant (notImplemented)", () => {
    const repo = new AcademicRecordsSealRepository(
      postHttp(vi.fn() as unknown as AxiosInstance["post"]),
    );
    expect(() => repo.getSealAuditTrail()).toThrow("not-implemented");
    expect(() => repo.listTenantAdmins()).toThrow("not-implemented");
    expect(() =>
      repo.listAvailableClasses({ term: "HK1", year: "2025-2026" }),
    ).toThrow("not-implemented");
    // `listSealedStudents` is NO LONGER dormant (US-E18.43 / BE US-183) — see
    // its own describe below.
  });
});

describe("AcademicRecordsSealRepository.listSealedStudents (US-E18.43, BE US-183)", () => {
  const ROW: SealedStudentListItemDto = {
    studentMemberId: "m-student-1",
    sealedAt: "2026-01-15T14:32:00.000Z",
    sealedBy: "m-admin",
    resealCount: 0,
  };

  it("GETs the real class/term path (unpaginated — no params, no raw flag)", async () => {
    const get = vi.fn(async () => [ROW]) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    const res = await repo.listSealedStudents(KEY);

    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/classes/12C1/terms/HK1/academic-records/sealed-students",
    );
    expect(get).toHaveBeenCalledTimes(1);
    expect(res.ok).toBe(true);
  });

  it("maps the key-less rows into SealedStudentOption using the caller's key", async () => {
    const get = vi.fn(async () => [ROW]) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(
      makeHttp({ get }),
      async () => ({
        ok: true,
        value: [member("m-student-1", "Lê Hoàng Nhật")],
      }),
    );

    const res = await repo.listSealedStudents(KEY);

    expect(res).toEqual({
      ok: true,
      data: [
        {
          studentId: "m-student-1",
          studentName: "Lê Hoàng Nhật",
          classId: "12C1",
          term: "HK1",
          year: "2025-2026",
          sealedAt: "2026-01-15T14:32:00.000Z",
        },
      ],
    });
  });

  it("resolves every student name in ONE deduped batch call", async () => {
    const rows = [ROW, { ...ROW, studentMemberId: "m-student-2" }, ROW];
    const get = vi.fn(async () => rows) as unknown as AxiosInstance["get"];
    const calls: string[][] = [];
    const repo = new AcademicRecordsSealRepository(
      makeHttp({ get }),
      async (ids) => {
        calls.push(ids);
        return { ok: true, value: [] };
      },
    );

    await repo.listSealedStudents(KEY);

    expect(calls).toHaveLength(1);
    expect([...calls[0]].sort()).toEqual(["m-student-1", "m-student-2"]);
  });

  it("degrades to raw ids when the resolver fails — never an error", async () => {
    const get = vi.fn(async () => [ROW]) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(
      makeHttp({ get }),
      async () => ({ ok: false, failure: { type: "network-error" } }),
    );

    const res = await repo.listSealedStudents(KEY);

    expect(res.ok).toBe(true);
    expect(res.ok && res.data[0].studentName).toBe("m-student-1");
  });

  it("keeps a nullable wire sealedAt as null", async () => {
    const get = vi.fn(async () => [
      { ...ROW, sealedAt: null, sealedBy: null },
    ]) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    const res = await repo.listSealedStudents(KEY);
    expect(res.ok && res.data[0].sealedAt).toBeNull();
  });

  it("skips the name lookup entirely when no student is sealed", async () => {
    const get = vi.fn(async () => []) as unknown as AxiosInstance["get"];
    const resolve = vi.fn(async () => ({ ok: true as const, value: [] }));
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }), resolve);

    expect(await repo.listSealedStudents(KEY)).toEqual({ ok: true, data: [] });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    [undefined],
    [{ classId: "12C1" }],
    [{ term: "HK1" as const }],
  ] as const)("returns not-found WITHOUT any HTTP call when the key is incomplete (%o)", async (filter) => {
    const get = vi.fn(async () => [ROW]) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    expect(await repo.listSealedStudents(filter)).toEqual({
      ok: false,
      error: { type: "not-found" },
    });
    expect(get).not.toHaveBeenCalled();
  });

  it.each([
    ["ACADEMIC_RECORD_FORBIDDEN", 403, "forbidden"],
    ["ACADEMIC_RECORD_NOT_FOUND", 404, "not-found"],
    ["UNKNOWN_ERROR", 503, "network-error"],
  ] as const)("maps %s → %s failure", async (code, status, expected) => {
    const get = vi.fn(async () => {
      throw apiError(code, status);
    }) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    expect(await repo.listSealedStudents(KEY)).toEqual({
      ok: false,
      error: { type: expected },
    });
  });
});

describe("AcademicRecordsSealRepository.getSealStatus (US-E18.24)", () => {
  const base: SealStatusResponseDto = {
    totalStudents: 10,
    sealedCount: 10,
    unsealedCount: 0,
    status: "SEALED",
    lastSealedAt: "2026-01-15T14:32:00.000Z",
    resealCount: 2,
  };

  it("GETs the real class/term seal-status path", async () => {
    const get = vi.fn(async () => base) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    await repo.getSealStatus(KEY);
    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/classes/12C1/terms/HK1/academic-records/seal-status",
    );
  });

  /** Truth table verbatim from the contract — all five documented shapes. */
  it.each([
    [
      "empty roster → PENDING",
      {
        totalStudents: 0,
        sealedCount: 0,
        unsealedCount: 0,
        status: "PENDING",
        lastSealedAt: null,
        resealCount: 0,
      },
    ],
    [
      "never sealed → PENDING with null lastSealedAt",
      {
        totalStudents: 8,
        sealedCount: 0,
        unsealedCount: 0,
        status: "PENDING",
        lastSealedAt: null,
        resealCount: 0,
      },
    ],
    [
      "sealed then fully unsealed → PENDING with non-null lastSealedAt",
      {
        totalStudents: 8,
        sealedCount: 0,
        unsealedCount: 8,
        status: "PENDING",
        lastSealedAt: "2026-01-15T14:32:00.000Z",
        resealCount: 1,
      },
    ],
    [
      "partly sealed → PARTIAL",
      {
        totalStudents: 8,
        sealedCount: 3,
        unsealedCount: 2,
        status: "PARTIAL",
        lastSealedAt: "2026-01-15T14:32:00.000Z",
        resealCount: 1,
      },
    ],
    [
      "fully sealed → SEALED",
      {
        totalStudents: 8,
        sealedCount: 8,
        unsealedCount: 0,
        status: "SEALED",
        lastSealedAt: "2026-01-15T14:32:00.000Z",
        resealCount: 4,
      },
    ],
  ] as [
    string,
    SealStatusResponseDto,
  ][])("maps %s 1:1 and re-attaches the batch key", async (_label, dto) => {
    const get = vi.fn(async () => dto) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    const res = await repo.getSealStatus(KEY);
    expect(res).toEqual({
      ok: true,
      data: {
        classId: "12C1",
        term: "HK1",
        year: "2025-2026",
        totalStudents: dto.totalStudents,
        sealedCount: dto.sealedCount,
        unsealedCount: dto.unsealedCount,
        status: dto.status,
        lastSealedAt: dto.lastSealedAt ?? null,
        resealCount: dto.resealCount,
      },
    });
  });

  it("normalises an absent lastSealedAt to null", async () => {
    const dto: SealStatusResponseDto = {
      totalStudents: 2,
      sealedCount: 0,
      unsealedCount: 0,
      status: "PENDING",
      resealCount: 0,
    };
    const get = vi.fn(async () => dto) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    const res = await repo.getSealStatus(KEY);
    expect(res.ok && res.data.lastSealedAt).toBeNull();
  });

  it("maps ACADEMIC_RECORD_FORBIDDEN → forbidden", async () => {
    const get = vi.fn(async () => {
      throw apiError("ACADEMIC_RECORD_FORBIDDEN", 403);
    }) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    expect(await repo.getSealStatus(KEY)).toEqual({
      ok: false,
      error: { type: "forbidden" },
    });
  });
});

describe("AcademicRecordsSealRepository.getPendingUnsealRequests (US-E18.24)", () => {
  const ROW: UnsealRequestListItemDto = {
    requestId: "ur-1",
    classId: "12C1",
    termId: "HK1",
    studentMemberId: "m-student",
    requestedBy: "m-admin",
    reason: "x".repeat(25),
    status: "PENDING",
    createdAt: "2026-02-19T10:22:00.000Z",
  };

  it("GETs with {raw:true} and reads meta.pagination, defaulting status to PENDING", async () => {
    const get = vi.fn(async () =>
      envelope([ROW], { nextCursor: "c2", hasMore: true }),
    ) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    const res = await repo.getPendingUnsealRequests("12C1", "HK1");

    expect(get).toHaveBeenCalledWith(
      "/core/api/v1/classes/12C1/terms/HK1/academic-records/unseal-requests",
      {
        params: { status: "PENDING", cursor: undefined, limit: undefined },
        raw: true,
      },
    );
    expect(res.ok && res.data.nextCursor).toBe("c2");
    expect(res.ok && res.data.hasMore).toBe(true);
  });

  it("forwards an explicit status/cursor/limit", async () => {
    const get = vi.fn(async () =>
      envelope([], { nextCursor: null, hasMore: false }),
    ) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    await repo.getPendingUnsealRequests("12C1", "HK1", {
      status: "APPROVED",
      cursor: "c1",
      limit: 50,
    });

    expect(get).toHaveBeenCalledWith(expect.any(String), {
      params: { status: "APPROVED", cursor: "c1", limit: 50 },
      raw: true,
    });
  });

  it("falls back to hasMore:false / nextCursor:null when meta.pagination is absent", async () => {
    const get = vi.fn(async () =>
      envelope([ROW]),
    ) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    const res = await repo.getPendingUnsealRequests("12C1", "HK1");
    expect(res.ok && res.data).toMatchObject({
      nextCursor: null,
      hasMore: false,
    });
  });

  it("resolves student + requester names in ONE deduped batch call", async () => {
    const rows: UnsealRequestListItemDto[] = [
      ROW,
      { ...ROW, requestId: "ur-2", studentMemberId: "m-s2" },
    ];
    const get = vi.fn(async () =>
      envelope(rows),
    ) as unknown as AxiosInstance["get"];
    const calls: string[][] = [];
    const repo = new AcademicRecordsSealRepository(
      makeHttp({ get }),
      async (ids) => {
        calls.push(ids);
        return {
          ok: true,
          value: [
            member("m-student", "Phạm Hữu Phúc"),
            member("m-s2", "Lê Hoàng Nhật"),
            member("m-admin", "Trần Minh Quân"),
          ],
        };
      },
    );

    const res = await repo.getPendingUnsealRequests("12C1", "HK1");

    expect(calls).toHaveLength(1);
    // `m-admin` appears on BOTH rows but is requested exactly once.
    expect([...calls[0]].sort()).toEqual(["m-admin", "m-s2", "m-student"]);
    expect(res.ok && res.data.items[0]).toMatchObject({
      requestId: "ur-1",
      studentName: "Phạm Hữu Phúc",
      requestedByName: "Trần Minh Quân",
    });
    expect(res.ok && res.data.items[1].studentName).toBe("Lê Hoàng Nhật");
  });

  it("falls back to the raw id when a name is unresolved (degraded, never an error)", async () => {
    const get = vi.fn(async () =>
      envelope([ROW]),
    ) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(
      makeHttp({ get }),
      async () => ({ ok: true, value: [member("m-student", "Phạm Hữu Phúc")] }),
    );

    const res = await repo.getPendingUnsealRequests("12C1", "HK1");
    expect(res.ok && res.data.items[0]).toMatchObject({
      studentName: "Phạm Hữu Phúc",
      requestedByName: "m-admin",
    });
  });

  it("still returns the list when the resolver itself fails (raw ids everywhere)", async () => {
    const get = vi.fn(async () =>
      envelope([ROW]),
    ) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(
      makeHttp({ get }),
      async () => ({ ok: false, failure: { type: "network-error" } }),
    );

    const res = await repo.getPendingUnsealRequests("12C1", "HK1");
    expect(res.ok).toBe(true);
    expect(res.ok && res.data.items[0]).toMatchObject({
      studentName: "m-student",
      requestedByName: "m-admin",
    });
  });

  it("resolves nothing (no HTTP name call) when the page is empty", async () => {
    const get = vi.fn(async () =>
      envelope([]),
    ) as unknown as AxiosInstance["get"];
    const resolve = vi.fn(async () => ({ ok: true as const, value: [] }));
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }), resolve);

    const res = await repo.getPendingUnsealRequests("12C1", "HK1");
    expect(res).toEqual({
      ok: true,
      data: { items: [], nextCursor: null, hasMore: false },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it.each([
    ["UNSEAL_REQUEST_INVALID_STATUS", 400, "unseal-request-invalid-status"],
    ["UNSEAL_REQUEST_INVALID_CURSOR", 400, "unseal-request-invalid-cursor"],
    ["ACADEMIC_RECORD_FORBIDDEN", 403, "forbidden"],
  ] as const)("maps %s → %s failure", async (code, status, expected) => {
    const get = vi.fn(async () => {
      throw apiError(code, status);
    }) as unknown as AxiosInstance["get"];
    const repo = new AcademicRecordsSealRepository(makeHttp({ get }));

    expect(await repo.getPendingUnsealRequests("12C1", "HK1")).toEqual({
      ok: false,
      error: { type: expected },
    });
  });
});

describe("AcademicRecordsSealRepository.initiateUnseal (US-E18.24)", () => {
  const INPUT = {
    studentId: "m-student",
    classId: "12C1",
    term: "HK1" as const,
    year: "2025-2026",
    reason: "x".repeat(25),
    initiatorId: "admin-1",
  };

  it("POSTs exactly {studentMemberId, reason} to the class/term path", async () => {
    const post = vi.fn(async () => ({
      requestId: "ur-9",
      status: "PENDING",
      createdAt: "2026-02-19T10:22:00.000Z",
    })) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    const res = await repo.initiateUnseal(INPUT);

    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/classes/12C1/terms/HK1/academic-records/unseal-requests",
      { studentMemberId: "m-student", reason: "x".repeat(25) },
    );
    expect(res).toEqual({
      ok: true,
      data: {
        requestId: "ur-9",
        status: "PENDING",
        createdAt: "2026-02-19T10:22:00.000Z",
      },
    });
  });

  it("trims the reason before sending (never ships padding as justification)", async () => {
    const post = vi.fn(async () => ({
      requestId: "ur-9",
      status: "PENDING",
      createdAt: "t",
    })) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    await repo.initiateUnseal({ ...INPUT, reason: `  ${"y".repeat(25)}  ` });
    expect(post).toHaveBeenCalledWith(expect.any(String), {
      studentMemberId: "m-student",
      reason: "y".repeat(25),
    });
  });

  it.each([
    ["UNSEAL_REASON_REQUIRED", 422, "reason-too-short"],
    ["ACADEMIC_RECORD_NOT_SEALED", 409, "not-sealed"],
    ["ACADEMIC_RECORD_ALREADY_SEALED", 409, "unknown"],
    ["ACADEMIC_RECORD_NOT_FOUND", 404, "not-found"],
  ] as const)("maps %s → %s failure", async (code, status, expected) => {
    const post = vi.fn(async () => {
      throw apiError(code, status);
    }) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    expect(await repo.initiateUnseal(INPUT)).toEqual({
      ok: false,
      error: { type: expected },
    });
  });
});

describe("AcademicRecordsSealRepository.confirmUnseal (US-E18.24)", () => {
  const APPROVED: ApproveUnsealResponseDto = {
    classId: "12C1",
    termId: "HK1",
    studentMemberId: "m-student",
    status: "UNSEALED",
    selfApproved: true,
    unsealedAt: "2026-02-20T09:00:00.000Z",
  };

  it("bare-POSTs the approve path (requestId path-param only, NO body)", async () => {
    const post = vi.fn(
      async () => APPROVED,
    ) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    const res = await repo.confirmUnseal("ur-1", "admin-2", "12C1", "HK1");

    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/academic-records/unseal-requests/ur-1/approve",
    );
    // coSignerId is NOT on the wire — the server derives the approver.
    expect(post).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      ok: true,
      data: {
        classId: "12C1",
        termId: "HK1",
        studentMemberId: "m-student",
        status: "UNSEALED",
        selfApproved: true,
        unsealedAt: "2026-02-20T09:00:00.000Z",
      },
    });
  });

  it("normalises an absent unsealedAt to null", async () => {
    const { unsealedAt: _drop, ...withoutTs } = APPROVED;
    const post = vi.fn(
      async () => withoutTs,
    ) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    const res = await repo.confirmUnseal("ur-1", "admin-2", "12C1", "HK1");
    expect(res.ok && res.data.unsealedAt).toBeNull();
  });

  it.each([
    ["UNSEAL_REQUEST_NOT_FOUND", 404, "no-pending-request"],
    ["UNSEAL_REQUEST_ALREADY_APPROVED", 409, "unseal-request-already-approved"],
    ["ACADEMIC_RECORD_FORBIDDEN", 403, "forbidden"],
  ] as const)("maps %s → %s failure", async (code, status, expected) => {
    const post = vi.fn(async () => {
      throw apiError(code, status);
    }) as unknown as AxiosInstance["post"];
    const repo = new AcademicRecordsSealRepository(postHttp(post));

    expect(await repo.confirmUnseal("ur-1", "admin-2", "12C1", "HK1")).toEqual({
      ok: false,
      error: { type: expected },
    });
  });
});
