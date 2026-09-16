---
name: pattern-page-level-fanout-and-modal-conversion
description: US-E24.20 — fix a repo-refused call at the CALLER (page fan-out + display-only passthrough param), and what converting an inline/Sheet form into a modal Dialog breaks in existing stories
metadata:
  type: project
---

Three things US-E24.20 (backlog batch 6: leave fan-out, principal read-only
gate, form consolidation) settled.

**1. A repository that REFUSES an under-specified call is right; fix the
callers.** `DisciplineRepository.getLeaveRequests` threw `not-found` before any
HTTP when `classId` was missing (core requires exactly one of
`classId`/`studentMemberId`). Two dashboards called `execute({})` and their
`try/catch` swallowed it → a silently empty tab. The fix is a
`Promise.allSettled` fan-out **in the RSC page** over a class-id list the page
can legitimately obtain — teacher: `makeListMyTeacherClassesUseCase()` filtered
to `roles.includes("homeroom")` (the same set `makeLeaveDecisionAuthContext()`
derives, and the only one core's TEACHER branch authorizes); principal: drain
`makePrincipalClassesRepository().listClasses({academicYear, limit: 100})`.
Build the use-case ONCE and reuse it across the N `.execute()` calls — the
factory does `ensureFreshSession()` + `createServerHttpClient()`.
**Why:** weakening the guard would make every future caller guess a class.
**How to apply:** when a fan-out makes rows visible in real mode FOR THE FIRST
TIME, audit what those rows render. Here `leave-tab.tsx` shows `req.className`
and the mapper defaulted it to `""` — so the same commit had to add an optional
`className` **display-only passthrough** (never a query param) to the repo
interface + use-case, or it would ship a blank-label defect alongside the fix.
Related: [[pattern-per-card-fanout-and-server-urgency]],
[[pattern-carve-out-unmock-and-canonical-dialog]] (same feature's ground truth).

**2. Page-level fan-out is TDD-able via the returned-element props.** These two
routes had no `page.test.ts`; the repo convention (`question-bank/page.test.ts`)
is `vi.mock` every `@/bootstrap/di/*` import, `await Page({searchParams})`, then
assert `el.props.<x>`. That covers the homeroom filter, the single-use-case-
instance claim, per-class degrade, and every empty path — none of which the
repository or story layers can see.

**3. Converting an inline/Sheet form into a MODAL Dialog invalidates story
queries in two specific ways.** (a) Everything moves to a portal:
`canvas.getBy…` → `within(document.body)`. (b) Radix marks the background
`aria-hidden`, so **any story that interacted with a background control while
the form was open now finds "no accessible roles"** — e.g. "switching child
closes the open form" cannot be played as written; re-express it as
open → assert background inert (`queryAllByRole("tab")` is empty) → Escape →
switch → assert no dialog. Also drop assertions on client rules the canonical
component does not have (a bespoke `min(10)` reason became "submit disabled
while empty + `reasonRequired` text"; a bespoke past-date check became the
date input's `min` attribute).
**How to apply:** when consolidating N bespoke forms onto a shared dialog, add
ONE optional prop (`showAttachments`) whose DEFAULT preserves the existing
consumer, and make the disabled mode change the PAYLOAD too (`files: []`) —
a control you hide must not still collect data nobody consumes (ADR 0067).
Deleting the bespoke forms also orphans more i18n keys than the packet names
(here `type`, plus `close` and `reasonPlaceholder`) — grep the whole namespace,
not just the key you were told about.
