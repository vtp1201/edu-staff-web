---
name: us-e11.9-qa-patterns
description: QA findings for US-E11.9 teacher question bank — real AC-902.8 bug found via test-writing, sonner a11y-announcer duplicate-node pitfall, dead VM prop drift
metadata:
  type: project
---

US-E11.9 (teacher question bank) QA pass, 2026-07-17. Independent AC-derivation
against 72 ACs (spec.md + use-cases.md) found engineer's self-reported coverage
was mostly solid but had a genuine defect and several untested-but-claimed ACs.

**Real bug found (reported, not fixed): AC-902.8 defense-in-depth 422 violated.**
`question-bank-list-screen.tsx`'s `showSearchGate` is purely client-filter-state
based (`scope==="search" && !filterSatisfied`) — it does NOT special-case the
`search-filter-required` errorKey. When the client gate is satisfied (tag typed)
but the server still returns `422 QUESTION_SEARCH_FILTER_REQUIRED` (stale
state/regression), the query's `isError` branch renders the generic
`QuestionBankErrorState` banner instead of `QBFilterRequiredPrompt` — exactly the
outcome AC-902.8 forbids. Proved with a new failing Storybook interaction test
(`Search_DefenseInDepth422`) left in the suite as red-test evidence. Fix belongs
to `fe-nextjs-engineer` (likely: catch `search-filter-required` in a query
`select`/`meta` and route back into `showSearchGate`, or check the error's key
before falling into the generic isError branch).

**Dead VM prop / spec drift (MAJOR, not currently exploitable): `currentTeacherId`.**
`question-bank-list-screen.i-vm.ts` documents `isMine` as driven by
`authorId === currentTeacherId`, but the actual screen code computes
`isMine: scope === "mine"` — `vm.currentTeacherId` is passed through routes/pages
and VM but never read anywhere in `presentation/`. Currently harmless because
`GET /questions` (mine scope) only ever returns the caller's own questions and
search scope always uses the View label — but it's a footgun if search ever
needs to distinguish an own-authored PUBLISHED hit from a cross-teacher one.

**Sonner toast interaction-test pitfall.** Sonner renders BOTH the visible toast
AND an offscreen a11y-announcer node with identical text; a bare
`toaster.findByText(...).toBeVisible()` can flakily grab the hidden announcer
div (`<div class="" data-title="" />`, not visible). Use
`await waitFor(async () => { const nodes = await toaster.findAllByText(...); expect(nodes.some(n => n.checkVisibility())).toBe(true); })`
instead. See [US-E19.1 pattern](us-e19.1-qa-patterns.md) for the analogous
EmptyState duplicate-text case.

**Gaps closed with new tests** (all in this story's stories/tests, not new prod
code): AC-902.1 zero-network-call proof via `fn()`-wrapped `searchAction` spy +
`not.toHaveBeenCalled()`; AC-902.2 subject-based gate-satisfy story (previously
only tag-based was tested); AC-902.4 clear-both-filters-reverts-to-gate; AC-904.8/
AC-905.6 already-published race (save-path and publish-confirm-path) — zero
Storybook coverage existed despite being explicitly in the `use-question-bank-builder.ts`
`resyncLocked` code path; AC-906.6 edit-CTA-hidden explicit button-role assertion
on a cross-teacher search card; and a fully-missing `create/page.test.ts`
route-guard test (list and edit routes had one, create route had none — AC-907.1/.2/.4
gap).

**Genuinely well-covered, verified not just claimed:** FR-009 PUT-payload-shape
test that inspects `updateExec.mock.calls[0]` and asserts the 4 immutable fields
are absent (`actions.test.ts`); FR-007 all-3-questionTypes `expectedAnswer`-optional
via `it.each` in `validate-question.test.ts`; `forbidden-browse`/`forbidden-edit`
call-site-branch (not code-branch) mapper split in `map-question-bank-error.test.ts`;
a11y wiring (`aria-invalid`/`aria-describedby`/`role="alert"`) genuinely asserted
in `Create_SubjectRequiredInline`/`Create_SubjectNotFoundApi` stories added in the
review-fix pass; no-delete-anywhere confirmed by i18n key inventory (no delete
key exists) + code grep (no delete affordance, `menuAriaLabel` key is an orphan,
never wired to any menu).
