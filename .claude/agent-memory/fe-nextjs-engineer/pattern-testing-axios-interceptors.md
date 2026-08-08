---
name: pattern-testing-axios-interceptors
description: How to unit-test bootstrap/lib/http.ts interceptors deterministically (stub client.defaults.adapter, dot-access on AxiosHeaders) — US-E01.3
metadata:
  type: project
---

Testing `createHttpClient()`'s interceptors needs NO network and NO axios-mock-adapter
(the repo has neither an adapter lib nor an http.ts test before US-E01.3).

Recipe (`src/bootstrap/lib/http.test.ts`):
- `client.defaults.adapter = async (config) => { captured = config; return {data: <success envelope>, status:200, statusText:"OK", headers:{}, config} as unknown as AxiosResponse }`.
  Returning a real success envelope keeps the RESPONSE interceptor (`unwrapResponse`) on its
  normal path, so one stub exercises the whole chain.
- Assert on `captured.headers.Authorization` — **dot access works**: axios v1 `AxiosHeaders`
  preserves the caller's header casing as own props (verified empirically). No `.get()` needed,
  and the production guard `!config.headers.Authorization` relies on that same behavior.

**Why:** the request interceptor previously set `Authorization` unconditionally, clobbering the
per-request header `auth.repository.ts` passes to `/users/me` after signin → stale-cookie login
deadlock. The default `token` is a FALLBACK only.

**How to apply:** any future change to `http.ts` interceptors (e.g. the deferred reactive
401→refresh→retry) gets proof through this adapter stub rather than a mocked `AxiosInstance`
(mocking the instance tests the caller, not the interceptor). See also
[[pattern-raw-flag-interceptor-guard]].
