import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { ReportRef } from "../../domain/entities/report.entity";
import type { ReportInboxItemDto } from "../dtos/report-response.dto";
import { ModerationMapper } from "../mappers/moderation.mapper";
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

// ─────────────────────────────────────────────────────────────────────────────
// US-E18.32 — real HTTP contract (BE US-172 / US-166)
// ─────────────────────────────────────────────────────────────────────────────
function fakeHttp(overrides: Partial<AxiosInstance>): AxiosInstance {
  return overrides as unknown as AxiosInstance;
}

const ROW: ReportInboxItemDto = {
  reportId: "rep-1",
  targetType: "POST",
  targetId: "post-9",
  reasonCategory: "SPAM",
  reasonFreeText: null,
  filedAt: "2026-07-10T08:00:00Z",
  status: "PENDING",
};

function listEnvelope(rows: ReportInboxItemDto[], pagination?: unknown) {
  return {
    success: true,
    data: rows,
    error: null,
    meta: { requestId: "req-1", timestamp: "t", pagination },
  };
}

const PENDING_REF: ReportRef = {
  reportId: "rep-1",
  filedAt: "2026-07-10T08:00:00Z",
  status: "pending",
};

describe("ModerationRepository.listReports — server-side filters", () => {
  it("sends status/contentType/search/limit as REAL query params", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([ROW]));
    const repo = new ModerationRepository(fakeHttp({ get }));

    const res = await repo.listReports(
      { status: "resolved", contentType: "comment", search: "  quấy rối  " },
      "cur-2",
    );

    expect(res.ok).toBe(true);
    expect(get).toHaveBeenCalledTimes(1);
    const [url, config] = get.mock.calls[0];
    expect(url).toBe("/social/api/v1/reports");
    expect(config.params).toEqual({
      status: "RESOLVED",
      limit: 20,
      contentType: "COMMENT",
      // trimmed — whitespace-only is treated as absent by the service
      search: "quấy rối",
      cursor: "cur-2",
    });
    // `raw: true` must be a CONFIG-LEVEL sibling of `params`, never nested
    // inside it (a nested flag silently disables envelope passthrough).
    expect(config.raw).toBe(true);
  });

  it("omits contentType/search/cursor when not narrowing (byte-for-byte pre-US-172 call)", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([]));
    const repo = new ModerationRepository(fakeHttp({ get }));

    await repo.listReports(
      { status: "pending", contentType: "all", search: "   " },
      null,
    );

    expect(get.mock.calls[0][1].params).toEqual({
      status: "PENDING",
      limit: 20,
    });
  });

  it("maps rows and reads pagination from meta", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        listEnvelope([ROW], { nextCursor: "cur-9", hasMore: true }),
      );
    const repo = new ModerationRepository(fakeHttp({ get }));

    const res = await repo.listReports(
      { status: "pending", contentType: "all", search: "" },
      null,
    );

    expect(res).toEqual({
      ok: true,
      value: {
        reports: [ModerationMapper.toReportEntity(ROW)],
        nextCursor: "cur-9",
        hasMore: true,
      },
    });
  });

  it("preserves an EMPTY page that still has more (bounded-scan filter semantics)", async () => {
    const get = vi
      .fn()
      .mockResolvedValue(
        listEnvelope([], { nextCursor: "cur-3", hasMore: true }),
      );
    const repo = new ModerationRepository(fakeHttp({ get }));

    const res = await repo.listReports(
      { status: "pending", contentType: "post", search: "x" },
      null,
    );

    // "no matches on THIS page" must not collapse into "no more matches".
    expect(res).toEqual({
      ok: true,
      value: { reports: [], nextCursor: "cur-3", hasMore: true },
    });
  });

  it("NEVER touches the stats endpoint (stats are not derived from a list page)", async () => {
    const get = vi.fn().mockResolvedValue(listEnvelope([ROW]));
    const repo = new ModerationRepository(fakeHttp({ get }));

    await repo.listReports(
      { status: "pending", contentType: "all", search: "" },
      null,
    );

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe("/social/api/v1/reports");
  });

  it("maps a 403 to forbidden", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "REPORT_NOT_ADMIN",
        message: "x",
        retryable: false,
        status: 403,
      }),
    );
    const repo = new ModerationRepository(fakeHttp({ get }));
    const res = await repo.listReports(
      { status: "pending", contentType: "all", search: "" },
      null,
    );
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});

