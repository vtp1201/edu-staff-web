# US-E18.30 Principal Classes: un-mock + class-list enrichment

## Status

planned

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/bootstrap/di/principal-classes.di.ts`, `src/features/principal/infrastructure/teachers/repositories/principal-teachers.repository.ts` (listClasses), any OTHER consumer that fan-outs 2×N to get studentCount/homeroom (audit at implementation time)
- Shared contract/file: `ClassResponseDto` (core), `GetPrincipalClassesUseCase`

## Product Contract

BE US-164 grants `MANAGER` (web `principal`) tenant-wide read access to
`GET /classes` (`list_classes.go`'s `roleManager` branch — ground-truthed
directly). BE US-173 additionally enriches BOTH the list and get responses
with `studentCount` + `homeroomTeacherId`/`homeroomTeacherName` computed
server-side. This closes two things at once:
1. `bootstrap/di/principal-classes.di.ts`'s unconditional force-mock (US-E13.8,
   dated because it predates US-164) — flip to `USE_MOCK ? Mock : Real`.
2. Any consumer currently doing a 1+N or 2×N client-side fan-out to compute
   `studentCount`/homeroom display data for a class list (e.g.
   `list-my-classes.use-case.ts` in `features/teacher`, per the doc comment
   flagged during US-E13.9) should now get these fields directly from the
   enriched `ClassResponseDto` and DROP the extra fan-out calls where
   applicable — ground-truth EVERY such consumer before removing its fan-out
   (some may need the fan-out for OTHER data the enrichment doesn't provide).

## Relevant Product Docs

- `docs/product/screens.md` — Principal Classes row (US-E13.8)

## Acceptance Criteria

- `bootstrap/di/principal-classes.di.ts` is a plain `USE_MOCK ? Mock : Real`
  gate (no unconditional force-mock).
- Principal Classes screen shows real `studentCount`/homeroom teacher name for
  every class in real mode.
- Every existing consumer that previously computed `studentCount`/homeroom via
  a client-side fan-out is audited; those that can be satisfied purely by the
  enriched response drop their fan-out (perf win, fewer HTTP calls); those that
  need other per-class data the enrichment doesn't cover are left unchanged
  (documented why).
- Zero regression to existing Principal Classes screen tests/stories.

## Design Notes

- Commands: none.
- Queries: `GET /classes` (list, cursor-paginated) + `GET /classes/{id}` (get)
  — both now enriched. Ground-truth `ClassResponseDto`'s exact new field
  names/casing against `services/core/docs/openapi.yaml` before touching the
  mapper.
- API: `core` service.
- Domain rules: none new — enrichment is additive fields on an existing DTO.
- UI surfaces: `src/features/principal/presentation/classes/` (existing
  screen, US-E13.8) — should need zero visual change if it already renders
  `studentCount`/homeroom from its VM (verify).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | DI env-matrix test (mock/real gate); mapper test for the 2 new fields |
| Integration | repository test asserting the enriched fields round-trip |
| E2E | Storybook: no regression to existing Principal Classes stories |
| Platform | `bun build` clean in both mock and real mode |
| Release | design-review gate N/A if zero visual change (confirm); a11y N/A if zero visual change |

## Harness Delta

Registered via `harness-cli story add --id US-E18.30`.

## Evidence

(fill after implementation)
