import { describe, expect, it } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { toFailure } from "./moderation.repository";

/**
 * THE central high-risk proof (AC-1928.6 / AC-1928.9 / NFR-101): the failure
 * mapping branches on error.code / status, NEVER on error.message. Each case
 * constructs an ApiError whose `message` deliberately points the OPPOSITE way
 * from its `code`, and asserts the mapping ignores the message.
 */
describe("toFailure — code-only branching (never message)", () => {
  it("maps FORBIDDEN → forbidden even when the message says 'please retry'", () => {
    const err = new ApiError({
      code: "FORBIDDEN",
      message: "please retry", // MISLEADING — sounds transient/retryable
      retryable: true, // even a lying retryable flag must not flip the branch
      status: 403,
    });
    expect(toFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps NOT_PRINCIPAL → forbidden regardless of message", () => {
    const err = new ApiError({
      code: "NOT_PRINCIPAL",
      message: "temporary server hiccup, try again",
      retryable: false,
      status: 403,
    });
    expect(toFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps a bare 403 (no code) → forbidden", () => {
    const err = new ApiError({
      code: "UNKNOWN_ERROR",
      message: "network unreachable",
      retryable: false,
      status: 403,
    });
    expect(toFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps a transient 503 → network-error even when message says 'forbidden'", () => {
    const err = new ApiError({
      code: "SERVICE_UNAVAILABLE",
      message: "forbidden", // MISLEADING — sounds like an auth problem
      retryable: true,
      status: 503,
    });
    expect(toFailure(err)).toEqual({ type: "network-error" });
  });

  it("maps a 429 → network-error", () => {
    const err = new ApiError({
      code: "RATE_LIMITED",
      message: "not principal",
      retryable: true,
      status: 429,
    });
    expect(toFailure(err)).toEqual({ type: "network-error" });
  });
});

describe("toFailure — conflict disambiguation by operation, not message", () => {
  it("ALREADY_REPORTED code → already-reported", () => {
    const err = new ApiError({
      code: "ALREADY_REPORTED",
      message: "resolved",
      retryable: false,
      status: 409,
    });
    expect(toFailure(err, "already-reported")).toEqual({
      type: "already-reported",
    });
  });

  it("ALREADY_RESOLVED code → already-resolved", () => {
    const err = new ApiError({
      code: "ALREADY_RESOLVED",
      message: "already reported",
      retryable: false,
      status: 409,
    });
    expect(toFailure(err)).toEqual({ type: "already-resolved" });
  });

  it("bare 409 maps to the caller-supplied conflict kind (create → already-reported)", () => {
    const err = new ApiError({
      code: "CONFLICT",
      message: "x",
      retryable: false,
      status: 409,
    });
    expect(toFailure(err, "already-reported")).toEqual({
      type: "already-reported",
    });
  });

  it("bare 409 defaults to already-resolved (resolve/remove)", () => {
    const err = new ApiError({
      code: "CONFLICT",
      message: "x",
      retryable: false,
      status: 409,
    });
    expect(toFailure(err)).toEqual({ type: "already-resolved" });
  });
});

describe("toFailure — remaining branches", () => {
  it("404 / REPORT_NOT_FOUND → not-found", () => {
    expect(
      toFailure(
        new ApiError({
          code: "REPORT_NOT_FOUND",
          message: "gone",
          retryable: false,
          status: 404,
        }),
      ),
    ).toEqual({ type: "not-found" });
  });

  it("422 VALIDATION_ERROR carries field errors", () => {
    const err = new ApiError({
      code: "VALIDATION_ERROR",
      message: "invalid",
      retryable: false,
      status: 422,
      fields: [{ field: "note", message: "required" }],
    });
    expect(toFailure(err)).toEqual({
      type: "validation",
      fields: [{ field: "note", message: "required" }],
    });
  });

  it("transport error (no response) → network-error", () => {
    expect(toFailure(new Error("socket hang up"))).toEqual({
      type: "network-error",
    });
  });
});
