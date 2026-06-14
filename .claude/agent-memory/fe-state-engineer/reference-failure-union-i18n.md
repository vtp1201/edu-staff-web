---
name: failure-union-i18n
description: Convention for mapping failure union stable keys to i18n paths; server never translates, presentation translates via t(errorKey)
metadata:
  type: reference
---

## Pattern

Server Actions and use-cases return a **stable failure union key** (e.g., `TeacherDashboardFailure['type']`). The presentation layer receives this key in the ViewModel (`errorKey: FailureType | null`) and calls `t(errorKey)` to get the localized string.

**Never** translate at the server boundary (use-case, repository, Server Action).

## Confirmed failure unions in this repo

| Failure type | Union values | i18n namespace path |
|---|---|---|
| `TeacherDashboardFailure` | `"network-error"`, `"unauthorized"`, `"unknown"` | `teacherClasses.error.<type>` (US-E13.1) |
| Auth failures | varies | `auth.errors.<type>` |

## Adding a new failure type

1. Add the literal to the union in `features/<x>/domain/failures/<name>.failure.ts`
2. Add the matching key to BOTH `vi.json` and `en.json` under the relevant namespace
3. The presentation component uses `t(vm.errorKey)` — typed check will catch missing keys at compile time

## `not-found` variant note

US-E13.1 adds `{ type: "not-found" }` to `TeacherDashboardFailure` for `getClassStudents` when `classId` is invalid. This maps to `teacherClasses.error.not-found` in both message files.
