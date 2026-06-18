# US-E12.11 — Admin Settings: Grade Publish Mode — Plan

## Goal
Admin screen at `/admin/settings` that lets ADMIN toggle `gradePublishMode`
between `SELF_PUBLISH` and `ADMIN_APPROVAL`. Warning dialog when relaxing
approval (`ADMIN_APPROVAL → SELF_PUBLISH`). Toast on success/error. Navigation
shortcuts to `/admin/calendar` and `/admin/assessment`.

## BE contract (core service, US-059 live)
- `GET  /core/api/v1/config/school/operational-settings`
- `PUT  /core/api/v1/config/school/operational-settings`
- Body/response: `{ gradePublishMode: "SELF_PUBLISH" | "ADMIN_APPROVAL" }`
- Mock-first via `USE_MOCK`; REAL when the flag is off (endpoint exists).

## Reused contracts (do not redefine)
- `GradePublishMode` / `OperationalSettings` — from
  `@/features/admin-school-setup/domain/entities/school-config.entity`.
- `SCHOOL_SETUP_EP.operationalSettings` — from
  `@/bootstrap/endpoint/admin-school-setup.endpoint`.

## Phases (TDD red → green → refactor)
1. Domain — failure union, repo interface, two use-cases + unit tests first.
2. Infrastructure — DTO, mapper (plain fn), real repo (`server-only`) + repo
   contract test, mock repo (module-level seed).
3. Bootstrap DI — `makeAdminSettingsRepository()` (USE_MOCK toggle); index export.
4. Presentation — `AdminSettingsScreen` (radio fieldset, warning note, save,
   shortcuts) + `SwitchConfirmDialog` (shadcn AlertDialog) + stories.
5. App route — RSC `page.tsx` (prefetch initial mode) + `actions.ts` server action.
6. i18n — `adminSettings` namespace in vi + en.

## RBAC (AC-7)
Principal may VIEW but not save → `isReadOnly` prop disables the fieldset + Save.
Admin layout guard means only admin reaches the route, so `page.tsx` passes
`isReadOnly={false}` (prop kept for forward-compat).
