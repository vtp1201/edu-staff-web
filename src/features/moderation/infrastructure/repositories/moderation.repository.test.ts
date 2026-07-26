import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import { ModerationRepository, toFailure } from "./moderation.repository";

/**
 * THE central high-risk proof (AC-1928.6 / AC-1928.9 / NFR-101): the failure
 * mapping branches on error.code / status, NEVER on error.message. Each case
 * constructs an ApiError whose `message` deliberately points the OPPOSITE way
 * from its `code`, and asserts the mapping ignores the message.
 *
 * US-E18.20: every `code` below is verbatim from
 * `edu-api/services/social/docs/ERROR_CODES.md` §"Moderation errors (US-098,
 * ADR 0078)" — the previously-guessed generic codes did not exist on the wire.
 */
describe("toFailure — code-only branching (never message)", () => {
  it("maps REPORT_NOT_ADMIN → forbidden even when the message says 'please retry'", () => {
    const err = new ApiError({
      code: "REPORT_NOT_ADMIN",
      message: "please retry", // MISLEADING — sounds transient/retryable
      retryable: true, // even a lying retryable flag must not flip the branch
      status: 403,
    });
    expect(toFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps REPORT_NOT_TENANT_MEMBER → forbidden regardless of message", () => {
    const err = new ApiError({
      code: "REPORT_NOT_TENANT_MEMBER",
      message: "temporary server hiccup, try again",
      retryable: false,
      status: 403,
    });
    expect(toFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps UNAUTHORIZED_MODERATION_ACTION → forbidden (moderate-delete gate)", () => {
    const err = new ApiError({
      code: "UNAUTHORIZED_MODERATION_ACTION",
      message: "network unreachable",
      retryable: true,
      status: 403,
    });
    expect(toFailure(err)).toEqual({ type: "forbidden" });
  });

  it("maps a bare 403 (unknown code) → forbidden", () => {
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

  it("maps REPORT_RATE_LIMITED (429) → network-error (documented retryable)", () => {
    const err = new ApiError({
      code: "REPORT_RATE_LIMITED",
      message: "not an admin",
      retryable: true,
      status: 429,
    });
    expect(toFailure(err)).toEqual({ type: "network-error" });
  });
});

describe("toFailure — conflict disambiguation by operation, not message", () => {
  it("REPORT_ALREADY_RESOLVED → already-resolved (CAS loser)", () => {
    const err = new ApiError({
      code: "REPORT_ALREADY_RESOLVED",
      message: "already reported",
      retryable: false,
      status: 409,
    });
    expect(toFailure(err)).toEqual({ type: "already-resolved" });
  });

  it("MODERATION_TARGET_ALREADY_DELETED → already-resolved", () => {
    const err = new ApiError({
      code: "MODERATION_TARGET_ALREADY_DELETED",
      message: "not found",
      retryable: false,
      status: 409,
    });
    expect(toFailure(err)).toEqual({ type: "already-resolved" });
  });

  /**
   * US-E18.20: the real contract has NO duplicate-report concept (reports are
   * rate-limited, never deduped) so `POST /reports` cannot 409 — the
   * `already-reported` failure survives ONLY as this defensive fallback,
   * because the shipped UX renders distinct info-toned copy for it.
   */
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

  it("no longer honours the invented ALREADY_REPORTED code on a non-409 status", () => {
    // The code does not exist on the real wire; nothing may special-case it.
    const err = new ApiError({
      code: "ALREADY_REPORTED",
      message: "duplicate",
      retryable: true,
      status: 503,
    });
    expect(toFailure(err, "already-reported")).toEqual({
      type: "network-error",
    });
  });
});

describe("toFailure — remaining branches", () => {
  it("REPORT_NOT_FOUND → not-found", () => {
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

  it("REPORT_TARGET_NOT_FOUND → not-found (submit against a dead target)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "REPORT_TARGET_NOT_FOUND",
          message: "try again",
          retryable: true,
          status: 404,
        }),
        "already-reported",
      ),
    ).toEqual({ type: "not-found" });
  });

  it("MODERATION_TARGET_NOT_FOUND → not-found (also the cross-tenant mask)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "MODERATION_TARGET_NOT_FOUND",
          message: "forbidden",
          retryable: false,
          status: 404,
        }),
      ),
    ).toEqual({ type: "not-found" });
  });

  it("422 VALIDATION_FAILED carries field errors", () => {
    const err = new ApiError({
      code: "VALIDATION_FAILED",
      message: "invalid",
      retryable: false,
      status: 422,
      fields: [{ field: "reasonFreeText", message: "required" }],
    });
    expect(toFailure(err)).toEqual({
      type: "validation",
      fields: [{ field: "reasonFreeText", message: "required" }],
    });
  });

  it("transport error (no response) → network-error", () => {
    expect(toFailure(new Error("socket hang up"))).toEqual({
      type: "network-error",
    });
  });
});

// ── removeContent ↔ real contract (US-E18.20 AC-3) ──────────────────────────
function fakeHttp(overrides: Partial<AxiosInstance>): AxiosInstance {
  return overrides as unknown as AxiosInstance;
}

describe("ModerationRepository.removeContent — real moderate-delete contract", () => {
  it("post target issues a BARE POST with no request body", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn();
    const repo = new ModerationRepository(fakeHttp({ post, delete: del }));

    const res = await repo.removeContent({
      kind: "post",
      contentId: "p1",
      reportId: "r1",
      resolveNote: "spam",
    });

    expect(res).toEqual({ ok: true });
    // No body, and definitely not a DELETE — the endpoint is
    // `POST /feeds/posts/{postId}/moderate-delete` (204, no body).
    expect(post).toHaveBeenCalledWith(
      "/social/api/v1/feeds/posts/p1/moderate-delete",
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
  });

  it("post target maps a 403 to forbidden", async () => {
    const post = vi.fn().mockRejectedValue(
      new ApiError({
        code: "UNAUTHORIZED_MODERATION_ACTION",
        message: "retry",
        retryable: true,
        status: 403,
      }),
    );
    const repo = new ModerationRepository(fakeHttp({ post }));
    const res = await repo.removeContent({ kind: "post", contentId: "p1" });
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });

  it("comment target fails fast WITHOUT any HTTP call (no such endpoint)", async () => {
    const post = vi.fn();
    const del = vi.fn();
    const get = vi.fn();
    const put = vi.fn();
    const repo = new ModerationRepository(
      fakeHttp({ post, delete: del, get, put }),
    );

    const res = await repo.removeContent({
      kind: "comment",
      contentId: "c1",
      parentId: "p1",
    });

    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
    expect(post).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });
});
