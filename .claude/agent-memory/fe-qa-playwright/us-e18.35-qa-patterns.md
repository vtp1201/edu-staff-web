---
name: us-e18.35-qa-patterns
description: admin-roster real wiring (getClassRoster via core+iam-directory batch) — another fully-accurate self-report; AbsentValue shared-component promotion verified byte-for-byte
metadata:
  type: project
---

US-E18.35 (admin roster: `getClassRoster` un-mocked via core enrollments + iam-directory
batch decoration) QA pass — third story in a row (after US-E18.33/US-E18.34) where the
engineer's self-reported round-1 review fixes were ALL genuinely accurate on independent
re-verification:

1. **MANAGER-403 comment fix** — `principal/students/page.tsx` header comment now correctly
   states core's `list_students_in_class.go authorize()` allows only `isAdmin` (SUPER_ADMIN/
   ADMIN) or an assigned TEACHER, NO MANAGER branch (that grant is scoped to `list_classes.go`
   alone). New test "degrades honestly when a MANAGER-principal is 403'd on the roster read"
   proves `fetchError: "forbidden"`, empty roster, `currentClass: null` — genuinely locks the
   behavior, not just the comment.
2. **Admin roster false-empty** — `student-roster-screen.i-vm.ts` gained `fetchError:
   RosterFailure["type"] | null`; `admin/roster/page.tsx` threads `rosterResult.error.type`
   instead of `[]`; `StudentRosterScreen` suppresses ClassInfoCard/RosterTable/AddStudentPanel
   entirely behind `hasFetchError`, renders shared `ListError` with `showRetry=false` for
   forbidden/unauthorized. 6 new `page.test.tsx` cases + 2 new stories (`RosterReadFailed`,
   `RosterReadForbidden`) all genuinely assert the claimed behavior, including the pool-only
   failure NOT blanking a loaded roster (distinguishes decoration-failure from read-failure).
3. **AbsentValue promotion (decision 0026)** — grepped and confirmed ZERO remaining
   `MissingValue`/`UnavailableValue` references outside historical doc comments in the new
   shared component's own header; both old files physically deleted. `src/components/shared/
   absent-value/absent-value.tsx` takes a `label: string` prop (pre-translated, no
   `useTranslations` inside — dumb presentational primitive like `PresenceDot`/`StatusBadge`).
   Ran moderation's full test suite (`bun vitest run src/features/moderation` → 7 files/92
   tests) AND its Storybook suite independently post-promotion — genuinely unmodified/green,
   confirming the claim that US-E18.32 tests assert announced text, not component identity.

**Verification technique reused**: `git diff main...HEAD --stat` first to see the full file
list before diving into individual claims — cheap way to confirm "154 lines changed in 2
files" style claims without re-deriving them from scratch.

**Full suite counts matched exactly**: `bun vitest run` 474/3502, storybook 158/1205, `tsc
--noEmit` clean, `bun run build` green in BOTH `NEXT_PUBLIC_USE_MOCK=true` and the real
`.env.local` (`false`) mode. Zero new tests needed — clean PASS, no AC gaps found.

Companion: [[us-e18.34-qa-patterns]], [[us-e18.33-qa-patterns]].
