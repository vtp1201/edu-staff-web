/**
 * Stable API envelope contract (`/api/v1`, decision `0008`) + the shared parser
 * used by `bootstrap/lib/http.ts` (US-E06.1).
 *
 * The http interceptor unwraps a SUCCESS envelope to its `data` payload, so
 * repositories receive the payload directly (not the envelope). Errors —
 * non-2xx, `success:false`, or transport failures — are normalised into a
 * thrown {@link ApiError} carrying `code` (UPPER_SNAKE), `retryable`, optional
 * `fields[]`, `requestId` and the HTTP `status`. Branch on `error.code`, never
 * on the (localised) message.
 *
 * Raw endpoints (`/health`, `/.well-known/jwks.json`) and any call flagged
 * `{ raw: true }` bypass unwrapping. List endpoints that need pagination use
 * `{ raw: true }` + {@link parseEnvelope} to read `meta.pagination`.
 */

export interface ApiErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  fields?: Array<{ field: string; message: string }>;
}

export interface Pagination {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorShape | null;
  meta: { requestId?: string; timestamp?: string; pagination?: Pagination };
}

/** Sentinel code for a transport failure (no HTTP response received). */
export const NETWORK_ERROR_CODE = "NETWORK_ERROR";

/** Normalised error thrown by the http interceptor for any failed request. */
export class ApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly fields?: Array<{ field: string; message: string }>;

  constructor(init: {
    code: string;
    message: string;
    retryable: boolean;
    status?: number;
    requestId?: string;
    fields?: Array<{ field: string; message: string }>;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.retryable = init.retryable;
    this.status = init.status;
    this.requestId = init.requestId;
    this.fields = init.fields;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

const RAW_URL_SUFFIXES = ["/health", "/.well-known/jwks.json"];

function isRawCall(config?: { url?: string; raw?: boolean }): boolean {
  if (!config) return false;
  if (config.raw === true) return true;
  const url = config.url ?? "";
  return RAW_URL_SUFFIXES.some((suffix) => url.endsWith(suffix));
}

function isEnvelope(body: unknown): body is ApiEnvelope<unknown> {
  return (
    typeof body === "object" &&
    body !== null &&
    "success" in body &&
    "data" in body &&
    "error" in body
  );
}

/**
 * Success-path unwrap for the http interceptor. Returns the `data` payload for
 * a standard envelope, the raw body for raw endpoints, and throws {@link ApiError}
 * if a `success:false` envelope arrives with a 2xx status.
 */
export function unwrapResponse(response: {
  data: unknown;
  config?: { url?: string; raw?: boolean };
}): unknown {
  const body = response.data;
  if (isRawCall(response.config) || !isEnvelope(body)) return body;
  if (!body.success) {
    const e = body.error;
    throw new ApiError({
      code: e?.code ?? "UNKNOWN_ERROR",
      message: e?.message ?? "Request failed",
      retryable: e?.retryable ?? false,
      fields: e?.fields,
      requestId: body.meta?.requestId,
    });
  }
  return body.data;
}

/** Error-path normalisation: any axios/transport error → {@link ApiError}. */
export function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  const response = (error as { response?: { status?: number; data?: unknown } })
    .response;

  if (!response) {
    const message =
      (error as { message?: string }).message ?? "Network request failed";
    return new ApiError({
      code: NETWORK_ERROR_CODE,
      message,
      retryable: true,
    });
  }

  const body = response.data;
  const env = isEnvelope(body) ? body : undefined;
  const e = env?.error;
  return new ApiError({
    code: e?.code ?? "UNKNOWN_ERROR",
    message:
      e?.message ?? (error as { message?: string }).message ?? "Request failed",
    retryable: e?.retryable ?? false,
    status: response.status,
    requestId: env?.meta?.requestId,
    fields: e?.fields,
  });
}

/** Extract `error.code` — from an {@link ApiError} or a raw axios error envelope. */
export function errorCodeOf(err: unknown): string | undefined {
  if (isApiError(err)) return err.code;
  const data = (err as { response?: { data?: unknown } }).response?.data;
  const code = (data as { error?: { code?: unknown } } | undefined)?.error
    ?.code;
  return typeof code === "string" ? code : undefined;
}

/** HTTP status — from an {@link ApiError} or a raw axios error. `undefined` = no response. */
export function statusOf(err: unknown): number | undefined {
  if (isApiError(err)) return err.status;
  return (err as { response?: { status?: number } }).response?.status;
}

/**
 * Parse a full envelope (from a `{ raw: true }` list call) into payload +
 * pagination + requestId. Throws {@link ApiError} on a `success:false` envelope.
 */
export function parseEnvelope<T>(env: ApiEnvelope<T>): {
  data: T;
  pagination?: Pagination;
  requestId?: string;
} {
  if (!env.success) {
    throw new ApiError({
      code: env.error?.code ?? "UNKNOWN_ERROR",
      message: env.error?.message ?? "Request failed",
      retryable: env.error?.retryable ?? false,
      fields: env.error?.fields,
      requestId: env.meta?.requestId,
    });
  }
  return {
    data: env.data as T,
    pagination: env.meta?.pagination,
    requestId: env.meta?.requestId,
  };
}
