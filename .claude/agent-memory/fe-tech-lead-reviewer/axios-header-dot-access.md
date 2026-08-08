---
name: axios-header-dot-access
description: Empirically verified — AxiosHeaders dot access is CASE-SENSITIVE, and assigning creates a duplicate header; use .has()/.get() in interceptors
metadata:
  type: project
---

Ground-truthed 2026-08-08 against the repo's axios (`^1.17.0`) with a real
`axios.create()` + stub adapter, reviewing US-E01.3 (`src/bootstrap/lib/http.ts`
request-interceptor header precedence).

**Fact:** despite axios defining
`AxiosHeaders.accessor(['Content-Type', …, 'Authorization'])`
(`node_modules/axios/dist/node/axios.cjs:1214`), reading `config.headers.Authorization`
inside a request interceptor is **case-sensitive**:

- header set as `{ Authorization: "…" }` → `config.headers.Authorization` = the value.
- header set as `{ authorization: "…" }` → `config.headers.Authorization` = `undefined`,
  while `config.headers.has("Authorization")` = `true` (`.has`/`.get` use the
  case-insensitive `findKey` path).
- Worse, assigning `config.headers.Authorization = x` when a lowercase
  `authorization` key already exists does **not** overwrite it — `toJSON()` then
  carries BOTH `authorization` and `Authorization`.

**Why:** it makes a `!config.headers.Authorization` fallback guard silently wrong
for any caller that lower-cases the header, producing two conflicting Authorization
headers on the wire instead of the intended precedence.

**How to apply:** in any interceptor/guard that inspects a header, require
`config.headers.has("X")` / `.get("X")` over dot or bracket access, and require a
lowercase-cased test case. Note that a test which *also* asserts via dot access is
blind to this — it must assert through `.get()`/`toJSON()`.
Today the only per-request `Authorization` setters are
`src/features/auth/infrastructure/repositories/auth.repository.ts` (3 sites, all
correctly capitalised), so this is latent, not live. See [[conventions]].
