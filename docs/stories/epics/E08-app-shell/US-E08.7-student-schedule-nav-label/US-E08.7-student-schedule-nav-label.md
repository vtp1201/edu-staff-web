# US-E08.7 Student (and parent) sidebar schedule nav label — "Thời khoá biểu"

## Status

implemented

## Lane

tiny

## Dependencies

> Dùng cho parallel branch workflow (decision `0025`). Giúp fe-lead phát hiện ràng
> buộc với US team khác đang làm trước khi claim.

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/components/layout/app-shell/sidebar/nav-config.ts`
  (shared app-shell config, not a `features/<x>/` module)
- Shared contract/file: `NAV_BY_ROLE.student` + `NAV_BY_ROLE.parent` entries in
  `nav-config.ts`; reuses existing i18n key `shell.nav.timetable` — no new key,
  no schema change

## Product Contract

Sidebar nav label copy fix, no behavior change. The **student** role's sidebar
tab for `/student/schedule` currently reads "Lịch dạy" (labelKey `schedule`,
literally "teaching schedule") — wrong register for a student looking at their
own class timetable. Change it to reuse the existing `timetable` key
("Thời khoá biểu"), already used by admin's `/admin/timetable` nav item.

**Parent decision (in-scope, same US):** the parent role's `/parent/schedule`
nav item has the identical problem — a parent views their child's class
timetable, not a "teaching schedule". Changed parent to `timetable` as well.
**Teacher and principal are explicitly left as `schedule` ("Lịch dạy")** —
for those two roles the label is semantically correct: it IS their own
teaching/dạy schedule.

## Relevant Product Docs

- `src/components/layout/app-shell/sidebar/nav-config.ts` (ground truth,
  `NAV_BY_ROLE.student[6]` / `NAV_BY_ROLE.parent[6]`)
- `src/bootstrap/i18n/messages/vi.json` / `en.json` — `shell.nav.timetable` key
  already exists (used by admin), reused verbatim, no new key added.

## Acceptance Criteria

- Student sidebar item for `/student/schedule` shows "Thời khoá biểu" (vi) /
  "Timetable" (en) instead of "Lịch dạy" / "Schedule".
- Parent sidebar item for `/parent/schedule` shows the same "Thời khoá biểu" /
  "Timetable" copy.
- Teacher (`/teacher/schedule`) and principal (`/principal/schedule`) nav items
  are UNCHANGED — still labelKey `schedule` ("Lịch dạy" / "Schedule").
- Admin (`/admin/timetable`) nav item unchanged (already `timetable`).
- No new i18n key added; `vi.json`/`en.json` untouched except no-op (key already
  present for both locales).
- `nav-config.test.ts` extended to assert the new labelKey per role (regression
  guard against silent revert).

## Design Notes

- Commands: none.
- Queries: none.
- API: none — pure copy/config change.
- Tables: none.
- Domain rules: none — presentation-only i18n key reassignment.
- UI surfaces: sidebar nav (`components/layout/app-shell/sidebar/`), both
  `student` and `parent` role groups.

## Validation

`scripts/bin/harness-cli story update --id US-E08.7 --status implemented --unit 1 --integration 0 --e2e 0 --platform 0`

| Layer | Expected proof |
| --- | --- |
| Unit | `nav-config.test.ts` — new assertions: `NAV_BY_ROLE.student` schedule item `labelKey === "timetable"`; `NAV_BY_ROLE.parent` schedule item `labelKey === "timetable"`; teacher/principal schedule items unchanged (`labelKey === "schedule"`) |
| Integration | n/a — no BE/HTTP boundary touched |
| E2E | n/a — no new Storybook story; sidebar already covered by existing app-shell stories, copy is a type-checked key swap (`NavLabelKey` union catches typos at compile time) |
| Platform | `tsc --noEmit` clean (labelKey is a typed union against `messages.d.ts`); `bun build` green |
| Release | n/a |

## Harness Delta

- New story `US-E08.7` registered under epic `E08-app-shell`.
- `docs/TEST_MATRIX.md` row added for `US-E08.7`.
- Design-review gate: **N/A** — tiny-lane copy change reusing an existing,
  already-approved token/key (`shell.nav.timetable`, already live on the admin
  sidebar); no new visual surface, no new token, no layout change. Documented
  here per `.claude/rules/impeccable.md` scope (gate applies to UI that
  introduces/changes visual treatment, not a like-for-like text swap using an
  existing approved string).

## Evidence

- `git diff` — `src/components/layout/app-shell/sidebar/nav-config.ts`:
  student + parent `schedule` items' `labelKey` changed `"schedule"` →
  `"timetable"`.
- `src/components/layout/app-shell/sidebar/nav-config.test.ts` — new assertions
  added (see below), full suite run.
- `bun vitest run` — full suite pass (see PR/commit for exact count).
- `bun build` — green.
