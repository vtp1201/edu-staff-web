---
name: pattern-public-unauth-flow
description: E18.53 — building a PUBLIC unauthenticated flow (invitation redeem): bare-client DI, real-axios call-shape proof, IAM UPPER_SNAKE wire codes, concurrent-run phantom failures
metadata:
  type: project
---

Built the first PUBLIC (pre-account) flow in this repo: `(auth)/invitations/redeem?token=`
(IAM US-191). Four transferable lessons.

**Why:** every other DI factory in the repo assumes a session exists; copying one onto a
public endpoint silently attaches a bystander's cookie to an account-creation call.

**How to apply:** next time a BE endpoint is marked `security: []`.

### 1. Public endpoint ⇒ BARE http client
`bootstrap/di/<x>.di.ts` must use `createHttpClient()` (no token), NOT
`createServerHttpClient()` (reads the `auth_token` cookie) and NOT `ensureFreshSession()`.
Prove it in the di test with a call-recorder: `vi.doMock("@/bootstrap/lib/http", …)` pushing
`"http:no-token"` vs `"http:token"`, plus `expect(calls).not.toContain("refresh")`.

### 2. Proving "the credential never hits a query string"
Stubbing the `http` object only proves the repo's intent. The strong proof builds the REAL
client and replaces only the transport:
```ts
const http = createHttpClient();
http.defaults.adapter = async (config) => { sent.push(config); return {data, status, headers, config} as any };
```
Then assert on the resolved `InternalAxiosRequestConfig`: `JSON.parse(config.data)`,
`config.params === undefined`, `config.headers[...]`, and a hand-serialised
`baseURL+url+?params` string that must equal the bare path. Non-2xx: throw
`Object.assign(new Error(), {isAxiosError:true, response, config})` so the real
`normalizeError` runs. (`axios/unsafe/helpers/buildURL.js` exists but is a default export
with no types — hand-roll the serializer instead.)

### 3. IAM wire `error.code` is UPPER_SNAKE
`pkg/kit/response.WriteError` → `codeFromKey()` = `strings.ToUpper(goI18nKey)` (since the
Epic-0 commit). So the wire is `INVITATION_INVALID`, `RATE_LIMIT_EXCEEDED`, …
`iam-member.repository.ts`'s mapper (US-E18.6) matches the **lowercase** key and its tests
assert lowercase — one of the two is dead code against a live BE. Flagged, not fixed.
New mappers: `errorCodeOf(err)?.toUpperCase()` + an HTTP-status fallback switch.
Also drifting: the openapi says 422 for the password policy, but Go returns **400
`user_weak_password`** (policy lives past the tag validator); 429 DOES send `Retry-After`.

### 4. Phantom test failures = concurrency, not the diff
Running `bun run build` (or the Storybook suite) at the same time as `bun vitest run` in the
same worktree produced 1–31 failures with 5000ms timeouts, in unrelated files. Isolated runs
were green every time. Before believing a full-suite failure, re-run it alone.

Related: [[gotcha-openapi-drifts-from-go-source]], [[pattern-throwing-repo-failure]],
[[pattern-raw-flag-interceptor-guard]].
