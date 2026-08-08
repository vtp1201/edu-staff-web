# US-E18.60 Force-mock LMS student consumption (courses/lessons/assignments)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: none
- Blocks: none (unblocks when BE ships LMS consumption contract — ask #51)
- Feature module(s) chạm: `src/bootstrap/di/lms.di.ts` (DI factory only —
  domain/infrastructure/presentation of `features/lms/` untouched)
- Shared contract/file: none (single DI file; no shared component/DTO renamed)

## Product Contract

Ground-truthed 2026-08-08 against the running stack + edu-api source
(`f5ed5a86`): service `lms` là scaffold — `services/lms/docs/openapi.yaml` chỉ
khai báo `/health`; mọi route `/lms/api/v1/*` (courses, lessons, assignments)
trả 404 từ chính service (không phải lỗi Kong/gateway). Vì `USE_MOCK` là cờ
toggle toàn cục, real mode hiện tại làm 2 tab của HỌC SINH — **Khoá học**
(US-E11.6) và **Bài tập** (US-E11.7) — degrade thành error card vĩnh viễn.

Theo precedent ADR `0054` (grade-approval dashboard force-mock bất kể
`USE_MOCK`), story này pin `makeRepo()` trong `lms.di.ts` về
`MockLmsRepository` vô điều kiện — hai tab chạy mock data ổn định trong real
mode, thay vì lỗi — TỚI KHI BE ship contract (ask #51, filed
`docs/reports/2026-08-08-fe-to-be-asks-lms.md`).

**Không đụng**: exam / exam-bank / lesson-bank / lesson-plan / question-bank —
các DI factory này wire `core` thật (US-E18.15/E11.8/E11.9) và đang hoạt động;
chúng sống ở `bootstrap/di/` factory KHÁC (không phải `lms.di.ts`'s
`makeRepo()`), xem Design Notes.

## Relevant Product Docs

- `docs/decisions/0054-grades-wiring-contract-remap.md` (force-mock precedent)
- `docs/reports/2026-08-08-fe-to-be-asks-lms.md` (ask #51)
- `docs/product/screens.md` — student courses / assignments rows

## Acceptance Criteria

- `NEXT_PUBLIC_USE_MOCK=false` (real mode) → `makeListCoursesUseCase()`,
  `makeGetCourseLessonsUseCase()`, `makeMarkLessonCompleteUseCase()`,
  `makeGetNoteUseCase()`, `makeSaveNoteUseCase()`, `makeListQuestionsUseCase()`,
  `makeAskQuestionUseCase()`, `makeListAssignmentsUseCase()`,
  `makeSubmitAssignmentUseCase()` all resolve a use-case backed by
  `MockLmsRepository` — proven by a unit test that forces `USE_MOCK=false` and
  asserts the constructed repository is the mock, not `LmsRepository`.
- The pin has an explicit code comment: reason (LMS scaffold, ground-truth
  date) + removal condition (ask #51 shipped) + pointer to the ADR.
- No other `bootstrap/di/*.di.ts` factory is touched — exam/exam-bank/
  lesson-bank/lesson-plan/question-bank DI stay wired real, unaffected.
- `docs/product/screens.md` rows for the two student screens note "mock-first
  (force-mocked pending ask #51)".
- `tsc --noEmit` and `bun vitest run` green; `bun build` green (real-mode env
  var doesn't change build-time, but the guard test runs under both flag
  values).

## Design Notes

- Commands: none (DI factory change only — no new use-case).
- Queries: none new.
- API: none consumed for real in this story (that's the point — pinned to
  mock). Real endpoints ground-truthed as 404/absent, listed in ask #51.
- Tables: n/a.
- Domain rules: `makeRepo()` in `src/bootstrap/di/lms.di.ts` currently branches
  `USE_MOCK ? Mock : Real`. This story removes the branch — always
  `MockLmsRepository`, regardless of `USE_MOCK` — mirroring the exact shape of
  the `IGradeApprovalRepository` force-mock in ADR `0054` and the
  `staff-leave.di.ts`/`teaching-plan.di.ts`/`feed.di.ts` precedents already in
  the epic.
- UI surfaces: none — same components, same mock data shape, just always
  served regardless of `USE_MOCK`. No presentation/domain/infrastructure edit
  expected; if the mock repository needs any shape fix that's OUT of scope
  here (file a new ask/US).

## Validation

`scripts/bin/harness-cli story update --id US-E18.60 --status implemented --unit 1 --integration 0 --e2e 0 --platform 0`

| Layer | Expected proof |
| --- | --- |
| Unit | `lms.di.test.ts` — asserts `makeRepo()`/its callers resolve `MockLmsRepository` under `USE_MOCK=false` (forced env) |
| Integration | n/a (no real HTTP call in scope) |
| E2E | n/a (no UI change) |
| Platform | n/a |
| Release | n/a |

## Harness Delta

- `story add --id US-E18.60 --lane normal`
- ADR `0073` (force-mock LMS student consumption) registered via `decision add`.

## Evidence

Implemented 2026-08-08 on `feat/us-e18.60-lms-student-force-mock` (worktree
`../edu-staff-web-trees/us-e18.60`).

**Diff (3 files + 1 new test):**

- `src/bootstrap/di/lms.di.ts` — `makeRepo()` now returns `new
  MockLmsRepository()` unconditionally; the `USE_MOCK ? Mock : Real` branch and
  the now-dead `LmsRepository` / `createServerHttpClient` / `USE_MOCK` imports
  removed (the real `LmsRepository` CLASS is kept dormant per ADR 0073
  alternative #3; the doc comment names the exact re-import needed to un-pin).
  Doc comment carries reason (lms scaffold, ground-truth date + edu-api
  `f5ed5a86`), removal condition (ask #51) and the ADR 0073 / 0054 pointers.
- `src/bootstrap/di/lms.di.test.ts` — NEW, 6 tests.
- `docs/product/screens.md` — US-E11.6 / US-E11.7 rows annotated
  "BE force-mock bất kể `USE_MOCK`, US-E18.60/ADR 0073, chờ ask #51".
- `docs/TEST_MATRIX.md` — US-E18.60 row (`implemented`, unit proof).

**TDD (red → green):** the test was written FIRST and run against the pre-fix
factory → **4 of 6 failed** (`NEXT_PUBLIC_USE_MOCK="false"` and unset resolved
`LmsRepository`, and the recorder captured 9 `"http"` calls). After the
one-branch removal → **6/6 pass**.

**Commands run:**

| Command | Result |
| --- | --- |
| `bun vitest run src/bootstrap/di/lms.di.test.ts` | 1 file / **6 tests pass** |
| `bun vitest run` (full suite) | **520 files / 4125 tests pass**, 0 fail |
| `bunx tsc --noEmit` | clean (exit 0, no output) |
| `bun lint` | clean — 1 warning + 1 info, both pre-existing in `messaging/message-context-menu.tsx`, untouched by this story |
| `bun run build` | NOT run here — `fe-lead` runs it at the merge gate |

`grep -rn "LmsRepository" src/ \| grep -v MockLmsRepository` confirms
`lms.di.ts` was the only construction site of the real repository, so nothing
else in the repo expected real-mode behaviour.

### fe-lead gate close-out (2026-08-08)

Design-review gate: **N/A** — this story has zero UI-visible change (DI-factory
pin only; the two student screens render identical mock data whether
`USE_MOCK` is true or false). No component/page/style/token/copy diff.
`fe-accessibility-auditor` not spawned for this US (nothing renders
differently) — confirmed by `fe-tech-lead-reviewer`.

`fe-tech-lead-reviewer`: **Revision Required (docs-only)** on first pass — code
itself Approved with zero change needed. Findings closed by fe-lead in this
commit:
- **[MUST FIX]** `docs/reports/2026-08-08-fe-to-be-asks-lms.md` (ask #51) was
  cited by the ADR/DI comment/packet but did not exist on this branch — filed.
- **[SHOULD FIX]** ADR `0073` alternative #3 overstated `LmsRepository` as
  "unit-tested" — corrected to note it has NO test of its own (only the mock
  repo is tested) and added an explicit follow-up requirement (a real
  repo↔HTTP contract test before restoring the branch when ask #51 ships).
- **[SHOULD FIX]** `docs/TEST_MATRIX.md` `bun run build` note updated to
  record the actual independently-verified result (fe-lead + reviewer both
  re-ran it: exit 0, full route manifest).
- **[CONSIDER]** harness `decision` row `0073` has an empty `path` column
  (the CLI's `decision add` was run once without `--doc`, then rejected the
  retry as a duplicate id with no update subcommand available) — left as a
  known minor gap, lowest severity per reviewer.

Re-verified independently by fe-lead after the doc fixes:

| Command | Result |
| --- | --- |
| `bun vitest run` (full suite, worktree, after merging origin/main) | pass |
| `bunx tsc --noEmit` | clean |
| `bun run build` | exit 0, full route manifest |

**Verdict: gate PASS. Ready to merge.**
