/**
 * Integration tests for AuditLogRepository (US-E12.12) — HTTP adapter + mapper
 * + failure mapping via a stubbed axios. The `core` audit endpoint is mock-first
 * (decision 0014), so these assert the contract shape (query params, envelope
 * unwrap, error → failure) the repo will use once BE US-064 ships.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import {
  type ApiEnvelope,
  ApiError,
  unwrapResponse,
} from "@/bootstrap/lib/api-envelope";
import type { AuditEventResponseDto } from "../dtos/audit-event-response.dto";
import {
  AuditLogRepository,
  buildAuditLogParams,
  toFailure,
} from "./audit-log.repository";

// biome-ignore lint/suspicious/noExplicitAny: test http stub mimics axios loosely
type HttpStub = Record<string, any>;

function makeHttp(over: HttpStub = {}): AxiosInstance {
  return { get: vi.fn(), ...over } as unknown as AxiosInstance;
}

function makeDto(
  over: Partial<AuditEventResponseDto> = {},
): AuditEventResponseDto {
  return {
    id: "log-1",
    occurredAt: "2026-06-13T09:42:11.000Z",
    actorId: "admin-1",
    actorName: "Trần Minh Quân",
    actorRole: "admin",
    action: "UPDATE",
    entityType: "grade",
    entityId: "gr-1",
    entityLabel: "Toán · CK",
    beforeValue: "8.5",
    afterValue: "9.0",
    ...over,
  };
}

function envelope(
  data: AuditEventResponseDto[],
  pagination?: { nextCursor: string | null; hasMore: boolean },
): ApiEnvelope<AuditEventResponseDto[]> {
  return {
    success: true,
    data,
    error: null,
    meta: { requestId: "req-1", pagination },
  };
}

describe("buildAuditLogParams", () => {
  it("always includes limit and omits empty filter fields", () => {
    expect(buildAuditLogParams({}, null, 20)).toEqual({ limit: 20 });
  });

  it("maps every filter field + cursor to camelCase params", () => {
    expect(
      buildAuditLogParams(
        {
          entityType: "grade",
          action: "DELETE",
          actorQuery: "  Quân  ",
          from: "2026-06-01",
          to: "2026-06-30",
        },
        "offset:20",
        20,
      ),
    ).toEqual({
      limit: 20,
      entityType: "grade",
      action: "DELETE",
      actorQuery: "Quân",
      from: "2026-06-01",
      to: "2026-06-30",
      cursor: "offset:20",
    });
  });
});

describe("toFailure", () => {
  it("network-error (retryable) for NETWORK_ERROR", () => {
    expect(
      toFailure(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      ),
    ).toEqual({ type: "network-error", retryable: true });
  });
  it("unauthorized for 401 (not retryable)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 401,
        }),
      ),
    ).toEqual({ type: "unauthorized", retryable: false });
  });
  it("forbidden for 403 (not retryable)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 403,
        }),
      ),
    ).toEqual({ type: "forbidden", retryable: false });
  });
  it("invalid-filter for 422 (not retryable)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 422,
        }),
      ),
    ).toEqual({ type: "invalid-filter", retryable: false });
  });
  it("unknown for a non-retryable 500", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 500,
        }),
      ),
    ).toEqual({ type: "unknown", retryable: false });
  });
  it("threads the BE retryable signal for a 503 (unknown but retryable)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "SERVICE_UNAVAILABLE",
          message: "x",
          retryable: true,
          status: 503,
        }),
      ),
    ).toEqual({ type: "unknown", retryable: true });
  });
  it("threads the BE retryable signal for a 429 (unknown but retryable)", () => {
    expect(
      toFailure(
        new ApiError({
          code: "RATE_LIMITED",
          message: "x",
          retryable: true,
          status: 429,
        }),
      ),
    ).toEqual({ type: "unknown", retryable: true });
  });
});

describe("AuditLogRepository", () => {
  it("issues a raw GET with the built params and unwraps the envelope", async () => {
    const get = vi.fn(async () =>
      envelope([makeDto(), makeDto({ id: "log-2" })], {
        nextCursor: "offset:20",
        hasMore: true,
      }),
    );
    const repo = new AuditLogRepository(makeHttp({ get }));

    const res = await repo.getAuditLog({ entityType: "grade" }, null, 20);

    expect(get).toHaveBeenCalledWith("/core/api/v1/audit-log", {
      params: { limit: 20, entityType: "grade" },
      raw: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.events).toHaveLength(2);
    expect(res.value.events[0].id).toBe("log-1");
    expect(res.value.nextCursor).toBe("offset:20");
    expect(res.value.hasMore).toBe(true);
  });

  it("defaults pagination to no-more when meta is absent", async () => {
    const get = vi.fn(async () => envelope([makeDto()]));
    const repo = new AuditLogRepository(makeHttp({ get }));

    const res = await repo.getAuditLog({}, null, 20);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.hasMore).toBe(false);
    expect(res.value.nextCursor).toBeNull();
  });

  it("maps a thrown ApiError to a failure result (no throw)", async () => {
    const get = vi.fn(async () => {
      throw new ApiError({
        code: "X",
        message: "x",
        retryable: false,
        status: 403,
      });
    });
    const repo = new AuditLogRepository(makeHttp({ get }));

    const res = await repo.getAuditLog({}, null, 20);
    expect(res).toEqual({
      ok: false,
      error: { type: "forbidden", retryable: false },
    });
  });
});

/**
 * Protective regression guard for `{ raw: true }` config placement (US-E18.19).
 * `getAuditLog` already spreads `raw: true` as a sibling of `params`; this suite
 * locks that in. The suite above mocks `http.get` to return an envelope directly,
 * so it cannot catch a future edit that nests `raw` inside `params` (isRawCall
 * reads `config.raw` at the TOP level). Here `http.get` runs the REAL
 * `unwrapResponse` interceptor against the config the repo actually passes: a
 * nested `params.raw` would leave isRawCall false → envelope unwrapped to its
 * array → `parseEnvelope(array)` throws UNKNOWN_ERROR. Passes with no source
 * change, confirming raw is at config top-level.
 */
describe("AuditLogRepository — real interceptor pipeline (raw-flag placement)", () => {
  function interceptedGet(bodyFor: (url: string) => unknown) {
    return vi.fn(
      async (url: string, config?: { params?: unknown; raw?: boolean }) =>
        unwrapResponse({
          data: bodyFor(url),
          config: { url, raw: config?.raw },
        }),
    ) as unknown as AxiosInstance["get"];
  }

  it("getAuditLog survives the real unwrap and reads pagination", async () => {
    const get = interceptedGet(() =>
      envelope([makeDto()], { nextCursor: "offset:20", hasMore: true }),
    );
    const repo = new AuditLogRepository(makeHttp({ get }));
    const res = await repo.getAuditLog({ entityType: "grade" }, null, 20);
    expect(res.ok).toBe(true);
    if (!res.ok) throw new Error("expected ok");
    expect(res.value.events).toHaveLength(1);
    expect(res.value.nextCursor).toBe("offset:20");
    expect(res.value.hasMore).toBe(true);
  });
});
