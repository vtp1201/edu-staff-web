---
name: us-e20.5-qa-patterns
description: parent attendance view (child-attendance permanent-forbidden gap) — QA patterns and verification recipes
metadata:
  type: project
---

US-E20.5 (parent-attendance view, closes dead `/parent/attendance` sidebar link) — another
rare case where self-report was fully accurate on independent re-verification.

- **3-state DI env matrix pattern** (`"true"`/`"false"`/unset) is now the standard proof recipe
  for a "mock gated behind USE_MOCK, real mode degrades honestly" fix — see
  `bootstrap/di/parent-attendance.di.test.ts` (repo constructor-name check via
  `Object.values(useCase).filter(object)` since `vi.resetModules()` kills `instanceof`) +
  `parent/attendance/page.test.ts` (resolves `Page(...).props.vm` directly, proves the whole
  page→DI→repo→use-case chain, not just the factory).
- **"forbidden" vs "not-implemented"** distinction matters: this is a PERMANENT BE-ACL gap
  (PARENT absent from `getMemberAttendance`'s authorized-caller list), not an unshipped
  endpoint — the failure type should say so. `UnavailableChildAttendanceRepository` throws
  synchronously with zero `createServerHttpClient()` call, and the DI test asserts that via
  `vi.doMock` + spy across all 3 env states.
- **`?childId=` URL-param validation recipe**: `resolveActiveChildId(childIds, requested)` —
  fall back to `childIds[0] ?? null` when requested isn't in the list. Cheap pure-function unit
  test, no browser needed.
- **ChildSwitcher promotion (2nd promotion, US-E20.4 was the 1st with real regressions)** — this
  one was genuinely byte-clean: `git show <commit> -- <old-path> <new-path>` shows only an
  import-path line + `useTranslations("gradeBook")` → `useTranslations("Common")`. Worth
  diffing explicitly every time a promotion is claimed "clean" — cheap to disprove if false.
- **Locale-date regression guard pattern**: `parseIsoDate` returns a noon-UTC `Date`; test
  asserts `Intl.DateTimeFormat("vi"|"en", {..., timeZone:"UTC"})` produce different orderings
  from the SAME parsed value — this is the right way to prove a hardcoded-format bug is fixed
  without a browser.
- Clean PASS, no new findings. Confirmed: `bun vitest run` 462/3317 (0 fail), storybook-scoped
  runner (parent-attendance + child-switcher + grade-book-screen + list-error) 44/44, `tsc`
  clean, `bun lint` only the pre-existing message-context-menu warning/info, both
  `NEXT_PUBLIC_USE_MOCK=true` and unset `bun build` clean.
- **Recurring staleness**: `docs/TEST_MATRIX.md` row for this story still said `planned`/`no`
  columns despite full implementation + fix round — always cross-check against git log /
  actual test files, not the matrix table, before trusting a "planned" status.
