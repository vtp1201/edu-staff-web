# 0068 Moderation: partial real wiring, permanent honest-degrade audit trail

Date: 2026-08-02

## Status

Accepted

## Context

`features/moderation` (US-E19.2) shipped entirely mock-first
(`bootstrap/di/moderation.di.ts`, US-E18.20) behind a detailed 5-gap doc
comment: no queue filters/stats, no detail endpoint, no `COMMENT` report
target, a different concept for "audit trail" (real
`GET /rooms/{roomId}/moderation-audit` is a room role/mute/capability-change
audit, not this feature's dismiss/remove content-moderation trail), and a
missing CAS key (`filedAt`) on resolve/dismiss.

BE US-172 + US-166 (2026-08 batch) closed 4 of these 5 gaps: `GET /reports`
gained `status`/`contentType`/`search` filters (note: `status=all` is
deliberately NOT supported — the corresponding filter tab is removed, not
faked client-side); `GET /reports/stats` now exists (flat
`{pending, resolved}` only — `resolvedThisWeek`/`removed` counts have no
backing and were dropped, not approximated); `GET /reports/{reportId}` now
exists but is explicitly NOT a standalone-shareable deep link (`reportId` is
a clustering column, not a partition key — the caller must also supply
`status` + the REQUIRED `filedAt`, echoed from a prior list response, or get
a `404`); `targetType` gained `COMMENT` for both reporting and moderate-delete
(via the same `resolve` endpoint used for posts). `resolve`/`dismiss` do
require the `filedAt` CAS key, as anticipated.

Gap #4 (the audit trail) remains fully open — no tenant-wide dismiss/remove
audit trail exists anywhere in the real contract.

Separately (found during implementation, not anticipated by intake): the
real `ReportInboxItem`/detail schema never carried several fields the
pre-existing mock DTO invented — reporter identity (deliberate, NFR-098-01),
content preview, content author, duplicate-report count, resolve note. These
are now `| null` end-to-end rather than backed by an invented fallback
string.

## Decision

`bootstrap/di/moderation.di.ts` flips from permanent force-mock to
`USE_MOCK ? Mock : Real` — this is a genuine, near-full un-mock, not a
hybrid split like feed's (ADR 0067): every mutation (`submitReport`,
`dismissReport`, `removeContent`) and every read except one now goes real.

The one exception — `getModerationAuditLog` — honestly degrades: it returns
a typed `{type:"forbidden"}` failure with **zero HTTP attempted** rather
than falling back to mock or fabricating a trail, and the presentation layer
removes the audit tab entirely in real mode (`auditLogEnabled = USE_MOCK`,
mirroring feed's `writesEnabled` gate) rather than showing it empty or
disabled-with-fake-data. A deep-linked `?tab=audit` in real mode falls back
to the queue tab rather than erroring.

The composite addressing key for the non-shareable detail endpoint
(`reportId` + `filedAt` + `status`) is modelled as a domain type `ReportRef`
(with a `reportRefOf()` constructor), threaded from list row → Sheet state
only — never through a URL segment or query param — making "the detail URL
is not shareable" a structural property of the type, not a convention to
remember.

Missing fields (reporter identity, content preview/author, duplicate count,
resolve note) render via a new `UnavailableValue` marker (em-dash + sr-only
"no data" text) rather than an invented placeholder string — `null` (missing
data) is kept observably distinct from `[]`/`0` (genuinely none) throughout.

## Alternatives Considered

1. **Approximate the missing stats fields** (e.g. compute
   `resolvedThisWeek` client-side from a bounded list scan).
   Rejected — the queue's own bounded-scan semantics mean a client
   computation would be wrong/incomplete in exactly the cases that matter
   (a busy tenant with many resolved reports), and would silently disagree
   with the BE's own `pending`/`resolved` counts on the same screen.
2. **Force-mock the whole feature until the audit gap also closes.**
   Rejected — throws away 4 of 5 genuinely-closed gaps and the majority of
   this feature's real value for one still-open capability.
3. **Route `getModerationAuditLog` to the mock repository in real mode** (a
   "fake" audit trail). Rejected — same class of mistake caught in ADR 0067
   (feed): a compliance/audit surface faking success or fabricated content is
   worse than an absent one, doubly so for a moderation audit trail on a
   school-communications product.

## Consequences

Positive:

- Queue browsing, filtering, stats, detail, resolve, dismiss, and remove are
  all genuinely real in production — the large majority of this feature's
  value.
- `COMMENT` is now a first-class reportable/removable target, closing a
  content-moderation gap (comments were previously unmoderatable at all).
- The non-shareable-URL constraint is structurally enforced (`ReportRef`
  never touches routing), not just documented.
- `UnavailableValue`'s null-vs-empty distinction prevents the screen from
  ever silently lying about data it doesn't have.

Tradeoffs:

- Real-mode moderators cannot see a dismiss/remove audit trail until BE
  ships one — the audit tab is simply absent in production today.
- The stat row shows 2 cards instead of the mock's 3 — `resolvedThisWeek`/
  `removed` have no product substitute yet.
- Confirmed during this story (third instance of the pattern, after ask #39
  and the timetable `get_member_timetable.go` finding): `MANAGER` (this
  repo's `principal` appRole) is NOT authorized on this queue at all —
  `core`/`social`'s `REPORT_NOT_ADMIN` gate is tenant-wide `ADMIN` only, no
  room-MODERATOR/room-ADMIN alternative. This is handled correctly (403 →
  `forbidden` → distinct, non-retryable copy, not a collapse into an empty
  state) but is a genuine capability gap for the principal role on the
  `/principal/moderation` nav item that already exists.

## Follow-Up

- Cross-repo ask: BE to add a tenant-wide dismiss/remove content-moderation
  audit trail (distinct from the existing room role/mute audit).
- Cross-repo ask: recurring "MANAGER missing from a `core`/`social` RBAC
  allow-list" pattern (3rd instance: `list_classes.go`/ask #39,
  `get_member_timetable.go`/ask #43, now this queue's `REPORT_NOT_ADMIN`
  gate) — worth a single consolidated BE-side pass across all three instead
  of three separate asks, if BE agrees.
- A shared-primitive Sheet focus-restore bug and a StatCard icon-contrast
  bug were found and fixed during this story's review (both fixed at the
  primitive level, benefiting every consumer repo-wide) — see
  `US-E18.32-moderation-queue-wiring.md`'s Evidence for detail. A latent,
  analogous focus-restore bug in `components/ui/dialog/dialog.tsx` was found
  but NOT fixed (out of scope, flagged as a follow-up — it touches every
  Dialog consumer and needs its own review).
