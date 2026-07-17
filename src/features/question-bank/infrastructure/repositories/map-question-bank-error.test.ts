import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { mapQuestionBankApiError } from "./map-question-bank-error";

function apiErr(code: string, status?: number, retryable = false): ApiError {
  return new ApiError({ code, message: "x", retryable, status });
}

describe("mapQuestionBankApiError", () => {
  // Non-ambiguous codes map the same regardless of call-site.
  it.each([
    ["QUESTION_NOT_VISIBLE", 403, "not-visible"],
    ["QUESTION_ALREADY_PUBLISHED", 422, "already-published"],
    ["QUESTION_TYPE_NOT_SUPPORTED", 422, "type-not-supported"],
    ["QUESTION_SEARCH_FILTER_REQUIRED", 422, "search-filter-required"],
    ["QUESTION_BODY_REQUIRED", 400, "body-required"],
    ["QUESTION_BODY_TOO_LONG", 400, "body-too-long"],
    ["QUESTION_TAG_LIMIT_EXCEEDED", 422, "tag-limit-exceeded"],
    ["QUESTION_TAG_TOO_LONG", 400, "tag-too-long"],
    ["QUESTION_INVALID_DIFFICULTY", 400, "invalid-difficulty"],
    ["SUBJECT_NOT_FOUND", 404, "subject-not-found"],
    ["QUESTION_INVALID_CURSOR", 400, "invalid-cursor"],
    ["QUESTION_NOT_FOUND", 404, "not-found"],
    ["QUESTION_INVALID_ID", 400, "not-found"],
  ] as const)("maps %s → %s (call-site independent)", (code, status, expected) => {
    expect(mapQuestionBankApiError(apiErr(code, status), "browse")).toBe(
      expected,
    );
    expect(mapQuestionBankApiError(apiErr(code, status), "edit")).toBe(
      expected,
    );
  });

  // THE mandatory disambiguation: identical wire code, two results by call-site.
  it("maps FORBIDDEN_ACTION → forbidden-browse at the browse call-site", () => {
    expect(
      mapQuestionBankApiError(apiErr("FORBIDDEN_ACTION", 403), "browse"),
    ).toBe("forbidden-browse");
  });
  it("maps FORBIDDEN_ACTION → forbidden-edit at the edit call-site", () => {
    expect(
      mapQuestionBankApiError(apiErr("FORBIDDEN_ACTION", 403), "edit"),
    ).toBe("forbidden-edit");
  });

  it("maps a transport failure (NETWORK_ERROR, no status) to network-error", () => {
    expect(mapQuestionBankApiError(apiErr("NETWORK_ERROR"), "browse")).toBe(
      "network-error",
    );
  });

  it("falls back on a bare 403 to the call-site's forbidden variant", () => {
    expect(mapQuestionBankApiError(apiErr("WEIRD", 403), "browse")).toBe(
      "forbidden-browse",
    );
    expect(mapQuestionBankApiError(apiErr("WEIRD", 403), "edit")).toBe(
      "forbidden-edit",
    );
  });

  it("falls back on status 404 → not-found for an unknown code", () => {
    expect(mapQuestionBankApiError(apiErr("WEIRD", 404), "edit")).toBe(
      "not-found",
    );
  });

  it("falls back on retryable → network-error", () => {
    expect(
      mapQuestionBankApiError(apiErr("BAD_GATEWAY", 502, true), "browse"),
    ).toBe("network-error");
  });

  it("returns unknown for an unrecognised non-retryable code", () => {
    expect(mapQuestionBankApiError(apiErr("WEIRD", 400), "browse")).toBe(
      "unknown",
    );
  });
});
