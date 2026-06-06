/**
 * Stable API envelope shape (`/api/v1`). Types only — the full parser/guard is
 * US-E06.1. `bootstrap/lib/http.ts` interceptor unwraps the axios layer, so
 * repositories receive THIS envelope, then read `.data` / branch on `.error.code`
 * (api-integration rule, decision `0008`).
 */
export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  fields?: Array<{ field: string; message: string }>;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: { requestId?: string; timestamp?: string };
}

/** Extract `error.code` from a thrown axios error carrying an error envelope. */
export function errorCodeOf(err: unknown): string | undefined {
  const data = (err as { response?: { data?: unknown } }).response?.data;
  const code = (data as { error?: { code?: unknown } } | undefined)?.error
    ?.code;
  return typeof code === "string" ? code : undefined;
}

/** HTTP status of a thrown axios error, or `undefined` if no response. */
export function statusOf(err: unknown): number | undefined {
  return (err as { response?: { status?: number } }).response?.status;
}
