---
name: vm-conventions
description: ViewModel interface conventions for i-vm.ts files — label injection, RSC-to-client boundary, error key pattern
metadata:
  type: project
---

## ViewModel conventions established across this codebase

**File naming:** `<component>.i-vm.ts` co-located with the presentation component.

**Error key pattern:** All screen VMs carry `errorKey: SomeFailure["type"] | null`.
`null` = success. The RSC maps domain failure → stable union type string key; the
presentation component translates via `t(errorKey)`. Never pass raw error messages
from server to client.

**isLoading pattern:** `isLoading: boolean` on screen VMs is a safety valve. The
primary loading state is the Suspense boundary fallback (skeleton component). RSC
pre-computes `isLoading: false` for the success path; `true` only when streaming.

**Route paths pre-computed:** RSC pre-computes app-relative route strings (e.g.
`studentsPath: "/teacher/classes/{id}/students"`) and puts them in the VM. The
presentational layer never does string concatenation for routes.

**Label injection pattern:** Pure presentational leaf components (ClassCard,
TeacherRosterTable, GenderBadge after promotion) do NOT call `useTranslations`.
The parent screen component calls `useTranslations` and injects all strings via
a `labels` prop object. This keeps leaves i18n-agnostic and unit-testable without
i18n context.

**initials field:** When a VM row has a name used in an Avatar, include a pre-computed
`initials: string` field in the VM (last-word initial, uppercased). RSC computes it;
the client component does not parse strings.

**`totalClasses: number | null`:** Dashboard VM extended with null-able counts uses
`null` to mean "unavailable" (same pattern as `totalStudents`). Render "—" em dash
when null.
