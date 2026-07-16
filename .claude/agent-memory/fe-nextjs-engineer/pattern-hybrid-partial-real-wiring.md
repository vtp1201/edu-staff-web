---
name: pattern-hybrid-partial-real-wiring
description: E18.13 — one-method-real hybrid facade + reactive-gate remap (client pre-check → server 422); Result-repo error mapping; dual-namespace dynamic-i18n
metadata:
  type: project
---

US-E18.13 academic-records seal remap (ADR 0055). Reusable when ONE method of a
multi-method Result-repo goes real while the rest stay permanently mock.

**Hybrid facade over per-method if-branch.** New
`HybridXxxRepository implements IXxx` with `constructor(real, mock)`; the real
method delegates to `real`, every other to `mock`. Keeps the real HTTP adapter
single-purpose (other methods stay `notImplemented()` dead code) and the mock
the single source of truth. DI: `const mock = new Mock(); if (USE_MOCK) return
mock; await ensureFreshSession(); return new Hybrid(new Real(http), mock);`.

**Reactive gate = drop the client pre-check.** When a client-side "can I do X?"
pre-check (`getSealStatus` → block) has no wire source, the use-case becomes a
thin pass-through and the gate moves to a reactive failure mapped from the real
POST's 422 (e.g. `unlocked-grades-exist`). The old status read stays mock but is
re-labeled decorative/non-authoritative in the VM (doc-comment on the field).

**Result-repo error mapping** (repo returns `SealResult`, not throws): catch →
`toFailure(err)` using `errorCodeOf`/`statusOf` (branch on code first, status
fallback), return `{ok:false, error}`. Two same-status codes (both 422) → branch
on code, never message.

**Bare POST, no body** when the Go handler builds input from path params +
`actorFrom(c)` (JWT) and never `bindAndValidate`s — `http.post(url)` only;
domain signature can still carry `actorId` for the mock's audit lookup but it
must NOT reach the wire. Ground-truth by checking the handler, not just openapi.

**Dual-namespace dynamic i18n gotcha:** extending a shared failure union means
EVERY namespace doing `t(\`errors.${key}\`)` over the full union needs the new
keys or tsc fails. Seal feature had TWO (viewer `academicRecord.error` +
`academicRecordSeal.errors`) — add/remove in both, vi source + en mirror.

**notImplemented() throws synchronously** (`return this.notImplemented()`), so
test it with `expect(() => repo.x()).toThrow()`, NOT `.rejects.toThrow()`.

SB interaction runner works via `bun run vitest:storybook run <file>` (the
`--project storybook` flag does NOT exist); next-intl timeZone console.error is
a pre-existing noise, not a failure.
