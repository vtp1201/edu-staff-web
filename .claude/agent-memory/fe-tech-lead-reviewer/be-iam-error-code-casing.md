---
name: be-iam-error-code-casing
description: IAM wire error codes are UPPER_SNAKE (codeFromKey uppercases); iam-member.repository.ts matches lowercase and is likely a live bug
metadata:
  type: project
---

IAM's HTTP boundary `pkg/kit/response.WriteError` runs `codeFromKey()` = `strings.ToUpper(key)`
on the Go i18n error key, so the **wire** codes are UPPER_SNAKE
(`INVITATION_INVALID`, `INVITATION_EXPIRED`, `RATE_LIMIT_EXCEEDED`, `FORBIDDEN_ACTION`, …).
`services/iam/docs/openapi.yaml` documents the same UPPER_SNAKE codes.

**Why:** ground-truthed by the US-E18.53 engineer against the edu-api checkout and confirmed by me
during that review. It contradicts what a sibling story assumed.

**Suspected live bug (NOT yet fixed):** `src/features/auth/infrastructure/repositories/iam-member.repository.ts`
→ `mapIamFailure()` switches on **lowercase** keys (`"invitation_invalid"`, `"member_not_found"`,
`"forbidden_action"`, `"rate_limit_exceeded"`, …) with `default: unknown` and **no HTTP-status
fallback**. If the wire really is UPPER_SNAKE, every real IAM failure there degrades to `unknown`
(generic copy instead of the actionable message). Its tests assert lowercase, so they pass while
being wrong. Note the file already hardcodes `"NETWORK_ERROR"` in uppercase — that one is
client-synthesised by `normalizeError`, not from the wire, so mixed casing there is expected.

**How to apply:** when reviewing any IAM-facing failure mapper, require case-normalisation
(`errorCodeOf(err)?.toUpperCase()`) **plus** an HTTP-status fallback switch — the pattern
`invitation-redeem.mapper.ts` uses. Escalate the `iam-member.repository.ts` fix as its own story;
it needs a live-BE check to settle, and it will invalidate that file's existing tests.