describe("ModerationRepository.getReportStats — its own endpoint", () => {
  it("GETs /reports/stats and maps the flat counters", async () => {
    const get = vi.fn().mockResolvedValue({ pending: 5, resolved: 12 });
    const repo = new ModerationRepository(fakeHttp({ get }));

    const res = await repo.getReportStats();

    expect(get).toHaveBeenCalledWith("/social/api/v1/reports/stats");
    expect(res).toEqual({
      ok: true,
      value: { pendingCount: 5, resolvedCount: 12 },
    });
  });

  it("sends NO filter params — the counters are tenant-wide by contract", async () => {
    const get = vi.fn().mockResolvedValue({ pending: 0, resolved: 0 });
    const repo = new ModerationRepository(fakeHttp({ get }));
    await repo.getReportStats();
    expect(get.mock.calls[0]).toHaveLength(1);
  });
});

describe("ModerationRepository.getReportDetail — partition-locating params", () => {
  it("sends the REQUIRED filedAt + the status partition", async () => {
    const get = vi.fn().mockResolvedValue(ROW);
    const repo = new ModerationRepository(fakeHttp({ get }));

    const res = await repo.getReportDetail(PENDING_REF);

    expect(get).toHaveBeenCalledWith("/social/api/v1/reports/rep-1", {
      params: { filedAt: "2026-07-10T08:00:00Z", status: "PENDING" },
    });
    expect(res).toEqual({
      ok: true,
      value: ModerationMapper.toReportDetailEntity(ROW),
    });
  });

  it("sends status=RESOLVED for a resolved row (a resolved id is NOT in the PENDING partition)", async () => {
    const get = vi.fn().mockResolvedValue({
      ...ROW,
      status: "RESOLVED",
      resolutionOutcome: "DELETE",
    });
    const repo = new ModerationRepository(fakeHttp({ get }));

    await repo.getReportDetail({
      reportId: "rep-1",
      filedAt: "2026-07-10T08:00:00Z",
      status: "removed",
    });

    expect(get.mock.calls[0][1].params.status).toBe("RESOLVED");
  });

  it("maps an unresolvable tuple (404, incl. cross-tenant) to not-found", async () => {
    const get = vi.fn().mockRejectedValue(
      new ApiError({
        code: "REPORT_NOT_FOUND",
        message: "x",
        retryable: false,
        status: 404,
      }),
    );
    const repo = new ModerationRepository(fakeHttp({ get }));
    expect(await repo.getReportDetail(PENDING_REF)).toEqual({
      ok: false,
      error: { type: "not-found" },
    });
  });
});

describe("ModerationRepository.dismissReport — CAS resolve", () => {
  it("POSTs action=DISMISS with the echoed filedAt", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.dismissReport(PENDING_REF);

    expect(post).toHaveBeenCalledWith("/social/api/v1/reports/rep-1/resolve", {
      action: "DISMISS",
      filedAt: "2026-07-10T08:00:00Z",
    });
    expect(res).toEqual({ ok: true });
  });

  it("maps the CAS loser's 409 to already-resolved", async () => {
    const post = vi.fn().mockRejectedValue(
      new ApiError({
        code: "REPORT_ALREADY_RESOLVED",
        message: "x",
        retryable: false,
        status: 409,
      }),
    );
    const repo = new ModerationRepository(fakeHttp({ post }));
    expect(await repo.dismissReport(PENDING_REF)).toEqual({
      ok: false,
      error: { type: "already-resolved" },
    });
  });
});

