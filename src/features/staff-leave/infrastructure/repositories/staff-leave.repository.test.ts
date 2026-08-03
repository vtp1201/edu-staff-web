/**
 * Unit tests — StaffLeaveRepository (US-E09.3 / US-E18.8 / UN-MOCKED US-E18.36).
 *
 * The real contract was ground-truthed against
 * `edu-api/services/core/docs/openapi.yaml`
 * `/api/v1/conduct/staff-leave-requests*` (US-149 tenant-wide list + US-170
 * `department`/`leaveType`) + Go source
 * (`internal/conduct/core/domain/error/leave.go`, `pkg/kit/response/error.go`).
 *
 * The tenant-wide branch is selected by OMITTING `staffMemberId`; it is
 * `status`-sliced and defaults to `SUBMITTED`, so an unfiltered load must fan
 * out over all three states — proven below by call COUNT and params, not by
 * the merged output alone.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { MemberSummary } from "@/features/iam-directory/domain/entities/member-summary.entity";
import type { StaffLeaveResponseDto } from "../dtos/staff-leave-response.dto";
import { StaffLeaveRepository, toFailure } from "./staff-leave.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function envelope(
  data: StaffLeaveResponseDto[],
  pagination?: { nextCursor: string | null; hasMore: boolean },
) {
  return {
    success: true,
    data,
    error: null,
    meta: { requestId: "req-x", timestamp: "now", pagination },
  };
}

function row(over: Partial<StaffLeaveResponseDto> = {}): StaffLeaveResponseDto {
  return {
    requestId: "req-1",
    staffMemberId: "mem-1",
    startDate: "2026-05-03",
    endDate: "2026-05-03",
    reason: "Khám sức khoẻ",
    state: "SUBMITTED",
    selfApproved: false,
    leaveType: "SICK",
    department: "Tổ Toán",
    createdAt: "2026-04-29T09:10:00Z",
    updatedAt: "2026-04-29T09:10:00Z",
    ...over,
  };
}

function makeHttp(get = vi.fn(), post = vi.fn()): AxiosInstance {
  return {
    get,
    post,
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as AxiosInstance;
}

const resolverOf = (rows: MemberSummary[]) =>
  vi.fn().mockResolvedValue({ ok: true, value: rows });

describe("toFailure — ground-truthed core error matrix (US-E18.8)", () => {
  it("maps NETWORK_ERROR → network-error", () => {
    expect(toFailure(apiError("NETWORK_ERROR", 0), "list").type).toBe(
      "network-error",
    );
  });

  it("maps LEAVE_REQUEST_NOT_FOUND (404) → not-found", () => {
    expect(
      toFailure(apiError("LEAVE_REQUEST_NOT_FOUND", 404), "approve").type,
    ).toBe("not-found");
  });

  it("maps VIOLATION_FORBIDDEN (403, real code for list/approve/reject) → forbidden", () => {
    expect(toFailure(apiError("VIOLATION_FORBIDDEN", 403), "list").type).toBe(
      "forbidden",
    );
  });

  it("also maps LEAVE_REQUEST_FORBIDDEN (403, submit-only path this repo never calls) → forbidden", () => {
    expect(
      toFailure(apiError("LEAVE_REQUEST_FORBIDDEN", 403), "approve").type,
    ).toBe("forbidden");
  });

  it("maps VIOLATION_SAME_ACTOR (409, ADR 0073 distinct-actor rule) → same-actor", () => {
    expect(
      toFailure(apiError("VIOLATION_SAME_ACTOR", 409), "approve").type,
    ).toBe("same-actor");
  });

  it("maps VIOLATION_INVALID_TRANSITION (409) → already-processed", () => {
    expect(
      toFailure(apiError("VIOLATION_INVALID_TRANSITION", 409), "approve").type,
    ).toBe("already-processed");
  });

  it("maps VIOLATION_REJECTION_REASON_REQUIRED (422) → missing-reject-reason", () => {
    expect(
      toFailure(apiError("VIOLATION_REJECTION_REASON_REQUIRED", 422), "reject")
        .type,
    ).toBe("missing-reject-reason");
  });

  it("falls back to network-error for an unrecognised code", () => {
    expect(toFailure(apiError("SOMETHING_UNKNOWN", 500), "list").type).toBe(
      "network-error",
    );
  });
});

/**
 * `LEAVE_REQUEST_INVALID_INPUT` is emitted by TWO different endpoints with two
 * unrelated meanings (core `ERROR_CODES.md`, US-075 + US-149 tables):
 *   • reject (422) — `reason` empty / `leaveType` unrecognised on the domain path
 *   • list   (400) — the `cursor` query param is not a token this branch issued
 * A single unconditional mapping would show "Lý do từ chối phải có ít nhất 10
 * ký tự" on a paging failure. Hence the call-site discriminator.
 */
