---
name: project-e19-social-shared-dialog-pattern
description: E19 Social Feed (US-E19.1) + Content Moderation (US-E19.2) cross-story shared-component AC pattern — how to split AC when one story owns a shared dialog contract consumed by another
metadata:
  type: project
---

US-E19.1 (Social Feed) and US-E19.2 (Content Moderation) share a component:
`ReportContentDialog` (contract owned by US-E19.2, `moderation.reportDialog.*`
i18n namespace). Pattern used for splitting use-cases.md AC across the two
packets, reusable for future shared-component pairs (e.g. US-E10.6 messaging
also consumes the same dialog later):

- **Owning story** (US-E19.2) writes the FULL AC for the shared component's
  own internal behavior: open/close, field validation, submit states, error
  states, i18n keys, focus trap. This lives in ONE use-cases.md only.
- **Consuming story** (US-E19.1) writes exactly ONE cross-story AC per entry
  point verifying only that (a) the correct shared component/contract is
  invoked, (b) with the correct props (kind/contentId/authorName/content),
  and explicitly states "the dialog's own internal behavior is specified and
  tested exclusively in <owning story>'s use-cases.md and MUST NOT be
  re-asserted here." Labelled `[CROSS-STORY]` in the AC ID (e.g. AC-1906.3).
- Also mirror the dependency direction from requirements.md/integration.md
  (owning story's Dependencies section explicitly states "US-EXX depends on
  US-EYY for the shared X contract" and sequencing guidance for `/fe`
  parallel-branch claim). Restate that in use-cases.md's intro paragraph so
  a reader of either file alone gets the pointer without hunting.

Why: avoids the DR-001 i18n/component drift lesson (duplicate key sets /
forked component copies across features) at the use-case/AC layer, not just
component-placement layer — `ba-lead`/`fe-lead` already have
`component-organization.md` for code; this is the BA-side mirror for specs.

Also used in this same pair: **mock-first boundary as a test-note AC, not an
error-path AC** — US-E19.1's pin/unpin (FR-011, BE US-101 in_progress) got an
AC labelled `[TEST NOTE — mock-first boundary, not a failure path]` asserting
non-persistence across reload is the PROOF of correct mock scoping, not a bug.
Reusable phrasing for any other mock-first FE-ships-ahead-of-BE feature.

And: **403-vs-transient distinction as a paired AC, not a single one** — for
destructive/high-risk actions (US-E19.2 FR-108 Remove-content), model the
forbidden-error AC and the transient-error AC side by side, explicitly
contrasting their retry-affordance and copy differences, plus one extra AC
asserting the failure-union mapping branches on `error.code` not
`error.message` (code-review-verifiable, not just runtime-observable).
