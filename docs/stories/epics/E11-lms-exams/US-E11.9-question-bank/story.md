# US-E11.9 Teacher Question Bank

## Status

implemented

## Lane

normal

(hard-gate check: no auth/RBAC change beyond existing pattern — search is
staff-only (TEACHER/MANAGER/ADMIN) per BE `canBrowseBank`, a read-scoping
consistent with existing school-scoped content patterns, not a weakening; no
token/session change; no tenant isolation change; no data-loss risk — no
delete endpoint modeled; no PII; no validation weakening; no new
design-system token.)

## Dependencies

- Depends on: none (BE contract already exists and is stable — ground-truthed
  US-E18.16; design already delivered — DR-021).
- Blocks: none known.
- Feature module(s) chạm: `src/features/question-bank` (net-new).
- Shared contract/file: `src/bootstrap/endpoint/lms.endpoint.ts` (new
  `QUESTION_BANK_EP` group, additive — do NOT confuse with existing
  `LMS_EP.questions`, the unrelated per-lesson Q&A thread), `docs/TEST_MATRIX.md`.

## Origin

`docs/design-requests/DR-021-lesson-plan-question-bank.md` (delivered
2026-07-17) — net-new design for a BE contract ground-truthed in
`docs/stories/epics/E18-be-wiring/US-E18.16-lesson-question-bank-wiring/story.md`
(finding #27). This BA pass turns the design into an engineering-ready spec.

## Product Contract

See `requirements.md`, `integration.md`, `use-cases.md` — consolidated in
`spec.md` (the document `fe-lead` builds from).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` → `screens.questionBank` (normative layout).
- `docs/product/screens.md` (Question Bank + Builder row).
- `docs/product/roles-permissions.md` (teacher role; staff-only search).
- `.claude/rules/api-integration.md` (envelope, camelCase, service map `core`).
- `design_src/edu/question-bank.jsx` (reference mockup).

## Acceptance Criteria

See `use-cases.md` / `spec.md` traceability matrix. Must cover the mandatory
subjectId/tag search-filter gate (422 `QUESTION_SEARCH_FILTER_REQUIRED`) as a
first-class AC, not a generic error case.

## Design Notes

See `spec.md`.

## Validation

To be filled by `/fe` when implemented. Add a `docs/TEST_MATRIX.md` row now at
`planned` (all proof flags `0`/`no`) per `.claude/rules/tdd.md`.

| Layer | Expected proof |
| --- | --- |
| Unit | domain use-cases (create/update/publish DRAFT question, list mine, search PUBLISHED with mandatory-filter validation), mapper, failure mapping |
| Integration | repository ↔ HTTP boundary against `LMS_EP.questions` (new group) real contract (mock-first dev default) |
| E2E | Storybook interaction + Playwright: search-without-filter (blocked)→search-with-filter→create→publish flow, all states |
| Platform | `bun build` green |

## Harness Delta

- Story registered via `harness-cli story add --id US-E11.9 --lane normal`.
- `docs/TEST_MATRIX.md` row added (`planned`).
- Shared ADR `0057` (publish terminology) covers this story too.

## Evidence

BA analysis artifacts: `requirements.md`, `integration.md`, `use-cases.md`,
`spec.md` in this packet. FE analysis/design artifacts: `plan.md`,
`component-architecture.md`, `state-architecture.md`.

### Implementation proof (2026-07-17)

- `bun vitest run`: 337 files / 2176 tests pass (130 new for this story:
  45 domain unit + 49 infra + 19 route + 17 Storybook interaction, plus 2 more
  added in the review-fix pass).
- `bunx tsc --noEmit`: clean. `bun lint`: clean (1 pre-existing unrelated
  warning in `message-context-menu.tsx`, not touched by this story).
- `NEXT_PUBLIC_USE_MOCK= bun run build`: exit 0; all 3 routes emitted
  (`/teacher/question-bank`, `/create`, `/[id]/edit`).
- `fe-tech-lead-reviewer`: **Approved**. Verified the highest-risk detail
  (the `forbidden-browse`/`forbidden-edit` call-site branch on the shared
  `403 FORBIDDEN_ACTION` wire code) explicitly correct; route guards precede
  DI in all 3 pages + re-checked in all 8 Server Actions; FR-007/FR-009
  boundaries hold; `{raw:true}` correctly placed; shared-component promotions
  clean; layering/i18n/TDD proof all pass.
- `fe-accessibility-auditor`: 1 Major (A11Y-001, subject-field error dead-wired)
  + 3 Minor (A11Y-002 builder title semantics, A11Y-003 tag-remove touch
  target, A11Y-004 tags-label linkage) — **all 4 fixed** in the review-fix
  pass, verified by re-run.
- Review-fix pass also closed the tech-lead's non-blocking SHOULD-FIX
  (`subject-not-found` now surfaces inline on the subject field, not a
  generic toast) and a CONSIDER (search-scope debounce-window empty-state
  flash, closed via a render-guard, no state-architecture change).

### Design review: pass

- design-system: conform — zero raw color (`grep` clean across
  `src/features/question-bank/presentation` + the 3 promoted shared
  components); badges/status/tags follow the existing `StatusBadge`/`Badge`
  pattern (icon+text, `/15` tint, rounded pills) with no forked variant;
  `QBQuestionCard` mirrors the established row-card shape (icon box, shadow-card
  → shadow-card-hover), no nested cards, no nonexistent primitive
  reinvented (`QBDropdown` correctly resolved to plain shadcn `Select`, see
  `component-architecture.md` §1).
- a11y: WCAG AA — see above (auditor findings fixed); keyboard-operable
  (segmented selector, 5 filter `Select`s, `ScopeToggle`, dialogs); focus
  rings via shared primitives; `prefers-reduced-motion` gated on the shared
  `PublishConfirmDialog`/`AlertDialog`; touch targets ≥44×44px after
  A11Y-003 fix.
- impeccable audit (manual pass, this session — no AI-slop tells: no
  gradient text, no glassmorphism, no generic hero-metric/icon-card grid, no
  nested cards, no bounce easing): zero raw-color findings; single-column
  responsive confirmed (`QBMetaGrid` is `grid` default, `md:grid-cols-[1.4fr_1fr_1fr]`
  only ≥768px, per NFR-005/DR-021); zero P0/P1 findings. No fixes required
  beyond what the accessibility audit already drove.
- states: all 9 UI states (spec §5) implemented and Storybook-covered —
  loading/`QBFilterRequiredPrompt` (distinct 5th state)/emptyAll/emptyFiltered/
  error/success/form-validation-error/locked/publish-confirm; responsive
  320px not manually screenshotted this pass but the grid/flex classes used
  throughout are the same audited pattern as `lesson-plan` (US-E11.8), which
  passed this check.

### Component promotions (decision 0026)

- `TagChipsInput` → `src/components/shared/tag-chips-input/` (2nd consumer:
  `question-bank`; touch-target fix applied in review pass, benefits both
  consumers).
- `PublishConfirmDialog` → `src/components/shared/publish-confirm-dialog/`
  (2nd consumer: `question-bank`).
- `OwnerToggle` → generalized to `ScopeToggle` at
  `src/components/shared/scope-toggle/` (2nd consumer: `question-bank`'s
  mine/search toggle).
- Deferred (not promoted this story, logged as follow-up candidates):
  `LessonPlanErrorState`/`QuestionBankErrorState` (accepted a 2nd
  feature-local fork — this generic alert+retry shape already has ~15 ad-hoc
  inline implementations across the codebase; consolidating it is a
  codebase-wide cleanup out of this story's scope, revisit at a 3rd
  consumer or as its own cleanup story).

### QA gate (fe-qa-playwright) — final verdict: GO

- Independent AC↔test traceability re-derived from actual test files (not
  the engineer's self-report) against all 72 ACs (spec.md §7). Found genuine
  gaps and closed them with new tests (not production changes): AC-902.1/.2/.4
  (gate zero-request/subject-satisfies/clear-reverts), AC-904.8/AC-905.6
  (already-published race, previously zero Storybook coverage despite being
  implemented), AC-906.6 (explicit Edit-CTA-hidden assertion), AC-907.1/.2/.4
  on the `create` route (had no test file at all before this pass).
- **1 CRITICAL found and fixed**: AC-902.8 (defense-in-depth `422
  QUESTION_SEARCH_FILTER_REQUIRED` while the client gate reads satisfied) fell
  through to the generic `QuestionBankErrorState` banner instead of
  `QBFilterRequiredPrompt` — proven against real rendered Chromium DOM, not
  code reading. Fixed in `question-bank-list-screen.tsx` by folding a
  `serverRequiresFilter` check (derived from the thrown query error) into
  `showSearchGate`, checked ahead of the generic `isError` branch. The
  `Search_DefenseInDepth422` story that reproduced it now passes and is kept
  in the suite as a permanent regression guard.
- **1 MAJOR found and fixed**: `currentTeacherId` was threaded through the VM
  but never read (`isMine` was computed from `scope === "mine"` instead,
  contradicting its own doc-comment). Resolved by wiring
  `isMine: q.authorId === vm.currentTeacherId` per spec §6.6's ownership-check
  basis — behavior-neutral for all shipped scenarios, future-proofs the case
  where a teacher's own PUBLISHED question surfaces in a `scope=search`
  result set.
- Re-verified after fixes: `Search_DefenseInDepth422` + all list-screen
  stories 11/11 pass; AC-906.6 unaffected for shipped scenarios; full suite
  338 files / 2179 tests; tsc clean; `bun lint` clean; `NEXT_PUBLIC_USE_MOCK=
  bun run build` exit 0.
- **Verdict: GO for merge.**

### Harness

- `docs/TEST_MATRIX.md` US-E11.9 row updated with real proof flags (see
  above); story `## Status` finalized to `implemented`.
- `harness-cli story update --id US-E11.9 --status implemented --unit 1
  --integration 1 --e2e 1` run by `fe-lead` after QA GO verdict.
