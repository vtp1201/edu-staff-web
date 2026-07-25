---
name: project-e20-parent-links
description: E20 Parent-Student Links epic — US-E20.1 (admin) + US-E20.2 (parent consent section) + US-E20.3 (audit trail) status
metadata:
  type: project
---

E20 epic COMPLETE: US-E20.1 (admin parent-links, merged 431df29) + US-E20.2
(parent consent section, merged 19e89cc) + US-E20.3 (link audit trail,
merged 8a8cc9d) all implemented.

US-E20.3 specifics (feature-scoped audit trail per ADR `0064`, closing
US-E20.1's deferred open item):
- Extremely thorough ba packet (spec.md §10 handoff had near-literal code
  snippets for the mock emission mechanics) meant architecture phase
  (component-architect/state-engineer) was correctly skippable — said so
  explicitly to the engineer up front, saved a round-trip.
- `AUDIT_STORE` as a SECOND module-level map in the SAME mock-repository
  file (not a sibling file) — deliberate locality choice since the two
  mutations writing to it already live there; independent of the
  active-links `STORE` so history survives unlink (FR-108).
- `recordAuditEntry(...)` called strictly after every existing guard
  clause (re-auth, already-linked, validation, not-found), never
  reordering the US-E20.1 HIGH-RISK re-auth — reviewer traced this
  line-by-line and confirmed the diff had zero `-` lines in the
  guard-clause region, only added `+` lines. This "trace the diff, don't
  trust the summary" verification is the right bar for wiring a
  side-effect onto an existing HIGH-RISK mutation.
- Review found 1 MUST-FIX: a byte-identical error banner had been
  hand-inlined in both `PLConsentDetailSection` and the new
  `PLAuditTrailSection` (decision 0026 duplication). The existing shared
  `components/shared/list-error/list-error.tsx` genuinely didn't fit
  (its whole shape-family is a large centered card; this needed a small
  left-aligned inline banner) — correctly extracted a NEW small
  feature-local component (`pl-section-error-banner.tsx`) instead of
  forcing a mismatched preset onto `ListError`. Lesson: decision 0026
  doesn't always mean "use the existing shared component" — sometimes
  the right canonical home is a new, narrower one, if the existing
  shared component's shape family is a genuine mismatch.
- A design-spec.jsonc vs AC text conflict (error banner should use
  `--edu-error-dark`/`--edu-error-dark-light` per the doc vs `bg-edu-error/10`/
  `text-edu-error-text` per the story's own AC-101.3, for consistency with
  the sibling section) — reviewer ruled AC wins (both are valid tokens;
  the dark/dark-light pair is reserved for discipline-severity ADR 0040,
  doc was simply stale) and I (fe-lead) corrected the doc, not the code.
  This is the right split: reviewer adjudicates which artifact is
  correct, fe-lead owns the doc-only fix.
- QA found DEF-1 (Major): note-render was gated only on `entry.note`
  truthy, not on `entry.action === "created"` — not reachable today (data
  layer already normalizes it) but a real defense-in-depth gap per this
  team's "unsuppressable by construction" convention (cf.
  `sd-self-approved-note.test.tsx`). Fixed with an action-scoped render
  guard + a `renderToStaticMarkup` regression test. Deliberately did NOT
  expand into a discriminated-union type-level fix in this US — noted as
  a follow-up instead (ripples into mapper/mock-store/fixtures beyond a
  small extension's scope).
- Two Storybook flakes hit pre-push in this run, both unrelated to this
  story's files and both passed in isolation on retry:
  `feed-screen.stories.tsx` (previously known) and NEW
  `invitations-screen.stories.tsx` > "Send Dialog Escape On Open Select
  Keeps Dialog Open" ("component failed to render properly... Storybook
  configuration issue"). Confirms the retry-before-concluding-regression
  policy should treat ANY isolated-unrelated-file storybook flake the
  same way, not just the one previously named file.

US-E20.2 specifics (parent-facing extension of the already-implemented
Profile screen, US-E08.5):
- New independent domain/infra module `src/features/parent-links/` (deliberately
  NOT reusing `src/features/admin/parent-links/`'s repository — story required
  independence; shared entity-shape convention only).
- Latent bug found+fixed in scope: `profile/page.tsx` had hardcoded
  `MOCK.role = "teacher"` for the WHOLE screen (not just this feature) — fixed
  by extracting `getSessionRole()` (mirrors `makeParentLinksAuthContext()`'s
  `decodeRoleClaim`+`getAccessToken` pattern) and using the real role for both
  the display field and the new parent-only gate. Treated as in-scope, not
  creep, since AC-007.2 ("server-driven, not client-hidden") is literally
  untestable against a hardcoded mock role.
- AC-007.2 (VM-omission role gate) proof pattern: a tiny pure function
  (`parentConsentVmGate(role)` in `consent-gate.ts`) returning `{parentConsent:true}`
  or `{}` (empty object, not `{parentConsent:false}`), unit-tested directly —
  this is the clean way to prove "field genuinely absent" without a full RSC
  route-render harness. Reusable pattern for future role-gated VM fields.
- fe-component-architect's promotion ruling: don't force-generalize a 2nd
  occurrence into `components/shared/` when the shapes actually differ
  (`ConsentSkeleton`'s card-shimmer vs `PLSkeleton`'s table-row-shimmer) —
  defer promotion to the 3rd occurrence. Cut a planned `ConsentEmpty` wrapper
  entirely in favor of using `components/shared/empty-state` inline (only one
  empty variant needed).
- fe-state-engineer's deliberate deviation from `LinkedAccountsSection`'s
  `onSettled: invalidateQueries` precedent: this feature uses ONLY targeted
  `setQueryData` patch/rollback per (studentId,category), never
  `invalidateQueries` on toggle settle — a whole-list refetch would race a
  different in-flight optimistic toggle on the same cached array. Worth
  reapplying whenever a list has >1 independently-mutable row.
- [[feedback-agent-relay-resilience]] — this run's engineer agent died mid-task
  (API connection drop) with useful partial work already committed-worthy on
  disk; recovering by committing in logical layer chunks (domain+infra+DI →
  presentation+wiring → docs) rather than one giant commit kept the branch
  bisectable and made resuming trivial.
