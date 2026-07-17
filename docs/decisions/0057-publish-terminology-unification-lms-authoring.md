# 0057 Publish terminology unification — "Xuất bản" / "Đã phát hành" for LMS teacher-authoring draft→published workflows

Date: 2026-07-17

## Status

Accepted

## Context

DR-021 (`docs/design-requests/DR-021-lesson-plan-question-bank.md`) shipped
copy for two new i18n namespaces, `lessonPlan` and `questionBank`, both
modeling the same one-way DRAFT→PUBLISHED authoring workflow already present
in `examBank` (`src/features/exam-bank`, US-E11.3). `uiux-lead`'s design-review
gate flagged a terminology drift as a non-blocking open item for `/ba` to
settle:

- `examBank` (shipped, in production use): action = **"Publish"** (English
  loanword, `examBank.builder.publish`/`examBank.card.publish`/
  `examBank.publishDialog.confirm`), status = **"Đã publish"**
  (`examBank.status.published`, `examBank.toast.published` = "Đã publish đề thi").
- `lessonPlan` + `questionBank` (this DR, not yet built): action =
  **"Xuất bản"** (`lessonPlan.builder.publish`, `questionBank.builder.publish`,
  both publishDialog `confirm` keys), status = **"Đã phát hành"**
  (`lessonPlan.status.published`, `questionBank.status.published`).

A third, unrelated concept exists in the grade-publish domain (`gradeApproval`,
`gradeBook`, `adminSchoolSetup`/`adminSettings` — score release to
students/parents) using **"công bố"**. That is a genuinely different action
(release computed grades to viewers, not draft→published content authoring)
and is explicitly out of scope for this decision — no drift there, no change
needed.

## Decision

Unify all LMS teacher-authoring draft→published copy (exam papers, lesson
plans, questions, and any future sibling in this family — e.g. teaching-plan
submit/approve if it ever adds a "publish" step) on the **already-majority,
Vietnamese-native pairing already shipped in `lessonPlan`/`questionBank`**:

- Action verb (button/CTA/toast-in-progress): **"Xuất bản"** /
  "Đang xuất bản...".
- Resulting status (badge/filter/toast): **"Đã phát hành"**.

Rationale: 2 of 3 namespaces already ship this pairing; it avoids an English
loanword ("Publish") inconsistent with the rest of the product's Vietnamese-
first copy (`.claude/rules/i18n.md`); "phát hành" is the term already used
elsewhere in the product for released/published content states (e.g.
`gradeCellStatus`-adjacent "đã công bố" family stays separate by design, but
"phát hành" itself has no competing meaning in this repo).

`examBank`'s "Publish"/"Đã publish" copy is **not touched by this decision**
— it is shipped, in production use, and out of scope for DR-021 to edit
(confirmed by `uiux-lead`'s audit). It is flagged as a **follow-up cleanup**:
a future small `/uiux` + `/fe` pass should swap `examBank`'s 7 affected keys
(`builder.publish`, `card.publish`, `errors.cannot-delete-published`,
`publishDialog.{confirm,publishing,title}`, `status.published`,
`subtitle`, `toast.published`, `unavailable.body`) to the same "Xuất bản"/
"Đã phát hành" pairing, tracked as a cross-repo/backlog note, not blocking
this DR's build.

## Consequences

- `lessonPlan` and `questionBank` i18n keys (already landed, DR-021) need
  **no change** — they already match this decision.
- `fe-nextjs-engineer` implementing `US-E11.8`/`US-E11.9` uses the existing
  keys as-is; no new keys needed for this decision.
- `examBank` terminology cleanup is a separate, small follow-up story (not
  scoped here) — logged so it isn't silently forgotten.
- Any future LMS-authoring screen with a draft→published lifecycle must use
  "Xuất bản" / "Đã phát hành", not "Publish"/"Đã publish" or "công bố".

## Links

- `docs/design-requests/DR-021-lesson-plan-question-bank.md` (origin of the
  open item).
- `docs/stories/epics/E11-lms-exams/US-E11.8-lesson-plan-authoring/`,
  `docs/stories/epics/E11-lms-exams/US-E11.9-question-bank/` (consuming
  stories).
- `.claude/rules/i18n.md` (Vietnamese-first copy convention).
