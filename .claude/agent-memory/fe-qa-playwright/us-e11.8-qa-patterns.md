---
name: us-e11.8-qa-patterns
description: Teacher lesson-plan authoring QA — RSC edit-page had zero redirect-gate test, already-published race path untested at every layer, unenforced AC-002.3 length limits, missing clear-filters i18n key
metadata:
  type: project
---

US-E11.8 (lesson-plan authoring, 62 AC) confirmed the recurring "self-report understates
gaps" pattern and added two new reusable findings:

- **The edit-route `page.tsx` (FR-008/UC-008 single-GET visibility gate) had ZERO test
  coverage** — only the sibling `actions.ts`'s `actions.test.ts` was tested; the redirect
  target logic (`?notice=access-denied` vs `?notice=not-found`, stay-on-route for
  network-error) lived only in the RSC page function itself. Applied the
  [[us-e03-1-qa-patterns]] recipe directly: `vi.mock` the DI module, `await import("./page")`,
  call the default export with a hand-built `params` Promise, catch the thrown
  `NEXT_REDIRECT;...` digest. 8 new tests, all node-env, no browser needed.

- **The "already-published" concurrent-edit race (AC-002.4 save-draft, AC-004.5 publish)
  was untested at every layer** — the use-case unit tests only proved the failure *maps*
  correctly (`{type:"already-published"}`), but the UI-level auto-lock/resync behavior
  (`resyncLocked` in `use-lesson-plan-builder.ts`: banner shows, fields disable, refetch
  fires) had no story and no hook-level test. `use-cases.md`'s own edge-case matrix names
  this scenario explicitly ("concurrent-edit-after-published-elsewhere") — that should have
  been a flag to check for a dedicated story, not just unit-level failure-mapping coverage.
  Wrote 2 new builder stories exercising the full round-trip (mock `saveDraftAction`/
  `publishAction` returning the race error, mock `refetchAction` returning the now-PUBLISHED
  plan, assert banner text + auto-lock + no Save/Publish controls remain).

- **AC-002.3's field-length limits (objectives/assessmentMethod ≤5000,
  contentOutline/activities ≤20000) are not enforced anywhere** — no `maxLength` on the
  `Textarea`s, no client validator branch (`validate-lesson-plan.ts` only checks title/tags),
  and the ground-truthed `LessonPlanFailure` union (11 BE codes) has no corresponding error
  code either. This is a genuine spec-vs-implementation gap, not a missing test — flagged as
  a finding (MAJOR), no test written to assert broken behavior as if it were a real
  requirement.

- **Confirmed a real i18n defect while writing the filtered-empty story**: the mine-scope
  "no client-side match" empty state's clear-filters CTA is wired to `t("error.retry")`
  ("Thử lại"/"Retry") — there is no dedicated "Bỏ lọc"/clear-filters key in the shipped
  `lessonPlan` namespace (confirmed by grepping the actual `vi.json`, not trusting spec.md's
  cited copy, which says "Bỏ lọc" but that string doesn't exist in the JSON). Also reused for
  the list-screen notice-dismiss "X" button and the builder's race-banner dismiss "X" —
  3 call sites reusing a "Retry" label for what are actually dismiss/clear actions. Wrote the
  test to match the REAL rendered copy (not spec's aspirational text) + documented the defect
  in prose, rather than writing an intentionally-failing assertion.

- General recipe reused successfully: `page.viewport(w, h)` via `await import("vitest/browser")`
  for real-Chromium NFR-002 responsive checks at 320/375/1280 (list grid + builder 2-col/1-col
  stack), asserting `document.documentElement.scrollWidth` for no-horizontal-overflow and
  `getComputedStyle(...).gridTemplateColumns` for the actual breakpoint engagement (not just a
  className string match — see [[us-e17-1-qa-patterns]]/[[us-e03-1-qa-patterns]]).

- Also noteworthy: the design-spec.jsonc's "stacks below 860px" language does NOT match the
  actual Tailwind breakpoint used (`lg:` = 1024px default, no custom `--breakpoint-*` override)
  — a MINOR spec-vs-code drift, not a defect (no layout break results, just an earlier-than-
  promised collapse point).
