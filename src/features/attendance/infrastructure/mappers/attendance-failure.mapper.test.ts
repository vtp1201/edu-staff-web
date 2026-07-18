import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { toAttendanceFailure } from "./attendance-failure.mapper";

function apiError(code: string, status: number, retryable = false) {
  return new ApiError({ code, message: "x", retryable, status });
}

describe("toAttendanceFailure", () => {
  it("passes through an already-typed AttendanceFailure unchanged", () => {
    expect(toAttendanceFailure({ type: "invalid-request" })).toEqual({
      type: "invalid-request",
    });
  });

  it("maps ATTENDANCE_FORBIDDEN -> forbidden", () => {
    expect(toAttendanceFailure(apiError("ATTENDANCE_FORBIDDEN", 403))).toEqual({
      type: "forbidden",
    });
  });

  it("maps ATTENDANCE_NOT_FOUND -> not-found", () => {
    expect(toAttendanceFailure(apiError("ATTENDANCE_NOT_FOUND", 404))).toEqual({
      type: "not-found",
    });
  });

  it("maps ATTENDANCE_CORRECTION_WINDOW_EXPIRED -> correction-window-expired", () => {
    expect(
      toAttendanceFailure(
        apiError("ATTENDANCE_CORRECTION_WINDOW_EXPIRED", 403),
      ),
    ).toEqual({ type: "correction-window-expired" });
  });

  it("maps ATTENDANCE_STUDENT_NOT_ENROLLED -> student-not-enrolled", () => {
    expect(
      toAttendanceFailure(apiError("ATTENDANCE_STUDENT_NOT_ENROLLED", 404)),
    ).toEqual({ type: "student-not-enrolled" });
  });

  it.each([
    "ATTENDANCE_INVALID_TENANT_ID",
    "ATTENDANCE_INVALID_CLASS_ID",
    "ATTENDANCE_INVALID_MEMBER_ID",
    "ATTENDANCE_INVALID_DATE",
    "ATTENDANCE_INVALID_STATUS",
    "ATTENDANCE_BATCH_TOO_LARGE",
    "ATTENDANCE_INVALID_DATE_RANGE",
    "ATTENDANCE_DATE_RANGE_TOO_LARGE",
  ])("maps %s -> invalid-request", (code) => {
    expect(toAttendanceFailure(apiError(code, 400))).toEqual({
      type: "invalid-request",
    });
  });

  it("maps a transport failure (no response) -> network-error", () => {
    const err = new ApiError({
      code: "NETWORK_ERROR",
      message: "timeout",
      retryable: true,
    });
    expect(toAttendanceFailure(err)).toEqual({ type: "network-error" });
  });

  it("maps an unmapped code -> unknown", () => {
    expect(toAttendanceFailure(apiError("SOMETHING_ELSE", 500))).toEqual({
      type: "unknown",
    });
  });
});
