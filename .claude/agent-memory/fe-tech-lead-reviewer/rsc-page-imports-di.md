---
name: rsc-page-imports-di
description: CLAUDE.md's layer table forbids app/page.tsx importing bootstrap/di, but 70 of 90 page.tsx do it — established convention, do NOT flag per-story
metadata:
  type: project
---

`.claude/CLAUDE.md` §Layer rules says `app/page.tsx` (RSC) may import
`presentation/` + `./actions` and must NOT import `bootstrap/di/` or
`infrastructure/`.

**Reality (measured 2026-09-05): 70 of 90 `page.tsx` files import `@/bootstrap/di/*`.**
RSC pages do their own reads through DI factories and hand a finished ViewModel to a
`'use client'` root. This is the actual repo convention.

**Why it's fine:** `page.tsx` is a server component, so `import 'server-only'` in the
DI module still holds — the client-bundle guard is not weakened. The doc line appears
to predate the RSC-reads-directly pattern.

**How to apply:** do NOT raise this as a per-story layer violation — it would fail
almost every route in the repo and is not the engineer's choice. Raise it ONCE to
`fe-lead` as an ADR-worthy doc/code reconciliation (either amend the layer table or
route reads through `actions.ts`). Keep enforcing the parts that ARE live: `presentation/`
must never import `infrastructure/`/`bootstrap/di/`/raw `http`, and `'use server'`
actions call only `bootstrap/di`.
