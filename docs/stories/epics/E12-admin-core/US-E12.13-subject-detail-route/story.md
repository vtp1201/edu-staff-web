# US-E12.13 Subject Detail deep-link route

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.3 (Subject Catalogue — subject-detail-sheet.tsx, subject.entity.ts, actions already implemented)
- Blocks: none
- Feature module(s) chạm: `src/features/admin/subject-catalogue/presentation/` (extract shared form body); `src/app/[locale]/t/[tenant]/(app)/admin/subjects/[id]/` (new route)
- Shared contract/file: `getSubjectAction`, `patchSubjectAction`, `archiveSubjectAction` (`src/app/[locale]/t/[tenant]/(app)/admin/subjects/actions.ts`) — reused, not duplicated

## Product Contract

Close gap NEW-02 (`docs/product/screens.md:96`): the Subject Detail master
editor content exists today only as a Sheet (`subject-detail-sheet.tsx`)
opened from the Subjects table. There is no deep-linkable route
`(app)/admin/subjects/[id]`, so the master editor cannot be bookmarked,
shared, or opened directly (e.g. from a notification or another screen).

This story builds the full-page route per the design reference
(`design_src/edu/subject-detail.jsx`, US-048/ADR 0036): same locked-curriculum
editor fields + class-offerings table + archive action, in a full-page shell
with a back-to-catalogue breadcrumb, reusing the EXISTING business logic
(actions, entities, validation) — no new BE calls, no new domain use-cases.

Per `.claude/rules/component-organization.md`, the shared editor body (fields,
validation, save/archive handlers) is extracted ONCE out of
`subject-detail-sheet.tsx` into a presentational component both the Sheet
(existing, used from the table row) and the new full page import — not
copy-pasted.

## Relevant Product Docs

- `docs/product/screens.md:96` (gap NEW-02)
- `design_src/edu/subject-detail.jsx` (US-048, ADR 0036 — normative full-page layout)
- `docs/stories/epics/E12-admin-core/US-E12.3-subject-catalogue.md` (sheet origin story)

## Acceptance Criteria

- Given an admin navigates to `/admin/subjects/<validId>`, the full-page
  Subject Detail editor renders: breadcrumb (department name → subject name),
  basic-info fields (name, code), locked curriculum fields (period count,
  assessment count, outcome targets, master syllabus, exercise/exam bank
  refs) with the same lock tooltip affordance as the Sheet, and the
  class-offerings table (or empty state).
- Given the admin edits an editable field and saves, `patchSubjectAction` is
  called and a success confirmation is shown (mirrors Sheet behavior) —
  same validation rules (code regex, name required).
- Given the subject id does not exist (or belongs to another tenant),
  the route shows a "not found" state — no crash, no leaked data across
  tenants — instead of rendering stale/empty fields silently.
- Given the subject is `ACTIVE` and not `inUse`, an Archive action is
  available on the full page (same guarded behavior as the Subjects table
  row: blocked + tooltip when `inUse`).
- Given the admin clicks the breadcrumb / back action, they return to
  `/admin/subjects`.
- The route inherits the existing `(app)/admin/layout.tsx` RSC role guard
  (no new guard code needed) — non-admin roles never reach this page.
- The Sheet (`subject-detail-sheet.tsx`) continues to work unchanged from the
  Subjects table (no regression) — both consume the same extracted shared
  component.
- WCAG 2.1 AA: keyboard reachable, focus visible, contrast passes tokens,
  status not color-only (existing Sheet a11y patterns preserved).

## Design Notes

- Commands: `patchSubjectAction(id, data)`, `archiveSubjectAction(id)` (existing, reused)
- Queries: `getSubjectAction(id)` (existing, reused — returns `{ subject, classOfferings }` or `errorKey`)
- API: none new — `core` service still absent; DI stays mock-first via
  `makeSubjectCatalogueRepository()` (unchanged)
- Tables: none (client-side entity, no schema change)
- Domain rules: reuse `PatchSubjectInput` validation already enforced in
  `patch-subject.use-case.ts` / `validate-subject-code.use-case.ts` — do not
  re-implement
- UI surfaces: new `SubjectDetailScreen` (full-page container) +
  extracted shared `SubjectDetailForm`/`SubjectDetailContent` body consumed by
  both `subject-detail-sheet.tsx` (existing) and the new page

## Validation

When updating durable proof status, use numeric booleans:
`scripts/bin/harness-cli story update --id US-E12.13 --unit 1 --integration 1 --e2e 1 --platform 1`.

| Layer | Expected proof |
| --- | --- |
| Unit | shared form extraction keeps existing behavior; any new pure logic (e.g. not-found derivation) covered |
| Integration | route/page composes `getSubjectAction` correctly incl. not-found error path |
| E2E | Storybook interaction / QA states: populated, not-found, archive-blocked, save success/error |
| Platform | `tsc --noEmit` clean, `bun build` green (route appears in output), full Vitest suite green |
| Release | design-review gate pass (impeccable audit + critique) |

## Harness Delta

- Registers US-E12.13 (new).
- On completion: update `docs/product/screens.md:96` to remove NEW-02 flag
  and mark the route ✅.
