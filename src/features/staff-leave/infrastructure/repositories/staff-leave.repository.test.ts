/**
 * Unit tests — StaffLeaveRepository (US-E09.3 / US-E18.8).
 *
 * The real contract was ground-truthed against
 * `edu-api/services/core/docs/openapi.yaml`
 * `/api/v1/conduct/staff-leave-requests*` + Go source
 * (`internal/conduct/core/domain/error/leave.go`,
 * `pkg/kit/response/error.go`) and found unwireable for this admin screen (no
 * tenant-wide list, zero display fields on the wire) — see the story packet
 * and the class doc comment. `toFailure` is kept correct + tested for the
 * day this unblocks; the three repository methods are permanent blocked
 * stubs that never call `http.*` (the DI factory force-mocks regardless of
 * `USE_MOCK` — see `staff-leave.di.ts`).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { StaffLeaveRepository, toFailure } from "./staff-leave.repository";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: code, retryable: false, status });
}

function makeHttp(): AxiosInstance {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as AxiosInstance;
}

describe("toFailure — ground-truthed core error matrix (US-E18.8)", () => {
  it("maps NETWORK_ERROR → network-error", () => {
    expect(toFailure(apiError("NETWORK_ERROR", 0)).type).toBe("network-error");
  });

  it("maps LEAVE_REQUEST_NOT_FOUND (404) → not-found", () => {
    expect(toFailure(apiError("LEAVE_REQUEST_NOT_FOUND", 404)).type).toBe(
      "not-found",
    );
  });

  it("maps VIOLATION_FORBIDDEN (403, real code for list/approve/reject) → forbidden", () => {
    expect(toFailure(apiError("VIOLATION_FORBIDDEN", 403)).type).toBe(
      "forbidden",
    );
  });

  it("also maps LEAVE_REQUEST_FORBIDDEN (403, submit-only path this repo never calls) → forbidden", () => {
    expect(toFailure(apiError("LEAVE_REQUEST_FORBIDDEN", 403)).type).toBe(
      "forbidden",
    );
  });

  it("maps VIOLATION_SAME_ACTOR (409, ADR 0073 distinct-actor rule) → same-actor", () => {
    expect(toFailure(apiError("VIOLATION_SAME_ACTOR", 409)).type).toBe(
      "same-actor",
    );
  });

  it("maps VIOLATION_INVALID_TRANSITION (409) → already-processed", () => {
    expect(toFailure(apiError("VIOLATION_INVALID_TRANSITION", 409)).type).toBe(
      "already-processed",
    );
  });

  it("maps VIOLATION_REJECTION_REASON_REQUIRED (422) → missing-reject-reason", () => {
    expect(
      toFailure(apiError("VIOLATION_REJECTION_REASON_REQUIRED", 422)).type,
    ).toBe("missing-reject-reason");
  });

  it("maps LEAVE_REQUEST_INVALID_INPUT (422) → reason-too-short", () => {
    expect(toFailure(apiError("LEAVE_REQUEST_INVALID_INPUT", 422)).type).toBe(
      "reason-too-short",
    );
  });

  it("falls back to network-error for an unrecognised code", () => {
    expect(toFailure(apiError("SOMETHING_UNKNOWN", 500)).type).toBe(
      "network-error",
    );
  });
});

describe("StaffLeaveRepository — permanent blocked stubs (US-E18.8)", () => {
  it("listRequests always fails without calling http.get (real repo never serves this — DI force-mocks)", async () => {
    const http = makeHttp();
    const repo = new StaffLeaveRepository(http);
    const res = await repo.listRequests();
    expect(res.ok).toBe(false);
    expect(http.get).not.toHaveBeenCalled();
  });

  it("approve always fails without calling http.post/put", async () => {
    const http = makeHttp();
    const repo = new StaffLeaveRepository(http);
    const res = await repo.approve("req-1");
    expect(res.ok).toBe(false);
    expect(http.post).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
  });

  it("reject always fails without calling http.post/put", async () => {
    const http = makeHttp();
    const repo = new StaffLeaveRepository(http);
    const res = await repo.reject("req-1", "some reason");
    expect(res.ok).toBe(false);
    expect(http.post).not.toHaveBeenCalled();
    expect(http.put).not.toHaveBeenCalled();
  });
});
