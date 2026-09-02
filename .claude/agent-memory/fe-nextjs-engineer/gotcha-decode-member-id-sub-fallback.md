---
name: gotcha-decode-member-id-sub-fallback
description: decodeMemberId() silently falls back to `sub`, so "read memberId, never sub" (ADR 0074) is NOT enforced by it — use decodeMemberIdClaim(); also: bootstrap/lib helpers must take a feature's mock seed as a parameter
metadata:
  type: feedback
---

`src/bootstrap/lib/jwt.ts` — `decodeMemberId(token)` returns
`claims.memberId ?? decodeSubClaim(token)` (legacy tokens minted before IAM
added the claim). So calling it does NOT satisfy decision 0074 ("read
`memberId`, never `sub`"): a token with only `sub` still yields an id and the
call goes out. Added `decodeMemberIdClaim()` (US-E24.1 fix round) — claim only,
`null` when absent, empty string rejected.

**Why:** in `resolve-my-class.ts` the doc comment claimed 0074 compliance while
the code used the falling-back helper. The red test ("`sub` but no `memberId`
→ null AND no HTTP call") exposed it: the return was null only by accident
(the mocked GET returned `undefined`), the request had already fired.

**How to apply:** whenever the claim's PRESENCE is the guarantee (it is what
proves the token is tenant-scoped), use `decodeMemberIdClaim()`. Prove it with
a `sub`-only token test that asserts BOTH `null` AND `expect(httpGet).not.toHaveBeenCalled()`
— asserting the return value alone passes for the wrong reason.

Same round, related layering rule: a `bootstrap/lib` helper must never import a
feature's `*.fixtures` for its `USE_MOCK` branch. Give it a `mockClassId`-style
parameter (default `null`) and let the feature's DI factory pass its own seed
(`resolveMyLmsClassId()` in `bootstrap/di/lms.di.ts`). Otherwise the next
non-LMS caller silently gets the LMS mock's class id.

See also [[pattern-usecase-result]] — the same round narrowed `isLmsFailure` to
membership in the exhaustive `LMS_FAILURE_TYPES` array, because a loose
`typeof type === "string"` guard hands a stray thrown object's `type` to the
client, which presentation renders through `t("errors." + key)` as a raw key.