describe("toFailure — call-site scoping of the ambiguous 400/422 codes", () => {
  it("maps LEAVE_REQUEST_INVALID_INPUT (422) → reason-too-short ONLY on reject", () => {
    expect(
      toFailure(apiError("LEAVE_REQUEST_INVALID_INPUT", 422), "reject").type,
    ).toBe("reason-too-short");
  });

  it("maps the SAME code on the list path (400 bad cursor) → invalid-request, never reason-too-short", () => {
    const failure = toFailure(
      apiError("LEAVE_REQUEST_INVALID_INPUT", 400),
      "list",
    );
    expect(failure.type).toBe("invalid-request");
    expect(failure.type).not.toBe("reason-too-short");
  });

  it("maps the same code on approve (no rejection reason exists there) → invalid-request", () => {
    expect(
      toFailure(apiError("LEAVE_REQUEST_INVALID_INPUT", 422), "approve").type,
    ).toBe("invalid-request");
  });

  it.each([
    "list",
    "approve",
    "reject",
  ] as const)("maps VIOLATION_INVALID_STATE (400) → invalid-request on %s (NOT the retryable network-error bucket)", (callSite) => {
    const failure = toFailure(
      apiError("VIOLATION_INVALID_STATE", 400),
      callSite,
    );
    expect(failure.type).toBe("invalid-request");
    expect(failure.type).not.toBe("network-error");
  });
});

describe("StaffLeaveRepository.listRequests — tenant-wide fan-out (US-149)", () => {
  it("fans out over all three states when unfiltered, always omitting staffMemberId", async () => {
    const get = vi.fn().mockResolvedValue(envelope([]));
    const repo = new StaffLeaveRepository(makeHttp(get));

    await repo.listRequests();

    expect(get).toHaveBeenCalledTimes(3);
    const states = get.mock.calls.map((c) => c[1].params.status);
    expect(states).toEqual(["SUBMITTED", "APPROVED", "REJECTED"]);
    for (const call of get.mock.calls) {
      expect(call[0]).toBe("/core/api/v1/conduct/staff-leave-requests");
      expect(call[1].raw).toBe(true);
      // Omitting staffMemberId IS what selects the tenant-wide branch.
      expect(call[1].params).not.toHaveProperty("staffMemberId");
    }
  });

  it("issues exactly ONE call for a status-filtered load (domain → wire state)", async () => {
    const get = vi.fn().mockResolvedValue(envelope([]));
    const repo = new StaffLeaveRepository(makeHttp(get));

    await repo.listRequests({ status: "pending" });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][1].params.status).toBe("SUBMITTED");
  });

  it("follows nextCursor within a state slice until hasMore is false", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        envelope([row({ requestId: "a" })], {
          nextCursor: "c1",
          hasMore: true,
        }),
      )
      .mockResolvedValueOnce(
        envelope([row({ requestId: "b" })], {
          nextCursor: null,
          hasMore: false,
        }),
      );
    const repo = new StaffLeaveRepository(makeHttp(get));

    const res = await repo.listRequests({ status: "pending" });

    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[1][1].params.cursor).toBe("c1");
    expect(res.ok && res.value.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("merges the three slices newest-first by createdAt", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        envelope([row({ requestId: "s", createdAt: "2026-04-10T00:00:00Z" })]),
      )
      .mockResolvedValueOnce(
        envelope([
          row({
            requestId: "a",
            state: "APPROVED",
            createdAt: "2026-04-30T00:00:00Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(
        envelope([
          row({
            requestId: "r",
            state: "REJECTED",
            createdAt: "2026-04-20T00:00:00Z",
          }),
        ]),
      );
    const repo = new StaffLeaveRepository(makeHttp(get));

    const res = await repo.listRequests();

    expect(res.ok && res.value.map((r) => r.id)).toEqual(["a", "r", "s"]);
  });

  it("resolves staff AND approver names in ONE batch call for the whole list", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(envelope([row({ requestId: "s1" })]))
      .mockResolvedValueOnce(
        envelope([
          row({
            requestId: "s2",
            state: "APPROVED",
            approverMemberId: "mem-9",
            createdAt: "2026-04-28T00:00:00Z",
          }),
        ]),
      )
      .mockResolvedValueOnce(envelope([]));
    const resolve = resolverOf([
      {
        memberId: "mem-1",
        displayName: "Nguyễn Thị Hương",
        roles: ["TEACHER"],
      },
      { memberId: "mem-9", displayName: "Trần Minh Quân", roles: ["ADMIN"] },
    ]);
    const repo = new StaffLeaveRepository(makeHttp(get), resolve);

    const res = await repo.listRequests();

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve.mock.calls[0][0]).toEqual(["mem-1", "mem-1", "mem-9"]);
    expect(res.ok && res.value[0].staffName).toBe("Nguyễn Thị Hương");
    expect(res.ok && res.value[1].approvedBy).toBe("Trần Minh Quân");
  });

  it("surfaces the two US-170 nulls as nulls (no invented department/leaveType)", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(
        envelope([row({ leaveType: null, department: null })]),
      )
      .mockResolvedValue(envelope([]));
    const repo = new StaffLeaveRepository(makeHttp(get));

    const res = await repo.listRequests();

    expect(res.ok && res.value[0].leaveType).toBeNull();
    expect(res.ok && res.value[0].department).toBeNull();
  });

  it("degrades to raw ids (never an error) when the IAM lookup fails", async () => {
    const get = vi.fn().mockResolvedValue(envelope([row()]));
    const resolve = vi
      .fn()
      .mockResolvedValue({ ok: false, failure: { type: "network-error" } });
    const repo = new StaffLeaveRepository(makeHttp(get), resolve);

    const res = await repo.listRequests();

    expect(res.ok).toBe(true);
    expect(res.ok && res.value[0].staffName).toBe("mem-1");
    expect(res.ok && res.value[0].staffRole).toBeNull();
  });

  it("maps a 403 on the tenant-wide branch to forbidden", async () => {
    const get = vi.fn().mockRejectedValue(apiError("VIOLATION_FORBIDDEN", 403));
    const repo = new StaffLeaveRepository(makeHttp(get));

    const res = await repo.listRequests();

    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("maps a bad-cursor 400 to invalid-request, not to the reject-only reason copy", async () => {
    const get = vi
      .fn()
      .mockRejectedValue(apiError("LEAVE_REQUEST_INVALID_INPUT", 400));
    const repo = new StaffLeaveRepository(makeHttp(get));

    expect(await repo.listRequests()).toEqual({
      ok: false,
      error: { type: "invalid-request" },
    });
  });

  it("skips the IAM lookup entirely when the list is empty", async () => {
    const get = vi.fn().mockResolvedValue(envelope([]));
    const resolve = resolverOf([]);
    const repo = new StaffLeaveRepository(makeHttp(get), resolve);

    await repo.listRequests();

    expect(resolve).not.toHaveBeenCalled();
  });
});

