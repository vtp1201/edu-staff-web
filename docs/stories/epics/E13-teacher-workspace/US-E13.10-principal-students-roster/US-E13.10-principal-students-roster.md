# US-E13.10 Principal Students Roster (index page — closes dead sidebar link)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/admin-roster/` (read-only reuse — no
  new files if the existing `get-roster.use-case.ts` + `get-classes.use-case.ts`
  are role-agnostic), route
  `app/[locale]/t/[tenant]/(app)/principal/students/page.tsx`
- Shared contract/file: `features/admin-roster/domain/use-cases/get-roster.use-case.ts`,
  `features/admin-roster/presentation/student-roster-screen/` — REUSE, do not
  fork. If the existing screen has ADMIN-only mutation affordances
  (enroll/unenroll/transfer buttons), gate them out for the principal caller via
  a `readOnly`/`variant` prop — do NOT duplicate the component (decision `0026`).

## Product Contract

Sidebar nav (`nav-config.ts`, principal role) already links to
`/principal/students` but the route does not exist at all (full 404). This
story adds a read-only, school-wide student roster for the principal —
list/search/filter only, NO enroll/unenroll/transfer (those stay admin-only
under `/admin/roster`).

Ground-truthed BE authorization: `services/core/docs/openapi.yaml`'s
`GET /classes/{classId}/students` (class roster) is documented as "Accessible
to ADMIN/SUPER_ADMIN, or a TEACHER with any assignment". Web's `principal`
appRole is a COLLAPSE of BE role enums `ADMIN` and `MANAGER`
(`role-meta.ts` `ROLE_ENUM_TO_APP`) — i.e. when the signed-in user's BE token
role is literally `ADMIN`, they already land as `principal` in the web app
(there is no separate BE role for the web's own `/admin/*` persona outside the
`SUPER_ADMIN` path — see `docs/decisions/adr` for US-E18.24). Existing
principal screens (`US-E13.5` principal-teachers, `US-E13.8` principal-classes)
already call ADMIN-gated `core` endpoints successfully today, which is standing
proof MANAGER is treated ADMIN-equivalent by `core`'s authorization for reads.
**The engineer MUST re-verify this directly** (call the roster endpoint with a
principal-role token, or grep the Go authorization middleware for the roster
handler) before wiring for real — if it 403s, mock-first per decision `0014`
and flag a cross-repo ask, do not silently force-mock without checking.

## Relevant Product Docs

- No existing `docs/product/design-spec.jsonc`/DR for this screen. Visually
  reuse `admin-roster`'s `student-roster-screen` table/search/filter pattern —
  same list, same columns, minus the mutation actions. Do not invent new
  layout/tokens.

## Acceptance Criteria

- Given a principal opens `/principal/students`, they see the school-wide
  student roster (name, class, gender/DOB if the admin-roster DTO already
  carries it — do not add new fields it doesn't have).
- Search by name and filter by class are available (reuse admin-roster's
  existing filter bar component).
- NO enroll/unenroll/transfer affordances are rendered for this role (verified
  by the accessibility/tech-lead reviewers — a control a screen-reader user can
  reach but that silently 403s on click is a defect, not just a UI omission).
- Empty/loading/error states reuse `ListSkeleton`/`ListError` shared components
  (decision `0026`) — no new skeleton/error component.
- If BE authorization actually rejects the principal token (403), the screen
  degrades to mock-first (decision `0014`) with the SAME UI (no visible
  difference to the user) and a cross-repo ask is filed by fe-lead.
- WCAG 2.1 AA: table semantics, keyboard-navigable, visible focus, no
  color-only status.

## Design Notes

- Commands: none in this story (read-only).
- Queries: reuse `get-roster.use-case.ts` (search + pagination) and
  `get-classes.use-case.ts` (class filter options) from `features/admin-roster`.
- API: `GET /classes/{classId}/students` or the school-wide roster endpoint
  `admin-roster` already calls — ground-truth exact path in
  `roster.repository.ts` before assuming; DO NOT re-derive from scratch.
- Domain rules: read-only variant — no new domain rule, just an omitted-affordance
  presentation concern.
- UI surfaces: `app/[locale]/t/[tenant]/(app)/principal/students/page.tsx` (RSC)
  reusing `StudentRosterScreen` with a `readOnly` (or `variant="principal"`)
  prop threaded from the page — confirm the exact prop-extension shape with
  `fe-component-architect` before adding it (must not break the admin caller).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | none new if pure reuse; a new test for the `readOnly` prop hiding mutation controls |
| Integration | reuse `roster.repository.test.ts` coverage; add a principal-role authorization test if a new DI wiring path is introduced |
| E2E | Storybook interaction: principal variant renders no mutation buttons; search/filter still work |
| Platform | `bun build` clean |
| Release | design-review gate + a11y audit green |

## Harness Delta

Registered via `harness-cli story add --id US-E13.10`.

## Evidence

(fill after implementation)
