---
name: us-e11.6-qa-patterns
description: QA patterns for US-E11.6 student lesson player (courses grid + 2-col player + chapter nav) — real gaps found and closed
metadata:
  type: project
---

US-E11.6 (student lesson player) QA gate findings, 2026-07-09:

- Engineer self-report of 11/11 Storybook stories was accurate and re-verified
  (`bun run vitest:storybook run src/features/lms`) — trustworthy this time,
  unlike some prior stories.
- Real coverage gaps found (all closeable with test-only additions, no prod
  code touched):
  1. **RBAC-rejection unit test missing** for a Server Action file
     (`actions.ts`) despite the story's explicit "RBAC: Chi student"
     requirement and 5 actions all calling `requireRole(["student"])`. This
     repo already has a precedent pattern for this exact test
     (`admin/grades/approval/actions.test.ts`: `vi.mock` the guard module,
     assert `{ok:false, errorKey:"forbidden"}` + use-case NOT called) — always
     grep for that pattern and replicate per-feature; don't assume RBAC is
     "covered" just because the guard call exists in the source.
  2. **AC-7 chapter collapse/expand** — ChapterList has real collapse state
     but zero interaction test exercised it before this gate.
  3. **AC-8 video keyboard controls** (Space play/pause, Arrow seek) — code
     had onKeyDown handlers with a doc-comment citing the AC, but no test
     pressed a key. Comment citing an AC is not proof (echoes US-E17.1 memory).
  4. **AC-15 mobile chapter-list accordion toggle** — `md:hidden` toggle
     button existed, untested. Used the established `page.viewport(375, 812)`
     via `vitest/browser` pattern (addon-viewport not installed — see
     discipline-screen.stories.tsx precedent) since it's a real-browser
     Storybook test runner, not addon-viewport decoration.
  5. **Empty-course fallback** (0 chapters) had zero story coverage — found a
     genuine MINOR copy bug while writing it: `player.content.empty.body` and
     `player.chapterList.emptyCourse` i18n keys are byte-identical strings, so
     both the content-pane empty state AND the chapter-list-nav empty state
     render the same text simultaneously → `getByText` throws
     "multiple elements found". Had to assert `getAllByText(...).toHaveLength(2)`
     instead. Worth a follow-up i18n-copy dedup ticket (not blocking).
- TEST_MATRIX row for US-E11.6 had `Platform = no` even though the evidence
  text in the same row documents tsc/build/biome proof — a doc-flag/evidence
  mismatch, flag to fe-lead rather than silently fixing (not test code).
- Story packet `## Status` field was still `planned` despite tech-lead +
  a11y + design-review all APPROVED and a `design-review.md` present —
  stale-status housekeeping gap, flag don't fix (story.md is fe-lead's file).