describe("ModerationRepository.removeContent — two real paths", () => {
  it("report-driven POST target resolves with action=DELETE (one atomic call)", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.removeContent({
      kind: "post",
      contentId: "post-9",
      ref: PENDING_REF,
    });

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/social/api/v1/reports/rep-1/resolve", {
      action: "DELETE",
      filedAt: "2026-07-10T08:00:00Z",
    });
  });

  it("report-driven COMMENT target uses the SAME resolve call (no parentId needed)", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.removeContent({
      kind: "comment",
      contentId: "cmt-3",
      ref: PENDING_REF,
    });

    expect(res).toEqual({ ok: true });
    // A report row carries only the commentId, never its parent postId — the
    // direct comment route would be unaddressable from the queue.
    expect(post).toHaveBeenCalledWith("/social/api/v1/reports/rep-1/resolve", {
      action: "DELETE",
      filedAt: "2026-07-10T08:00:00Z",
    });
  });

  it("direct POST removal (no report in scope) uses the bare moderate-delete route", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.removeContent({ kind: "post", contentId: "p1" });

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith(
      "/social/api/v1/feeds/posts/p1/moderate-delete",
    );
  });

  it("direct COMMENT removal uses the parent-scoped route (US-166)", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.removeContent({
      kind: "comment",
      contentId: "c1",
      parentId: "p1",
    });

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith(
      "/social/api/v1/feeds/posts/p1/comments/c1/moderate-delete",
    );
  });

  it("direct COMMENT removal WITHOUT a parentId fails fast, zero HTTP", async () => {
    const post = vi.fn();
    const get = vi.fn();
    const repo = new ModerationRepository(fakeHttp({ post, get }));

    const res = await repo.removeContent({ kind: "comment", contentId: "c1" });

    expect(res).toEqual({ ok: false, error: { type: "validation" } });
    expect(post).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it("maps the already-deleted 409 to already-resolved", async () => {
    const post = vi.fn().mockRejectedValue(
      new ApiError({
        code: "MODERATION_TARGET_ALREADY_DELETED",
        message: "x",
        retryable: false,
        status: 409,
      }),
    );
    const repo = new ModerationRepository(fakeHttp({ post }));
    expect(await repo.removeContent({ kind: "post", contentId: "p1" })).toEqual(
      { ok: false, error: { type: "already-resolved" } },
    );
  });
});

describe("ModerationRepository.createReport — SubmitReportRequest", () => {
  it("maps kind/reason to the wire enums and omits reasonFreeText", async () => {
    const post = vi.fn().mockResolvedValue({ reportId: "new-1" });
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.createReport({
      kind: "post",
      contentId: "post-9",
      reason: "bullying",
    });

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith("/social/api/v1/reports", {
      targetType: "POST",
      targetId: "post-9",
      reasonCategory: "HARASSMENT",
    });
  });

  it("reports a COMMENT target (US-166 — no longer an unsupported kind)", async () => {
    const post = vi.fn().mockResolvedValue({ reportId: "new-2" });
    const repo = new ModerationRepository(fakeHttp({ post }));

    const res = await repo.createReport({
      kind: "comment",
      contentId: "cmt-3",
      reason: "other",
      note: "  Nội dung sai sự thật  ",
    });

    expect(res).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith("/social/api/v1/reports", {
      targetType: "COMMENT",
      targetId: "cmt-3",
      reasonCategory: "OTHER",
      reasonFreeText: "Nội dung sai sự thật",
    });
  });

  it("maps the hourly rate limit (429) to the retryable network bucket", async () => {
    const post = vi.fn().mockRejectedValue(
      new ApiError({
        code: "REPORT_RATE_LIMITED",
        message: "x",
        retryable: true,
        status: 429,
      }),
    );
    const repo = new ModerationRepository(fakeHttp({ post }));
    expect(
      await repo.createReport({
        kind: "post",
        contentId: "p",
        reason: "spam",
      }),
    ).toEqual({ ok: false, error: { type: "network-error" } });
  });
});

describe("ModerationRepository.getModerationAuditLog — honest degrade", () => {
  it("returns a typed failure with ZERO HTTP (no content-moderation audit exists)", async () => {
    const get = vi.fn();
    const post = vi.fn();
    const repo = new ModerationRepository(fakeHttp({ get, post }));

    const res = await repo.getModerationAuditLog("tenant-1", null);

    // Never silently serve the ROOM capability audit (US-086) as if it were the
    // dismiss/remove trail, and never fabricate entries.
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
    expect(get).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});
