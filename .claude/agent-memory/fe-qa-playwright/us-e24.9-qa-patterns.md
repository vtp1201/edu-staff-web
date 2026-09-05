---
name: us-e24.9-qa-patterns
description: US-E24.9 timetable period-log/prep + homeroom daily-log high-risk lane — QA patterns, gaps found and closed
metadata:
  type: project
---

US-E24.9 (teacher class-hub timetable tab: sổ đầu bài tiết + chuẩn bị tiết +
sổ chủ nhiệm ngày) had a genuinely strong pre-existing test baseline (2-round
tech-lead review, both rounds' fixes independently re-verified as real —
`key={weekParam}` remount via element.key assertion in a node-env test,
3-state daily-log-panel via 3 separate stories driving create/submit-saved/
revise TO COMPLETION not just opening, forge-role sweep across all 5 roles
with zero-HTTP-call proof, bell-schedule startTime/endTime pass-through via
mapper test). Self-report was accurate on all of this.

Gap found: the pure, exported client-validators (`isValidMaterialUrl` in
`period-prep.entity.ts`, `periodPrepSchema` in `period-prep-form.schema.ts`)
had ZERO direct test coverage — only exercised transitively through form
rendering, and the story suite (`MaterialsAtCap`) only proved the 20-link
COUNT cap, never an actually-invalid (non-http(s)) URL or the `remark`/
`absentCount` bound errors in `PeriodLogForm`. Closed with:
- 2 new unit test files (`period-prep.entity.test.ts`,
  `period-prep-form.schema.test.ts`) — cheap, fast, boundary-exact (off-by-one
  proof at exactly MAX_MATERIALS / MAX_NOTE_LENGTH).
- 2 new Storybook interaction stories in `timetable-tab.stories.tsx`
  (`PeriodLogValidationBoundaries`, `PeriodPrepInvalidUrlBlocked`) driving the
  REAL rendered form (not just the schema in isolation) to prove the i18n
  validation copy actually renders end-to-end.

Pitfall hit while writing the story: i18n label text is NOT the bare field
name — `remark`'s label is "Nhận xét tiết học", not "Nhận xét" — always
`getByLabelText(/partial/)` regex rather than an exact string guessed from the
AC prose; grep the actual vi.json node first.

Native `<textarea maxLength={N}>` makes the zod `.max()` error effectively
unreachable via `userEvent.type` in a browser test (the DOM won't accept more
characters) — assert the native cap held (`value.toHaveLength(N)`) as
defense-in-depth #1, and prove the zod bound directly at the schema-unit-test
layer (defense-in-depth #2), not by fighting jsdom/browser-mode DOM semantics.

Full suite after additions: 564 files/4607 unit tests, 164 files/1322
Storybook browser tests, both green (the memory-recorded pre-existing
admin/invitations-screen flake did NOT reproduce this run — genuinely
flaky, not a fixed regression).
