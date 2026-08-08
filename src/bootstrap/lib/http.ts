import axios, {
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { normalizeError, unwrapResponse } from "./api-envelope";

declare module "axios" {
  // Opt a call out of envelope unwrapping (raw endpoints, or list calls that
  // read `meta.pagination` via `parseEnvelope`). See `bootstrap/lib/api-envelope`.
  export interface AxiosRequestConfig {
    raw?: boolean;
  }
}

// Kong gateway (ADR 0030 / US-E06.3). No `/api/v1` suffix — each endpoint
// constant already encodes the full external path including service prefix and
// `/api/v1` segment (e.g. `/iam/api/v1/auth/signin`).
// Override for direct-service debug: NEXT_PUBLIC_API_URL=http://localhost:8080
// Exported (US-E18.59 / ADR 0072) so the ONE browser-direct caller in the app —
// the public invitation lookup/redeem `fetch` repository — targets the identical
// origin as every axios client instead of minting a second source of truth.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function createHttpClient(token?: string) {
  const instance = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 10_000,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // The client's `token` is only a FALLBACK: a per-request `Authorization`
      // header set by the caller always wins (US-E01.3). Clobbering it made a
      // stale cookie token overwrite the fresh one `auth.repository.ts` passes
      // to `/users/me` right after signin → permanent login deadlock.
      // `.has()` is case-INSENSITIVE (AxiosHeaders#findKey); dot access is not,
      // so a lowercase `authorization` would otherwise slip past the guard and
      // get a second, differently-cased key appended next to it.
      if (token && config.headers && !config.headers.has("Authorization")) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    // Unwrap the BE envelope to its `data` payload (decision `0008`). Raw
    // endpoints (`/health`, jwks) and `{ raw: true }` calls pass through.
    (response) => unwrapResponse(response) as unknown as AxiosResponse,
    (error: unknown) => {
      // Normalize every failure (non-2xx / success:false / transport) into an
      // ApiError carrying code/retryable/fields/requestId/status; branch on
      // `error.code`, never the localized message.
      //
      // Token refresh stays SERVER-side and proactive (decision `0018`):
      // httpOnly cookies can't be rewritten from this interceptor during RSC
      // render. See `ensureFreshSession()` in `bootstrap/di/auth.di.ts`. A
      // reactive 401→refresh→retry safety net is deferred to a follow-up story.
      return Promise.reject(normalizeError(error));
    },
  );

  return instance;
}
