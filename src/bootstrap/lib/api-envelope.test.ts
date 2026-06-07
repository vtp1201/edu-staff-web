import { describe, expect, it } from "vitest";
import {
  type ApiEnvelope,
  ApiError,
  errorCodeOf,
  isApiError,
  normalizeError,
  parseEnvelope,
  statusOf,
  unwrapResponse,
} from "./api-envelope";

function envelope<T>(over: Partial<ApiEnvelope<T>> = {}): ApiEnvelope<T> {
  return {
    success: true,
    data: null,
    error: null,
    meta: { requestId: "req-1", timestamp: "t" },
    ...over,
  };
}

/** Minimal axios-response-like object the interceptor receives. */
function res<T>(data: T, config: Record<string, unknown> = {}) {
  return { data, config: { url: "/auth/signin", ...config } };
}

describe("unwrapResponse", () => {
  it("unwraps a success envelope to its payload", () => {
    const payload = { accessToken: "a", refreshToken: "r" };
    const out = unwrapResponse(res(envelope({ success: true, data: payload })));
    expect(out).toEqual(payload);
  });

  it("throws ApiError when success:false slips through with 2xx", () => {
    const env = envelope({
      success: false,
      data: null,
      error: { code: "USER_NOT_FOUND", message: "no", retryable: false },
    });
    expect(() => unwrapResponse(res(env))).toThrow(ApiError);
    try {
      unwrapResponse(res(env));
    } catch (e) {
      expect((e as ApiError).code).toBe("USER_NOT_FOUND");
    }
  });

  it("returns raw body untouched for a config.raw call", () => {
    const body = { status: "ok" };
    const out = unwrapResponse(res(body, { raw: true }));
    expect(out).toBe(body);
  });

  it("returns raw body for /health and jwks (no envelope)", () => {
    const health = { status: "UP" };
    expect(unwrapResponse(res(health, { url: "/health" }))).toBe(health);
    const jwks = { keys: [] };
    expect(unwrapResponse(res(jwks, { url: "/.well-known/jwks.json" }))).toBe(
      jwks,
    );
  });
});

describe("normalizeError", () => {
  it("maps an error envelope to ApiError with code/retryable/requestId/status", () => {
    const axiosErr = {
      response: {
        status: 401,
        data: envelope({
          success: false,
          error: {
            code: "TOKEN_EXPIRED",
            message: "expired",
            retryable: false,
          },
          meta: { requestId: "req-9" },
        }),
      },
    };
    const err = normalizeError(axiosErr);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("TOKEN_EXPIRED");
    expect(err.status).toBe(401);
    expect(err.retryable).toBe(false);
    expect(err.requestId).toBe("req-9");
  });

  it("carries validation fields[] (422)", () => {
    const axiosErr = {
      response: {
        status: 422,
        data: envelope({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "bad",
            retryable: false,
            fields: [{ field: "email", message: "required" }],
          },
        }),
      },
    };
    const err = normalizeError(axiosErr);
    expect(err.fields).toEqual([{ field: "email", message: "required" }]);
  });

  it("treats a no-response error as a NETWORK_ERROR with undefined status", () => {
    const err = normalizeError({ message: "Network Error" });
    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.status).toBeUndefined();
  });
});

describe("errorCodeOf / statusOf", () => {
  it("reads code and status off an ApiError", () => {
    const err = new ApiError({
      code: "USER_SUSPENDED",
      message: "x",
      retryable: false,
      status: 403,
    });
    expect(errorCodeOf(err)).toBe("USER_SUSPENDED");
    expect(statusOf(err)).toBe(403);
    expect(isApiError(err)).toBe(true);
  });

  it("still reads code/status off a raw axios error envelope", () => {
    const axiosErr = {
      response: {
        status: 401,
        data: { error: { code: "INVALID_TOKEN" } },
      },
    };
    expect(errorCodeOf(axiosErr)).toBe("INVALID_TOKEN");
    expect(statusOf(axiosErr)).toBe(401);
  });
});

describe("parseEnvelope (list pagination)", () => {
  it("extracts data, pagination and requestId from a list envelope", () => {
    const env = envelope<number[]>({
      data: [1, 2, 3],
      meta: {
        requestId: "req-list",
        pagination: { nextCursor: "c2", hasMore: true },
      },
    });
    const out = parseEnvelope(env);
    expect(out.data).toEqual([1, 2, 3]);
    expect(out.pagination).toEqual({ nextCursor: "c2", hasMore: true });
    expect(out.requestId).toBe("req-list");
  });

  it("returns undefined pagination when absent", () => {
    const out = parseEnvelope(envelope({ data: { id: 1 } }));
    expect(out.pagination).toBeUndefined();
  });
});
