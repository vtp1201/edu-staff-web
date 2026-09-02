---
name: feedback-env-local-use-mock-leak
description: .env.local NEXT_PUBLIC_USE_MOCK=false left set after a live-BE demo breaks the pre-push gate repo-wide (20 files) with confusing errors, not an assertion mismatch
metadata:
  type: feedback
---

`.env.local` (gitignored, bun auto-loads it into `process.env` for every `bun`
invocation including `bun vitest run`) is sometimes left with
`NEXT_PUBLIC_USE_MOCK=false` hardcoded after a live-BE demo session (see
[[live-be-demo-setup]]). This silently overrides the default (unset =
mock-first per ADR 0014/0024) for the whole test run.

**Symptom**: `git push` (pre-push gate) or a bare `bun vitest run` fails ~20
files / ~22 tests, ALL in the shape "resolves Mock...Repository when
NEXT_PUBLIC_USE_MOCK=true" or "...page.test.ts real-mode ..." — i.e. every
DI/page test that exercises the `USE_MOCK ? Mock : Real` gate. The failure
mode can even present as a confusing 5s **test timeout** (real branch tries a
network call) rather than a clean assertion mismatch, and the outer
`git push` error is a bare `error: failed to push some refs` with NO
`[rejected]`/`[remote rejected]` line — easy to mistake for a git/auth/
branch-protection problem instead of a local env leak. Always check
`git ls-remote origin <branch>` (confirms no real divergence) AND
`cat .env.local` before chasing git-side causes.

**Why**: bun's built-in dotenv loader reads `.env.local` before `.env` for
every subprocess; `USE_MOCK` in `bootstrap/lib/mock.ts` is a module-level
constant read once at import, so the override wins for the entire process,
not just one repo/test.

**How to apply**: before running the full test suite or `git push` (which
triggers the pre-push gate), `cat .env.local` and confirm `NEXT_PUBLIC_USE_MOCK`
is either absent or matches intent. If a prior demo session left it `=false`,
comment it out (leave unset — matches `.env.example`'s documented default
mock-first stance) rather than deleting the whole file. This is a session
hygiene issue, not a code bug — never "fix" it by editing the failing tests.
