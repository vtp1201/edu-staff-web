import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { mapExamBankApiError } from "./map-exam-bank-error";

function apiError(code: string, status: number, retryable = false): ApiError {
  return new ApiError({ code, message: "boom", retryable, status });
}

describe("mapExamBankApiError", () => {
  it.each([
    ["EXAM_PAPER_NOT_FOUND", 404, "not-found"],
    ["EXAM_PAPER_SUBJECT_NOT_FOUND", 404, "not-found"],
    ["EXAM_PAPER_FORBIDDEN", 403, "forbidden"],
    ["EXAM_STATUS_TRANSITION_INVALID", 409, "invalid-transition"],
    ["EXAM_STATUS_INVALID_FOR_EDIT", 409, "not-editable"],
    ["EXAM_QUESTION_BODY_REQUIRED", 422, "question-body-required"],
    ["EXAM_QUESTION_MARKS_INVALID", 422, "question-marks-invalid"],
    ["EXAM_ANSWER_KEY_REQUIRED_FOR_MCQ", 422, "answer-key-required"],
    ["EXAM_ANSWER_KEY_NOT_ALLOWED", 422, "answer-key-not-allowed"],
    ["EXAM_PAPER_TITLE_REQUIRED", 422, "title-required"],
    ["EXAM_PAPER_TITLE_TOO_LONG", 422, "title-too-long"],
    ["EXAM_PAPER_DURATION_INVALID", 422, "duration-invalid"],
    ["EXAM_PAPER_INVALID_CURSOR", 400, "invalid-cursor"],
  ] as const)("maps %s → %s", (code, status, expected) => {
    expect(mapExamBankApiError(apiError(code, status))).toBe(expected);
  });

  it("maps a transport error (no status) to network-error", () => {
    expect(
      mapExamBankApiError(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      ),
    ).toBe("network-error");
  });

  it("falls back on status for an unmapped code (403 → forbidden, 404 → not-found)", () => {
    expect(mapExamBankApiError(apiError("SOMETHING_ELSE", 403))).toBe(
      "forbidden",
    );
    expect(mapExamBankApiError(apiError("SOMETHING_ELSE", 404))).toBe(
      "not-found",
    );
  });

  it("maps a retryable unmapped error to network-error", () => {
    expect(mapExamBankApiError(apiError("GATEWAY", 503, true))).toBe(
      "network-error",
    );
  });

  it("returns unknown for an unmapped, non-retryable error", () => {
    expect(mapExamBankApiError(apiError("WEIRD", 400))).toBe("unknown");
  });

  it("reads error.code from a raw axios error envelope", () => {
    const raw = {
      response: {
        status: 409,
        data: { error: { code: "EXAM_STATUS_TRANSITION_INVALID" } },
      },
    };
    expect(mapExamBankApiError(raw)).toBe("invalid-transition");
  });
});
