import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

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
    (response) => response.data,
    (error: AxiosError) => {
      // Token refresh is handled SERVER-side and proactively (decision `0018`):
      // httpOnly cookies can't be rewritten from this interceptor during RSC
      // render. See `ensureFreshSession()` in `bootstrap/di/auth.di.ts`. A
      // reactive 401→refresh→retry safety net is deferred to a follow-up story.
      return Promise.reject(error);
    },
  );

  return instance;
}
