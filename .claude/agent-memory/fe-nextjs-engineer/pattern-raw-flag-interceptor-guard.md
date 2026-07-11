---
name: pattern-raw-flag-interceptor-guard
description: raw:true must be a config-level sibling of params (NOT nested); regression-guard test runs real unwrapResponse
metadata:
  type: feedback
---

For cursor-paginated list calls the repo needs the full envelope: pass
`this.http.get(url, { params: {...}, raw: true })` — `raw: true` is a **top-level
sibling of `params`**, NEVER `params: { ..., raw: true }`.

**Why:** `bootstrap/lib/api-envelope.ts` `isRawCall(config)` reads `config.raw` at
the axios config top level. If `raw` is nested in `params`, the interceptor
auto-unwraps the envelope; the repo's `parseEnvelope(alreadyUnwrappedPayload)`
then throws `ApiError({code:"UNKNOWN_ERROR"})` because `payload.success` is
undefined → every real-mode list call silently fails as network/unknown. US-E18.19
swept 7 repos that had this bug (principal-teachers, class-log, subject-catalogue,
class-management, roster, teacher-class + teacher-dashboard `fetchAllPages`).

**How to apply:** plain mocked-`http.get` unit tests do NOT catch this (they return
an envelope directly, bypassing the real interceptor). Add a regression-guard
`describe("… real interceptor pipeline (raw-flag placement)")` whose `interceptedGet`
pipes the response through the REAL `unwrapResponse` imported from
`@/bootstrap/lib/api-envelope`, reading only top-level `config.raw`:

```ts
function interceptedGet(bodyFor: (url: string) => unknown) {
  return vi.fn(async (url: string, config?: { params?: unknown; raw?: boolean }) =>
    unwrapResponse({ data: bodyFor(url), config: { url, raw: config?.raw } }),
  ) as unknown as AxiosInstance["get"]; // omit cast if makeHttp takes ReturnType<typeof vi.fn>
}
```

Assert the list call returns ok/correctly-shaped data — RED under nested-raw,
GREEN once hoisted. Reference: `staffing.repository.test.ts` (US-E18.2, the
originally-correct template). Cast note: `as AxiosInstance["get"]` when `makeHttp`
takes `Partial<AxiosInstance>`; drop the cast when it takes a raw
`ReturnType<typeof vi.fn>` (type clash otherwise).