describe("StaffLeaveRepository — approve / reject (by-id routes)", () => {
  it("approve POSTs with the MANDATORY staffMemberId query param", async () => {
    const post = vi.fn().mockResolvedValue({});
    const repo = new StaffLeaveRepository(makeHttp(vi.fn(), post));

    const res = await repo.approve("req-1", "mem-1");

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/conduct/staff-leave-requests/req-1/approve",
      undefined,
      { params: { staffMemberId: "mem-1" } },
    );
  });

  it("reject POSTs `rejectionReason` (not `reason`) plus the staffMemberId param", async () => {
    const post = vi.fn().mockResolvedValue({});
    const repo = new StaffLeaveRepository(makeHttp(vi.fn(), post));

    const res = await repo.reject("req-1", "mem-1", "Trùng lịch hội nghị.");

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith(
      "/core/api/v1/conduct/staff-leave-requests/req-1/reject",
      { rejectionReason: "Trùng lịch hội nghị." },
      { params: { staffMemberId: "mem-1" } },
    );
  });

  it("maps the ADR 0073 distinct-actor 409 on approve to same-actor", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("VIOLATION_SAME_ACTOR", 409));
    const repo = new StaffLeaveRepository(makeHttp(vi.fn(), post));

    expect(await repo.approve("req-1", "mem-1")).toEqual({
      ok: false,
      error: { type: "same-actor" },
    });
  });

  it("maps an empty-reason 422 on reject to reason-too-short (the reject-scoped meaning)", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("LEAVE_REQUEST_INVALID_INPUT", 422));
    const repo = new StaffLeaveRepository(makeHttp(vi.fn(), post));

    expect(await repo.reject("req-1", "mem-1", "x")).toEqual({
      ok: false,
      error: { type: "reason-too-short" },
    });
  });

  it("maps the domain-backstop VIOLATION_INVALID_STATE on approve to a non-retryable invalid-request", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("VIOLATION_INVALID_STATE", 400));
    const repo = new StaffLeaveRepository(makeHttp(vi.fn(), post));

    expect(await repo.approve("req-1", "mem-1")).toEqual({
      ok: false,
      error: { type: "invalid-request" },
    });
  });

  it("maps an invalid transition on reject to already-processed", async () => {
    const post = vi
      .fn()
      .mockRejectedValue(apiError("VIOLATION_INVALID_TRANSITION", 409));
    const repo = new StaffLeaveRepository(makeHttp(vi.fn(), post));

    expect(await repo.reject("req-1", "mem-1", "Lý do đủ dài")).toEqual({
      ok: false,
      error: { type: "already-processed" },
    });
  });
});
