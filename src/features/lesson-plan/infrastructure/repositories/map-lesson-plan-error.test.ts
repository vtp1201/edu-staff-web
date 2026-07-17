import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { mapLessonPlanApiError } from "./map-lesson-plan-error";

function apiErr(code: string, status?: number, retryable = false): ApiError {
  return new ApiError({ code, message: "x", retryable, status });
}

describe("mapLessonPlanApiError", () => {
  it.each([
    ["LESSON_PLAN_NOT_FOUND", 404, "not-found"],
    ["LESSON_PLAN_NOT_VISIBLE", 403, "not-visible"],
    ["LESSON_PLAN_ALREADY_PUBLISHED", 422, "already-published"],
    ["LESSON_PLAN_TAG_LIMIT_EXCEEDED", 422, "tag-limit-exceeded"],
    ["LESSON_PLAN_TITLE_REQUIRED", 400, "title-required"],
    ["LESSON_PLAN_TITLE_TOO_LONG", 400, "title-too-long"],
    ["LESSON_PLAN_TAG_TOO_LONG", 400, "tag-too-long"],
    ["SUBJECT_NOT_FOUND", 404, "subject-not-found"],
    ["LESSON_PLAN_INVALID_ID", 400, "invalid-id"],
    ["LESSON_PLAN_INVALID_TENANT_ID", 400, "invalid-id"],
    ["LESSON_PLAN_INVALID_SUBJECT_ID", 400, "invalid-id"],
    ["LESSON_PLAN_INVALID_MEMBER_ID", 400, "invalid-id"],
    ["LESSON_PLAN_INVALID_CURSOR", 400, "invalid-cursor"],
    ["FORBIDDEN_ACTION", 403, "forbidden"],
  ] as const)("maps %s → %s", (code, status, expected) => {
    expect(mapLessonPlanApiError(apiErr(code, status))).toBe(expected);
  });

  it("maps a transport failure (NETWORK_ERROR, no status) to network-error", () => {
    expect(mapLessonPlanApiError(apiErr("NETWORK_ERROR"))).toBe(
      "network-error",
    );
  });

  it("falls back on status 403 → forbidden for an unknown code", () => {
    expect(mapLessonPlanApiError(apiErr("SOMETHING_ELSE", 403))).toBe(
      "forbidden",
    );
  });

  it("falls back on status 404 → not-found for an unknown code", () => {
    expect(mapLessonPlanApiError(apiErr("SOMETHING_ELSE", 404))).toBe(
      "not-found",
    );
  });

  it("falls back on retryable → network-error", () => {
    expect(mapLessonPlanApiError(apiErr("BAD_GATEWAY", 502, true))).toBe(
      "network-error",
    );
  });

  it("returns unknown for an unrecognised non-retryable code", () => {
    expect(mapLessonPlanApiError(apiErr("WEIRD", 400))).toBe("unknown");
  });
});
