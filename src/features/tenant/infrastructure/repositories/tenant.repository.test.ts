/**
 * Integration tests for TenantRepository's failure mapping (US-E23.1).
 * `toFailure()` mirrors AnnouncementRepository.toFailure() — branches on
 * `error.code` (UPPER_SNAKE) / status, never on message. `switchTenant` wraps
 * its HTTP call so a non-2xx surfaces as a typed `TenantFailure`, not a raw
 * `ApiError`, so the Server Action can return a stable key (Path A).
 */
import type { AxiosInstance } from "axios";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/bootstrap/lib/api-envelope";
import type { TenantFailure } from "../../domain/failures/tenant.failure";
import { TenantRepository, toFailure } from "./tenant.repository";

function apiError(over: Partial<ConstructorParameters<typeof ApiError>[0]>) {
  return new ApiError({
    code: "UNKNOWN_ERROR",
    message: "x",
    retryable: false,
    ...over,
  });
}

describe("TenantRepository.toFailure", () => {
  it("maps 403 → forbidden (target membership rejected, FR-008)", () => {
    expect(toFailure(apiError({ status: 403 })).type).toBe("forbidden");
  });

  it("maps a FORBIDDEN code → forbidden regardless of status", () => {
    expect(toFailure(apiError({ code: "FORBIDDEN" })).type).toBe("forbidden");
  });

  it("maps 5xx → network (FR-009)", () => {
    expect(toFailure(apiError({ status: 500 })).type).toBe("network");
    expect(toFailure(apiError({ status: 503 })).type).toBe("network");
  });

  it("maps a transport error (no status / NETWORK_ERROR) → network", () => {
    expect(toFailure(apiError({ code: "NETWORK_ERROR" })).type).toBe("network");
    expect(toFailure(apiError({ status: 0 })).type).toBe("network");
    expect(toFailure({}).type).toBe("network");
  });

  it("folds 401 into network (AC-9 descope — no reactive-refresh shim)", () => {
    expect(toFailure(apiError({ status: 401 })).type).toBe("network");
  });

  it("maps other 4xx → unknown", () => {
    expect(toFailure(apiError({ status: 400 })).type).toBe("unknown");
  });
});

// biome-ignore lint/suspicious/noExplicitAny: test http stub mimics axios loosely
type HttpStub = Record<string, any>;
function makeHttp(over: HttpStub = {}): AxiosInstance {
  return { get: vi.fn(), post: vi.fn(), ...over } as unknown as AxiosInstance;
}

describe("TenantRepository.switchTenant", () => {
  it("returns mapped tokens on success", async () => {
    const http = makeHttp({
      post: vi.fn().mockResolvedValue({
        accessToken: "a",
        refreshToken: "r",
        sessionId: "s",
        tokenType: "Bearer",
      }),
    });
    const repo = new TenantRepository(http);
    const tokens = await repo.switchTenant("tenant-x");
    expect(tokens.accessToken).toBe("a");
  });

  it("throws a typed TenantFailure (not a raw ApiError) on a 403", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError({ status: 403 })),
    });
    const repo = new TenantRepository(http);
    await expect(repo.switchTenant("tenant-x")).rejects.toEqual({
      type: "forbidden",
    } satisfies TenantFailure);
  });

  it("throws a network TenantFailure on a 5xx", async () => {
    const http = makeHttp({
      post: vi.fn().mockRejectedValue(apiError({ status: 502 })),
    });
    const repo = new TenantRepository(http);
    await expect(repo.switchTenant("tenant-x")).rejects.toEqual({
      type: "network",
    } satisfies TenantFailure);
  });
});
