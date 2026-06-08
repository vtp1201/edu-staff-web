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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export function createHttpClient(token?: string) {
  const instance = axios.create({
    baseURL: API_URL,
    headers: { "Content-Type": "application/json" },
    timeout: 10_000,
  });

  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (token && config.headers) {
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
