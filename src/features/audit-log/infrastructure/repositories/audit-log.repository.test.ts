/**
 * Integration tests for AuditLogRepository (US-E12.12) — HTTP adapter + mapper
 * + failure mapping via a stubbed axios. The `core` audit endpoint is mock-first
 * (decision 0014), so these assert the contract shape (query params, envelope
 * unwrap, error → failure) the repo will use once BE US-064 ships.
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { type ApiEnvelope, ApiError } from "@/bootstrap/lib/api-envelope";
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
  it("network-error for NETWORK_ERROR", () => {
    expect(
      toFailure(
        new ApiError({ code: "NETWORK_ERROR", message: "x", retryable: true }),
      ),
    ).toEqual({ type: "network-error" });
  });
  it("unauthorized for 401", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 401,
        }),
      ),
    ).toEqual({ type: "unauthorized" });
  });
  it("forbidden for 403", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 403,
        }),
      ),
    ).toEqual({ type: "forbidden" });
  });
  it("invalid-filter for 422", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 422,
        }),
      ),
    ).toEqual({ type: "invalid-filter" });
  });
  it("unknown for 500", () => {
    expect(
      toFailure(
        new ApiError({
          code: "X",
          message: "x",
          retryable: false,
          status: 500,
        }),
      ),
    ).toEqual({ type: "unknown" });
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
    expect(res).toEqual({ ok: false, error: { type: "forbidden" } });
  });
});
