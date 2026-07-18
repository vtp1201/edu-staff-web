---
name: reference-nextjs-server-action-error-boundary
description: Server Action error-return convention this repo uses, why raw-throw actions are risky for client-side branching, and the redirect-guard import path
metadata:
  type: reference
---

Repo convention (confirmed via `loginAction`/`socialSigninAction`,
`src/app/[locale]/(auth)/login/actions.ts`): a Server Action that needs the
client to branch on failure type must have its use-case return a `{ data,
error }` result and the action itself return a **discriminated result**
(`{ errorKey?: Failure["type"] }`), never let a raw `ApiError` throw across
the action boundary uncaught. Reason: Next.js Server Actions redact thrown
Error detail across the server→client boundary in production builds — only
`message`/`digest` reliably survive; custom subclass properties like
`ApiError.status`/`.code` are not guaranteed to serialize through. A client
`try/catch` reading `err.status === 403` on a raw-thrown action error works
in dev but is unreliable in prod.

Found a real violation of this convention during US-E23.1 design:
`switchTenantAction` (`src/app/[locale]/(auth)/select-tenant/actions.ts`,
pre-dates this convention, from US-E05.1) lets `SwitchTenantUseCase` /
`TenantRepository` throw a raw `ApiError` uncaught — no `toFailure()` mapper,
no failure union in `features/tenant/domain/`. Flagged to fe-lead as a
data-contract decision (recommended fix: add `TenantFailure` union +
`toFailure()` mirroring `AnnouncementRepository.toFailure()`
(`errorCodeOf`/`statusOf` pattern), action returns `{ ok, errorKey }`).
Check for this class of gap whenever a story wraps an EXISTING Server Action
in new client-side error-branching logic — grep the action + its use-case +
repo chain for an uncaught throw before assuming `err.status` will be
readable client-side.

**Redirect-vs-error disambiguation**: when a Server Action's success path
calls `redirect()` (throws `NEXT_REDIRECT` digest internally) and its error
path can ALSO throw, the client wrapper needs `isRedirectError` to
rethrow the redirect unchanged. No stable public re-export exists in this
repo's installed Next version (16.2.7) — `next/navigation.d.ts` does not
export it (verified via grep). Import path:
`next/dist/client/components/redirect-error` (deep import — this is the
same file Next's own `redirect.js` imports from internally, so it's
canonical, just not publicly re-exported). Existing repo tests
(`login/actions.test.ts` etc.) instead assert on `error.digest` string
content directly (`expect.stringContaining("NEXT_REDIRECT")`) since none of
those cases needed to disambiguate redirect-vs-application-error inside the
same try/catch — US-E23.1 (tenant switch dialog) was the first consumer
that did.
