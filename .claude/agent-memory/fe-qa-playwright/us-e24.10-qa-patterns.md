---
name: us-e24.10-qa-patterns
description: US-E24.10 teacher course tab (reorder/patch/create/publish/delete, high-risk lane) — QA patterns, gaps found and closed
metadata:
  type: project
---

US-E24.10 (teacher class-hub course tab: drag/keyboard reorder, inline window
edit, add lesson/assignment/document, EXAM→exam-bank nav, publish, delete) had
an exceptionally strong pre-existing baseline: resolver (`resolveCourseTimelineMode`),
`buildReorderedItemIds` array builder (full edge-case sweep — head/tail move,
adjacent swap, no-op same-row, unknown-id throw), all 7 mutation use-cases,
the VM-assembly layer (`course-vm.ts` — GVBM/GVCN subject resolution, stale
`?subjectId=` forgery ignored, forbidden-vs-no-course distinction), the
`actions.course.test.ts` forge-role sweep (7 mutations × 2 forge scenarios +
cross-class courseId forgery, asserting zero use-case calls), and the A11Y-001
fix (aria-disabled + no-op guard + sr-only live region) all had genuine,
non-vacuous test proof — this is now a repeated pattern across the E24 teacher
lane (E24.7/8/9/11), not a one-off.

**Real gap found**: the AC "Thêm Tài liệu url `http://` → lỗi field; `https://`
→ gọi thật" only had the `http://` REJECTION half tested
(`DocumentUrlValidation` in `teacher-course-tab.stories.tsx`) — the `https://`
SUCCESS half (dialog actually calls `addDocumentItem` with the right args and
closes) was an untested claim despite the AC reading as fully covered. Closed
with a new `DocumentUrlHttpsSubmits` story.

**New pitfall (add to the userEvent.type gotcha list)**: `userEvent.type` on a
`<input type="url">` dropped the leading 5 characters ("https") of a typed
string in this Chromium/vitest-browser runner, producing
`://example.edu.vn/...` — NOT a production bug (reproduced independently of
the component's own state/validation logic), a browser-input-type quirk under
fast simulated typing. Fix: `fireEvent.change(input, { target: { value } })`
to set the full value in one shot instead of char-by-char `userEvent.type`,
when the field's `type` attribute is `url`/similar and the exact keystroke
sequence isn't itself under test. (`http://` — 4 chars — typed fine in the
sibling rejection story; only the longer `https://` prefix triggered it, so
this is likely input-length/timing dependent, not scheme-specific — treat any
`type="url"` field typed via `userEvent.type` with suspicion and verify the
resulting `.value` before trusting a "not called" assertion next to it.)

Full suite after the addition: `bun vitest run` 575 files/4798 tests green;
`bun vitest run --config vitest.storybook.mts` 166 files/1344 tests green
(was 1342 self-reported — 2 more landed since, both real). i18n
`courses.teacher.*` vi/en mirror verified byte-exact (46/46 keys each way via
a one-off key-diff script, [[us-e24.4-qa-patterns]] pattern).

TEST_MATRIX.md row for US-E24.10 was still `planned`/`planned`/... at QA time
despite the story packet's own `## Status: implemented` and a full Evidence
block — flagged back to fe-lead as a harness-proof sync gap, not a test gap.
