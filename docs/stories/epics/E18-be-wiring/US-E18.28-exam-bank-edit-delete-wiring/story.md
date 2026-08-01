# US-E18.28 Exam-bank edit/delete + MCQ options wiring (core US-152)

## Status

in-progress

## Lane

normal

(hard-gate check: no auth/RBAC change — reuses the existing author-only /
DRAFT-only ownership gate already enforced server-side and mirrored client-
side since US-E18.15; no token/session change; no tenant-isolation change; no
data-loss risk — `deleteExam` is a genuinely new destructive action, gated
DRAFT + author-only server-side, with a confirm dialog client-side (existing
`DestructiveConfirmDialog` pattern, not new); no new PII; no weakening
validation — question writes still go through the server's own MCQ/marks/
title/duration validation; no new design-system token. See ADR `0056`
Amendment 2.)

## Dependencies

- Depends on: US-E18.15 (`exam-bank` feature module + Option A hybrid DI +
  error taxonomy this US extends, ADR `0056`).
- Blocks: none known.
- Feature module(s) touched: `src/features/exam-bank/**` (mapper, DTOs,
  entity `ExamBankQuestion` gains `marks`, real repository, failure union,
  error map, presentation gating + reorder-disable), `src/bootstrap/di/
  exam-bank.di.ts` (no factory shape change — same hybrid pattern),
  `src/bootstrap/endpoint/exam-bank.endpoint.ts` (add `question(id,
  questionId)`; reuse `detail`/`questions`). `src/features/exam/**` (student
  exam-taking) OUT OF SCOPE, zero change.
- Shared contract/file: `messages/{vi,en}.json` `examBank.*` namespace —
  extend existing keys (5 new error codes, reorder-disabled note, delete
  confirm copy if not already present), do not regenerate a parallel set.
- Solo mode confirmed via `git fetch --prune` (no other `feat/us-*`/`fix/*`
  in-flight at claim time, 2026-08-01) — main checkout, no worktree needed.

## Product Contract — ground-truthed against `edu-api` (`origin/main`, 2026-08-01)

Full analysis in ADR `0056` **Amendment 2** (read it first — it supersedes the
original Option A write-path blocked-stub table for `updateExam`/`deleteExam`
only; `createExam` stays blocked, unchanged). Ground-truth: `internal/lms/
exambank/adapter/http/{routes.go,dto/{request,response}.go,
exam_paper_handler.go}` + `core/application/usecase/{update_exam_paper,
delete_exam_paper,update_exam_question,remove_exam_question,helpers}.go` +
`core/domain/error/exam_paper.go` + `core/domain/entity/exam_paper.go`
(`requireDraft()`).

### Newly wireable REAL (extends `IExamBankRepository`, same interface shape)

| Operation | Method + path | Actor | Notes |
| --- | --- | --- | --- |
| Update paper metadata | `PATCH /courseware/exam-papers/:id` `{title?, gradeLevel?, durationMinutes?}` | author, DRAFT-only | web sends only `{title, durationMinutes}` — `gradeLevel` stays unmodeled client-side, omitted (wire treats omitted as unchanged) |
| Delete paper | `DELETE /courseware/exam-papers/:id` → 204 | author, DRAFT-only | hard delete, no undo |
| Edit one question | `PUT /courseware/exam-papers/:id/questions/:questionId` | author, DRAFT-only | full replace of that question's content; id/position preserved |
| Remove one question | `DELETE /courseware/exam-papers/:id/questions/:questionId` | author, DRAFT-only | remaining positions renumber 1..n, `totalMarks` recomputed |
| Add one question | `POST /courseware/exam-papers/:id/questions` | author, DRAFT-only | already existed since US-054; now carries `options`/`correctOptionId`/`difficulty` (ask #24 resolved) — reused as the "add" branch of the diff-sync below |

`AddQuestionRequest`/`UpdateExamQuestionRequest` share the identical body
shape: `{questionType, body, answerKey?, marks (required, min=1), options?
(2-4, {id: A-D, text}), correctOptionId? (must reference an option),
difficulty? (EASY|MEDIUM|HARD)}`. `ExamQuestionResponse` now carries
`questionId`, `options`, `correctOptionId`, `difficulty` back.

### `updateExam` is a diff-sync composition, not a single call (no bulk endpoint exists)

The real repository must (order matters — deletes before edits/adds so
position renumbering settles first):

1. `GET .../exam-papers/:id` — server truth (existing `questionId`s).
2. `PATCH .../exam-papers/:id` with `{title, durationMinutes}` only (skip the
   call entirely if neither changed, to avoid a no-op write — engineer's
   judgment call, not required for correctness).
3. For every server question whose `questionId` is absent from the local
   list → `DELETE .../questions/:questionId`.
4. For every local question whose `id` matches an existing `questionId` →
   `PUT .../questions/:questionId` (unconditionally — do not attempt content-
   diffing here, an idempotent no-op PUT is simpler and safer than a stale-
   comparison bug).
5. For every local question whose `id` does NOT match any existing
   `questionId` (client-local temp id, e.g. `q-<timestamp>` from
   `use-exam-builder.ts`'s `addQuestion`) → `POST .../questions` (append).
6. Final `GET .../exam-papers/:id` for the authoritative state (positions/
   `totalMarks` may have shifted) → map → return.

Not atomic (matches the underlying per-call BE contract — no transaction
spans this sequence). A mid-sequence failure leaves prior successful
sub-calls persisted; surface the failure normally, the next load reflects the
true partial server state. Do not attempt manual rollback.

`marks` (required ≥1 on both wire write DTOs) has **no client-side model** —
default to a constant `1` per question when writing (same defaulting class as
the existing `DEFAULT_MAX_ATTEMPTS` in the mapper). Do **not** add a new
per-question marks input field — out of proportion for this US.
`gradeLevel`-edit likewise stays unexposed in the UI (PATCH simply omits it).

Reordering (the builder's existing up/down move controls in
`question-list-item.tsx`) has **no wire equivalent** — position is
server-assigned by insertion order, only renumbered on removal. Disable the
move-up/move-down controls when `!USE_MOCK` (decorative-drop precedent, same
class as `room`/`bands`/`count` elsewhere in this epic) rather than silently
losing the user's reorder on next load.

### `createExam` stays a permanently blocked stub — UNCHANGED

`POST /exam-papers` is still metadata-only (no inline `questions[]`, no bulk
create). `/teacher/exam-bank/create` keeps rendering `ExamBuilderUnavailable`
in real mode — do not touch `create/page.tsx`/`create/actions.ts`.

### Error taxonomy — extend `ExamBankFailure` (ground-truthed `exam_paper.go`)

New codes (all `422` unless noted): `EXAM_QUESTION_NOT_FOUND` (404) →
`question-not-found`, `EXAM_MCQ_OPTIONS_INVALID` → `mcq-options-invalid`,
`EXAM_CORRECT_OPTION_INVALID` → `correct-option-invalid`,
`EXAM_OPTIONS_NOT_ALLOWED` → `options-not-allowed`,
`EXAM_QUESTION_DIFFICULTY_INVALID` → `question-difficulty-invalid`. Existing
`not-editable` (`EXAM_STATUS_INVALID_FOR_EDIT`) becomes genuinely reachable
(non-DRAFT edit/delete attempt) instead of theoretical. Branch on `error.code`
via `errorCodeOf`, never `message` (decision `0008`).

### Mapper reshape (lossless now — was lossy since US-E18.15)

`mapQuestion` (`exam-bank.mapper.ts`): map real `questionId` as the entity
`id` (was a synthetic `q-${position}`), `options`/`correctOptionId`/
`difficulty` map faithfully from the wire (were defaulted/empty). A real
DRAFT paper loaded into the builder now pre-fills correctly, matching the
already-accurate builder editing model.

## Design Notes (existing screens only — design-review + a11y gate applies)

No new screen. UI-behavior change (bigger than "hide delete only", same
disclosure rigor as US-E18.15's own Amendment):

- `/teacher/exam-bank/[id]/edit` now renders the REAL builder (not
  `ExamBuilderUnavailable`) for a DRAFT paper the caller authors, in real
  mode. Non-DRAFT paper or non-author in real mode still renders a
  blocked/unavailable state (reuse `ExamBuilderUnavailable`, adjust copy if
  it needs to distinguish "not your paper"/"already published" from the old
  blanket "not available" — engineer's call, keep translated, no color-only
  signal).
- `canDelete` on `exam-bank-screen.tsx`/`exam-card.tsx` drops its
  `authoringEnabled` dependency (delete is real now, independent of the
  still-blocked full-authoring flag): `isOwner && exam.status === "draft"`
  (real mode) or the existing mock gate (unchanged in mock mode). Existing
  `DestructiveConfirmDialog` usage (already wired for the mock path since
  US-E18.15) is reused verbatim — do not fork a new dialog.
- `canEdit` re-scoped from the old blanket `authoringEnabled` (shared with
  `canCreate`) to its own real-mode condition: real mode + DRAFT + author.
  `canCreate` stays `USE_MOCK`-gated only (create is unaffected).
  `authoringDisabledNote` copy (if still shown anywhere for the create-only
  restriction) must not claim editing/deleting are unavailable anymore —
  audit and correct the note's wording (it currently names all 3 of create/
  edit/delete per US-E18.15's A11Y-202 fix; now only create should be named).
- Reorder controls disabled in real mode — must not be a bare `disabled`
  button with no explanation if reachable/focusable; either hide entirely
  (matches "genuinely gone, not silently broken" idiom already used for
  create/edit/delete menu items in `exam-card.tsx`) or keep visible-disabled
  with a translated reason, engineer's call, but must not silently no-op.
- Status never color-only (unchanged, `StatusBadge` reused).

## Cross-repo findings — closes #24/#25/#26

See `EPIC-OVERVIEW.md` §Cross-repo requests and ADR `0056` Amendment 2 for
the full resolution text. Summary: asks #24 (MCQ options round-trip), #25
(`openapi.yaml` doc drift), #26 (paper update/delete — question edit/remove
was a bonus beyond what #26 literally asked) are RESOLVED by core US-152.
`createExam`'s bulk-create gap (the other reading of #26) stays open, by
design — not built here (see ADR 0056 Amendment 2's scope decision).

## Design Source

No new screen. Existing `exam-bank-screen`/`exam-builder-screen` keep their
layout; the builder becomes reachable/functional for DRAFT-paper edit in real
mode, delete gets a real destructive action, reorder controls disabled in
real mode.

## Evidence

### Files changed (by layer)

| Layer | Files |
| --- | --- |
| `domain/` (pure TS) | `entities/exam-bank-question.entity.ts` (+`questionType?`, +`marks?`), `failures/exam-bank.failure.ts` (+5 types), `use-cases/validate-questions.ts` (stale comment corrected), **new** `use-cases/resolve-builder-access.ts` (+ test) |
| `infrastructure/` (`server-only`) | `repositories/exam-bank.repository.ts` (real `updateExam` diff-sync + `deleteExam`; `createExam` untouched), `repositories/map-exam-bank-error.ts` (+5 codes), `mappers/exam-bank.mapper.ts` (lossless `mapQuestion`, new `mapQuestionToWire`), `dtos/exam-bank-question-response.dto.ts`, **new** `dtos/exam-bank-question-write.dto.ts` |
| `bootstrap/` | `endpoint/exam-bank.endpoint.ts` (+`question(id, questionId)`, doc de-staled), `di/exam-bank.di.ts` (doc only — no factory shape change), `i18n/messages/{vi,en}.json` |
| `presentation/` (`use client`) | `exam-bank-screen/{exam-bank-screen.tsx,.i-vm.ts,.stories.tsx}`, `exam-builder-screen/{exam-builder-screen.tsx,.i-vm.ts,.stories.tsx,exam-builder-unavailable.tsx,.stories.tsx,question-list.tsx,question-list-item.tsx}` |
| `app/` (RSC) | `teacher/exam-bank/page.tsx`, `teacher/exam-bank/[id]/edit/page.tsx`, `admin/exam-bank/page.tsx`. `create/page.tsx` + `create/actions.ts` **unchanged** |

`src/features/exam/**` (student exam-taking): **zero changes** —
`git diff --stat main...HEAD -- src/features/exam/` is empty.

### Tests (TDD red → green)

Red first: the 3 test files (`exam-bank.repository.test.ts`,
`exam-bank.mapper.test.ts`, `map-exam-bank-error.test.ts`) were written before
any production change and ran **30 failed / 59 passed** on the exam-bank scope;
green after implementation.

Before/after counts measured against the pre-change base commit `3f53ff2` in a
throwaway worktree sharing this checkout's `node_modules`:

| Scope | Before (measured at `3f53ff2`) | After |
| --- | --- | --- |
| `src/features/exam-bank` unit | 8 files / 61 tests | **10 files / 98 tests** |
| Full unit suite (`bunx vitest run`) | 437 files / 3081 tests | **438 files / 3118 tests, all pass** |
| Storybook interaction (`vitest.storybook.mts`) | not measurable in the worktree (the runner needs this checkout's Storybook cache — it errored on all 148 files there); +7 stories added, so 1096 by derivation | **151 files / 1103 tests, all pass (measured)** |

New coverage: `deleteExam` (204 + `not-editable`/`forbidden`/`not-found`);
`updateExam` diff-sync (PATCH body shape, PATCH skipped when unchanged, delete
of a removed question, PUT of existing ones, POST of a temp-id one, the exact
combined call ORDER `GET → PATCH → DELETE → PUT → POST → GET`, authoritative
final GET, and 6 mid-sequence error codes); reshaped `mapQuestion`
(`questionId` as id, options/correctOptionId/difficulty/marks/questionType) and
`mapQuestionToWire` (filled-options-only, marks preserved vs defaulted to 1,
option-less MCQ fallback, non-MCQ carries no options/answerKey); the 5 new
error codes; `resolveBuilderAccess` (6 cases); real-shaped questions in
`validateQuestion`. Stories open the card dropdown and assert item CONTENTS for
owner-DRAFT (Edit+Publish+Delete present), owner-published (no menu at all) and
another teacher's draft (no menu); builder stories assert the reorder controls
are present in mock mode and absent + explained in real mode; three
`ExamBuilderUnavailable` reason stories.

### Proof commands

- `bunx tsc --noEmit` — clean (no output).
- `bunx vitest run` — **438 files / 3118 tests passed**.
- `bunx vitest run --config vitest.storybook.mts` — **151 files / 1103 tests passed**.
- `bun lint` — no errors on the touched paths; the only remaining findings are
  1 pre-existing warning + 1 info in `features/messaging/…/message-context-menu.tsx`
  (verified pre-existing by stashing this branch's changes).
- `NEXT_PUBLIC_USE_MOCK= bun run build` — `✓ Compiled successfully`, all
  exam-bank routes (incl. `/teacher/exam-bank/[id]/edit`) compiled in real mode.

### Post-review revision (round 2 — closes the tech-lead MUST FIX + SHOULD FIX)

Both items were closed TDD-first (2 new stories red → green; the 2 mock-mode
counterpart stories passed from the start, proving the change is scoped to real
mode).

1. **[MUST FIX closed] Subject + Max attempts no longer accept discarded edits.**
   New `metaEditable` prop (`exam-builder-screen.i-vm.ts` → `ExamBuilderScreen`
   → `BuilderHeader`), threaded as `metaEditable={USE_MOCK}` from
   `[id]/edit/page.tsx` — mirroring the `reorderEnabled` pattern. In real mode
   both controls render `disabled` (kept visible: Subject is meaningful
   read-only context) with one translated explainer
   (`examBank.builder.metaLockedNote`, vi+en) that each field references via
   `aria-describedby`, so the reason is announced and not merely visible. Title
   and Duration stay editable — they DO round-trip in the PATCH.
2. **[SHOULD FIX + CONSIDER closed] No incomplete question ever reaches the
   wire.** `handleSaveDraft` now runs a pre-save gate before the FIRST write,
   reusing the `validationErrors` map the publish gate already computes: it
   selects the offending question, shows its specific translated failure
   (`question-empty-content` / `insufficient-options` /
   `question-missing-answer`) and returns without calling the action. This
   removes the generic `errors.unknown` path AND the partially-applied-save
   window for this case, and closes the CONSIDER note (the
   `EXAM_CORRECT_OPTION_INVALID` path is the same gap). Applied in both modes
   deliberately: the server can never accept such a question, so allowing it in
   mock would train a workflow that breaks in production. A valid draft still
   saves (asserted).

Post-revision proof (all re-run): `bunx tsc --noEmit` clean · `bunx vitest run`
**438 files / 3118 tests pass** (unchanged — both fixes are presentation-level,
covered by stories) · `bunx vitest run --config vitest.storybook.mts`
**151 files / 1107 tests pass** (was 1103; +4 stories) ·
`NEXT_PUBLIC_USE_MOCK= bun run build` ✓ Compiled successfully · `bun lint` only
the same 2 pre-existing `features/messaging` findings.

New i18n key: `examBank.builder.metaLockedNote` (vi source + en mirror, same
commit) — brings the `examBank` namespace to 109 keys, parity preserved.

### Engineer decisions worth reviewing

1. **Reorder controls are OMITTED, not disabled** (Design Notes left this to
   engineer's call). A focusable control that can never act is a dead end for
   keyboard/SR users, and per-button disabled reasons would repeat 2N times;
   instead `QuestionList` renders one translated note
   (`examBank.builder.reorderUnavailable`, `role="note"`, only when >1 question)
   and the move buttons are not rendered. Matches the "genuinely gone, not
   silently broken" idiom already used for the `exam-card` menu items.
2. **`ExamBankQuestion` gained `questionType?` and `marks?`** (packet
   §Dependencies anticipated `marks`). Without `questionType`, the unconditional
   PUT would rewrite an ESSAY question as MCQ; without `marks`, every edit would
   silently reset the server's per-question weight and thus `totalMarks`. Both
   are round-trip-only — **no new UI field**, matching ADR 0056 Amendment 2.
   `marks` still defaults to `1` when absent (new builder questions).
3. **`canEdit` keeps the mock's "edit a published paper" behaviour**:
   `isOwner && editingEnabled && (authoringEnabled || status === "draft")`.
   Real mode (`authoringEnabled === false`) is therefore DRAFT-only as specced,
   while the mock path is unchanged rather than silently tightened.
4. **The teacher list now resolves the caller id from the token `sub`** in real
   mode (`decodeSubClaim`, precedent `admin/academic-records/page.tsx`). Without
   this the page still passed the hardcoded `MOCK_CURRENT_TEACHER_ID`, so no
   real paper would ever satisfy `isOwner` and the newly wired edit/delete would
   have been unreachable — the gating change would have been dead code.
5. **The edit-route gate is a pure domain policy** (`resolveBuilderAccess`) so
   the RSC branch is unit-testable rather than only source-asserted. It is a
   message-quality gate only — `core` remains the security boundary
   (`loadOwnedDraftPaper` + `requireDraft()`).

## Tech-Lead Review — `fe-tech-lead-reviewer`

**Verdict: REVISION REQUIRED** (1 MUST FIX, 1 SHOULD FIX, 1 CONSIDER — no
security or architecture defect; the wiring itself is high quality)

### 1. Review Summary

Un-mocks `updateExam` (paper PATCH + question-level diff-sync) and `deleteExam`
against core US-152, and makes the builder reachable in real mode for an owned
DRAFT. The wire work is genuinely excellent: I independently ground-truthed
`routes.go`, `dto/{request,response}.go`, the four use-cases + `helpers.go`, and
`domain/error/exam_paper.go`, and every claim in the packet holds — the
diff-sync order, all five new error codes with their exact statuses, the
optional-field PATCH semantics, and the author-only/DRAFT gate. `createExam`,
`create/`, and `src/features/exam/**` are verifiably untouched. One real-mode
regression blocks: the builder's **Subject** and **Max attempts** fields remain
fully editable and report a success toast while their values are silently
discarded — the exact "silent no-op" the story's own Design Notes forbid, and
newly reachable *because of* this US.

### 2. Architecture Compliance — PASS

- `exam-bank.repository.ts:1` `import "server-only"`; `presentation/` has ZERO
  `infrastructure/`/`bootstrap/di` imports (grepped, excluding stories).
- All new paths are endpoint constants — `EXAM_BANK_EP.question(id, questionId)`
  added, no magic strings. `detail(id)` correctly serves GET/PATCH/DELETE per the
  real route table.
- `resolve-builder-access.ts` is correctly a **pure** domain use-case (no
  framework import, no `server-only`) and is correctly scoped as a
  message-quality gate. Confirmed against `helpers.go` that `core`'s
  `loadOwnedDraftPaper` (404 absent → 403 non-owner) + `requireDraft()` /
  `IsDraft()` remain the real security boundary. The RSC route calls it and
  branches correctly (`edit/page.tsx:53-59`).
- DI keeps the hybrid single-repo shape with `ensureFreshSession()` intact
  (required, since a `!USE_MOCK` branch exists). No factory-shape change.

### 3. Code Quality — Excellent

- `updateExam` (`exam-bank.repository.ts:176-236`) implements exactly the
  specced order — GET → conditional PATCH → DELETE removed → PUT existing →
  POST new → authoritative GET. `serverIds` is snapshotted *before* the deletes,
  so the PUT/POST partition is correct. Non-atomicity is real, documented in the
  doc comment, and no rollback is attempted — correct per ADR 0056 Am. 2.
- `raw: true` is a **top-level sibling** of `params` at both fan-out call sites
  (`:69-72`, `:113-116`), with an explicit inline warning comment *and* a
  `real interceptor pipeline (raw-flag placement)` regression test. This is the
  epic's recurring bug class (US-E18.2/19) handled properly — nice.
- **Entity `questionType?`/`marks?` (deviation from brief): ACCEPTED as
  necessary.** The justification holds under scrutiny: an unconditional PUT
  without `questionType` would rewrite an ESSAY as MCQ, and without `marks`
  would reset the server's `totalMarks`. Both are set in `mapQuestion` and read
  in `mapQuestionToWire` consistently; `marks` still defaults to `1` for
  genuinely new questions (`mapper.ts:126-129` guards `>= 1`). "Question type"
  and "question weight" are legitimate exam-bank domain concepts, not leaked
  wire concerns, and the promised "no new UI field" is honored.
- No `any`, no unexplained `!`. Comments explain *why*, not *what*.

### 4. Data & Contract Review — PASS

- Payload consumed directly (no `.data` read); `parseEnvelope` used only where
  pagination is needed.
- `map-exam-bank-error.ts` branches on `error.code` only (decision `0008`).
  All five new codes match the Go source exactly, and keeping
  `EXAM_QUESTION_NOT_FOUND` **ahead** of the `status === 404` fallback is a real
  catch — without it, it would have collapsed into paper-level `not-found`.
  Status fallbacks are correctly limited to transport categories (403/404/
  retryable), not domain 422s.
- `deleteExam` targets `DELETE /exam-papers/:id` → 204, no body read. Correct.
- Teacher-id resolution (`teacher/exam-bank/page.tsx:35-39`) matches the cited
  precedent verbatim (`admin/academic-records/page.tsx:23-24`), keeps mock mode
  on `MOCK_CURRENT_TEACHER_ID`, and is **fail-closed**: no token → `""`, which
  can never equal a real `authorId`. No token internals cross to the client —
  only the member id, already public as `authorId` in list data.

### 5. Design System & i18n — PASS

- Zero raw colors in the diff (swept for `bg-[#`, `text-gray-*`, `text-white`,
  hex literals — clean). No new token needed.
- vi/en parity is **exact**: `examBank` namespace is 108 keys with an empty
  symmetric difference. All 8 new keys resolve in both files, and all 8 are
  actually referenced in code (no dead keys). Error keys reach `t()` via the
  typed `errors.${errorKey}` union template — allowed.
- `authoringDisabledNote` + `unavailable.body` correctly re-worded to name only
  *create*, as the Design Notes required. `notDraftBody`/`notAuthorBody` added
  for the new reasons.
- `DestructiveConfirmDialog` and the canonical shared `EmptyState` are reused,
  not forked (decision `0026` clean).
- Reorder controls are **genuinely removed** (conditional render at
  `question-list-item.tsx:84`), not merely hidden or disabled, with one
  translated `role="note"` explainer gated on `questions.length > 1`
  (`question-list.tsx:35-42`). Correct call — better than 2N disabled buttons.

### 6. Security Review — PASS

No new auth/RBAC surface; the server gate is unchanged and remains
authoritative. Delete is DRAFT + author-only server-side, confirm-dialog
client-side. No secrets/PII client-side, no `dangerouslySetInnerHTML`, no
unvalidated redirect. The client-side gate is correctly documented as
non-authoritative rather than relied upon.

### 7. Test Coverage — PASS

Independently re-run, all matching the Evidence section:

| Command | Result |
| --- | --- |
| `bunx tsc --noEmit` | clean (exit 0) |
| `bunx vitest run` | **438 files / 3118 tests passed** — exact match |
| `NEXT_PUBLIC_USE_MOCK= bun run build` | success; `/teacher/exam-bank/[id]/edit` compiled in real mode |
| `bun lint` | 1 warning + 1 info, both pre-existing in `features/messaging` — nothing on touched paths |

Test *shape* is consistent with genuine TDD, not after-the-fact rationalization:
per-behavior cases with negative assertions ("gradeLevel/subjectId are never
sent"), an ordered `toEqual(["GET detail","PATCH …",…])` call-sequence assertion
via a recording harness, a `createExam` still-blocked-stub guard, and the
raw-flag interceptor regression guard. `docs/TEST_MATRIX.md` row and the
`EPIC-OVERVIEW.md` flip both landed, and ADR 0056 Amendment 2 is registered.

### 8. Required Changes

**[MUST FIX] — `builder-header.tsx:52-66` (Subject `Select`) and `:82-93`
(Max attempts `Input`): silently discarded on save in real mode while a success
toast fires.**
Both controls are rendered unconditionally enabled. `buildCreateInput()`
(`exam-builder-screen.tsx:68-76`) collects `subjectId` and `maxAttempts`, but
the real `updateExam` PATCH body sends **only** `{title, durationMinutes}`
(`exam-bank.repository.ts:192-195`) — `subjectId` is immutable server-side by
design (clone-routing key, per `UpdateExamPaperRequest`'s own comment) and
`maxAttempts` has no wire field at all (`DEFAULT_MAX_ATTEMPTS = 1`). The user
edits Subject, saves, sees `toast.success(t("toast.draftSaved"))`
(`exam-builder-screen.tsx:94`), and the value is gone on next load.
*Why blocking:* this is a false success signal on user-entered data, and it is
a regression **introduced by this US** — before it, `edit/page.tsx` returned
`ExamBuilderUnavailable` outright in real mode, so these fields were
unreachable. It also contradicts this story's own normative Design Note
("must not silently no-op"), which the engineer correctly honored for reorder.
*How:* mirror the `reorderEnabled` treatment already built in this same commit —
thread a flag from `edit/page.tsx` (e.g. `metaEditable={USE_MOCK}`) into
`BuilderHeader`, render the two fields read-only/`disabled` when false, and add
one translated explainer key (vi+en) in the same style as
`builder.reorderUnavailable`. Do not remove the fields (Subject is meaningful
read-only context).

**[SHOULD FIX] — `exam-builder-screen.tsx:82-113`: saving a draft containing an
incomplete question surfaces the generic `errors.unknown`.**
`handleSaveDraft` validates only `meta.title`. An incomplete question reaches
the wire, fails the `body`/`marks`/MCQ-option validators, and `core` returns
`code: "VALIDATION_FAILED"` (verified `pkg/kit/response/error.go:33-37`), which
matches no case in `mapExamBankApiError` and falls through 422 to `"unknown"`.
So the engineer's "legible but different UX" claim holds *narrowly* — the string
is translated and non-technical, nothing ugly leaks — but it renders "Đã xảy ra
lỗi không xác định." with zero guidance about which question is at fault.
Compounding it: because the sequence is deliberately non-atomic, the earlier
DELETE/PATCH calls have **already persisted** when this fires, so the user is
told "unknown error" over a partially-applied save. The component already
computes `validationErrors`/`errorIds` (`:44-58`) for the publish gate, so a
pre-save check or a specific message is nearly free. Not blocking (no data
corruption beyond the user's own intent, and it is documented), but please
either pre-check before the first write or map `VALIDATION_FAILED` to a
question-specific key.

**[CONSIDER] — `exam-bank.mapper.ts:140-149`:** when ≥2 options are filled but
`correctOptionId` is unset, or points at an option filtered out for blank text,
the server returns `EXAM_CORRECT_OPTION_INVALID`. That now maps to a good
translated message, so this is acceptable — but it is a second path into the
same "incomplete draft can't be saved in real mode" surface as the SHOULD FIX,
and would be closed by the same pre-check.

### 9. Final Decision

**REVISION REQUIRED.** No security, layer, contract, token, or i18n defect — the
BE integration is among the cleaner ones in this epic and the two flagged
"deviations" (entity `questionType`/`marks`, reorder omission) are both correctly
judged and well-documented. One MUST FIX only: close the Subject/Max-attempts
silent-discard using the `reorderEnabled` pattern already present in this diff,
then this is an approve.

## Accessibility Audit — `fe-accessibility-auditor`

### 1. Audit Summary

Scope: real-mode un-mocking of exam-paper edit/delete + question add/edit/
remove, for `feat/us-e18.28-exam-bank-edit-delete-wiring` (commits `b805de4`/
`43f20e7`/`bbec300`/`bd9c354`). Reviewed the actual component source (not just
stories) for: `exam-bank-screen.tsx`/`.i-vm.ts`/`.stories.tsx`, `exam-card.tsx`,
`exam-builder-screen.tsx`/`.i-vm.ts`/`.stories.tsx`, `exam-builder-unavailable.tsx`/
`.stories.tsx`, `question-list.tsx`, `question-list-item.tsx`, `resolve-builder-
access.ts`, both `edit/page.tsx` and `exam-bank/page.tsx` RSC routes, and the
`vi.json`/`en.json` `examBank.*` namespace (i18n parity confirmed — zero missing
keys either direction). Cross-checked contrast against `src/app/tokens.css` via
memory-verified ratios, not eyeballed.

Criteria checked: 1.3.1 (headings/landmarks), 1.4.1 (color-alone), 1.4.3
(contrast), 1.4.11 (non-text contrast — n/a, no new graphical objects), 2.1.1/
2.1.2 (keyboard operable, no trap), 2.4.3 (focus order/management), 2.4.6
(headings/labels), 2.5.5 (target size), 3.3.1/3.3.3 (error identification +
suggestion), 4.1.2 (name/role/value), 4.1.3 (status messages).

**Findings: 0 Blocking, 0 Critical, 1 Major, 2 Minor.** All five risk areas the
lead flagged were checked against ground truth; four came back clean (reorder-
omitted state, dropdown-menu trigger guard, delete-dialog reuse, focus on the
new RSC branch). One Major finding (below) on the `authoringDisabledNote`
banner's live-region semantics, carried over unfixed from US-E18.15 and now
exercised for real by this US's new gating logic — flagging it here since this
is the first US to actually make the `showAuthoringDisabledNote` branch
reachable in real mode with the corrected copy. Two Minor findings are cosmetic/
discoverability, not WCAG failures.

**Overall AA compliance: PASS** (no Blocking/Critical). The Major finding is
pre-existing plumbing (`role="status"` on static, non-dynamically-toggled
content) that this US's copy change makes newly relevant — recommend fixing
before merge since it's a one-line change, but it does not block the gate.

### 2. WCAG 2.1 AA Coverage

| Criterion | Description | PASS/FAIL | Finding ID |
| --- | --- | --- | --- |
| 1.3.1 Info and Relationships | sr-only `<h1>` present on both builder + unavailable states; `role="note"` used appropriately for the static reorder explainer | PASS | — |
| 1.4.1 Use of Color | Status/gating never color-only (StatusBadge unchanged; error toasts carry full-sentence text, not just tint) | PASS | — |
| 1.4.3 Contrast (Minimum) | `text-muted-foreground` note (aliased `--edu-text-secondary`, 5.48:1) and all touched text tokens verified against memory ratios | PASS | — |
| 2.1.1 Keyboard | All new/changed interactive elements (menu trigger, move buttons, back CTA, delete confirm) keyboard-operable | PASS | — |
| 2.1.2 No Keyboard Trap | `DestructiveConfirmDialog` unmodified (verified `git diff` empty for that file) — no new trap introduced | PASS | — |
| 2.4.3 Focus Order | Reorder-button omission doesn't create a tab-order gap (verified — see Keyboard Nav Map); RSC branch swap is a full navigation, not a client-side unmount, so no focus-loss risk | PASS | — |
| 2.5.5 Target Size | Move-up/down buttons: `size-6` visual + `min-h-11 min-w-11` hit area = 44×44px | PASS | — |
| 3.3.1 / 3.3.3 Error ID + Suggestion | 5 new error codes have plain-language, actionable copy (no "API"/technical jargon) | PASS | — |
| 4.1.2 Name, Role, Value | Dropdown menu trigger correctly omitted (not disabled-empty) when `hasMenu` is false; move-button `aria-label`s are per-question (not repeated identically) | PASS | — |
| 4.1.3 Status Messages | `authoringDisabledNote` banner uses `role="status"` on content that is static once mounted (not a live transition) — technically harmless but semantically imprecise | Minor concern | A11Y-401 |
| 2.4.6 Headings and Labels | `ExamBuilderUnavailable`'s sr-only `<h1>` text is identical (`unavailable.title`) across all 3 `reason` values — body differs, heading doesn't | Minor | A11Y-402 |

### 3. Findings Catalogue

```
A11Y-401
Severity: Major (WCAG 4.1.3, Status Messages — borderline; downgraded from
Critical because it's non-blocking in practice)
Component: src/features/exam-bank/presentation/exam-bank-screen/exam-bank-screen.tsx:199-206
Issue: `showAuthoringDisabledNote` renders `<p role="status">{t("authoringDisabledNote")}</p>`.
`role="status"` is an ARIA live-region role intended for content that CHANGES
after the region is present (e.g. a save confirmation) — screen readers key off
the region's *update*, not its initial presence, to decide whether to announce
it. This banner's content is static for the lifetime of the mount (it's a
config-time fact — "creating a new paper is unavailable here" — not something
that flips true/false during the session for a given user). Using `role="status"`
on static content is not a crash bug, but it can cause inconsistent behavior:
some AT/browser combos DO announce role="status" content present on initial
paint (a "shout on load" side effect the user didn't ask for), others don't
announce it at all since there was no prior state to diff against — so its
actual behavior is unreliable in either direction. This is unchanged from
US-E18.15 but the copy this US edited (now correctly naming only "create" as
blocked, per Design Notes item) makes the banner text meaningfully different
per-render mode for the first time, worth re-flagging.
Evidence: `role="status"` with no `aria-live` override (defaults to `polite`
per the ARIA status role mapping), wrapping copy that is set once from a
server-resolved `authoringEnabled` boolean and never toggles client-side.
Fix: Change to a plain, non-live paragraph — drop `role="status"` entirely
(it doesn't need to be a live region; a sighted+SR user alike will encounter it
in normal reading order on page load, same as any other static banner text):
```tsx
<p className="rounded-[var(--edu-radius-card)] border border-border bg-muted px-4 py-3 text-muted-foreground text-sm">
  {t("authoringDisabledNote")}
</p>
```
If the intent was ever to have this appear/disappear reactively (e.g. after a
role switch without a full reload), keep `role="status"` but only if the
component actually re-renders it dynamically — verify that's not the case here
(confirmed: `showAuthoringDisabledNote` is derived once from `viewerRole` +
`authoringEnabled`, both stable per mount).
Reference: https://www.w3.org/WAI/ARIA/apg/patterns/status/ ; WCAG 4.1.3 https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html

A11Y-402
Severity: Minor (WCAG 2.4.6, Headings and Labels — quality/discoverability, not a hard failure)
Component: src/features/exam-bank/presentation/exam-builder-screen/exam-builder-unavailable.tsx:43-47
Issue: The sr-only `<h1>` always renders `t("unavailable.title")` ("Không khả
dụng" / "Not available") regardless of `reason`, while only the body text
(`REASON_BODY_KEY[reason]`) differs per reason (create / not-draft / not-author).
A screen-reader user who navigates by heading only (H key in browse mode) gets
the same generic heading for all three distinct situations and must switch to
linear/virtual-cursor reading to learn WHY they were blocked — a small but real
efficiency cost given the three reasons genuinely need different next actions
(wait for the feature vs. ask the owner vs. just navigate back). Not a WCAG
failure per se (2.4.6 requires headings to "describe topic or purpose" — a
generic "Not available" heading for an "unavailable state" page arguably still
qualifies), so this is a quality/UX recommendation, not blocking.
Evidence: `REASON_BODY_KEY` maps 3 distinct body keys but there's no equivalent
`REASON_TITLE_KEY`; both the `<h1>` and `EmptyState`'s `title` prop use the same
single `t("unavailable.title")`.
Fix (optional, non-blocking): add a parallel title map, mirroring the existing
body map:
```tsx
const REASON_TITLE_KEY = {
  create: "unavailable.title",
  "not-draft": "unavailable.notDraftTitle",
  "not-author": "unavailable.notAuthorTitle",
} as const;
```
and use `t(REASON_TITLE_KEY[reason])` for both the `<h1>` and `EmptyState`'s
`title`. Requires 2 new i18n keys in both `vi.json`/`en.json` (e.g. "Đề thi đã
publish" / "Không phải đề thi của bạn"). If fe-lead judges the generic title +
distinct body sufficient (body is still reachable via normal reading order,
just not via heading-jump), this can be deferred — not a merge blocker.
Reference: https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html
```

No Blocking or Critical findings. The four flagged risk areas not listed above
were verified clean:

- **Reorder-omitted state** — `role="note"` (a static ARIA structure role, not
  a live region) is the correct choice here since the explainer is present at
  initial paint and doesn't need an announcement-on-change; `text-muted-
  foreground` resolves to `--edu-text-secondary` (5.48:1, AA-passing per project
  memory). Buttons are cleanly omitted (not `disabled`) — verified `question-
  list-item.tsx` wraps both move buttons in a single `{reorderEnabled && (...)}`
  block, so in real mode neither button exists in the DOM at all; Tab simply
  proceeds from the question's select-button straight to the next question's
  select-button (or the "Add question" button on the last item) — no gap, no
  dead stop, reads naturally. The `questions.length > 1` guard on the note
  correctly matches "nothing to reorder with exactly 1 question" — confirmed no
  missing-explanation gap for the single-question case (there's genuinely
  nothing to explain when reorder is moot regardless of environment).
- **Three `ExamBuilderUnavailable` reason states** — sr-only `<h1>` pattern from
  US-E18.15's A11Y-201 fix is intact for all 3 reasons (see A11Y-402 for the
  one gap: the heading text itself doesn't vary). Body copy per reason verified
  accurate and non-technical; the `not-author` copy ("Bạn chỉ có thể chỉnh sửa
  đề thi do chính mình tạo") does NOT leak the actual owning teacher's identity
  — good. Back CTA (`unavailable.back`) is a `Button` (keyboard-reachable by
  default) with a clear, translated accessible name ("Quay lại kho đề thi"),
  confirmed present and clickable in `exam-builder-unavailable.stories.tsx`'s
  `Default` play function for all reasons (component structure is reason-
  independent apart from body text).
- **`exam-card.tsx` dropdown menu content** — `hasMenu = exam.canEdit ||
  exam.canDelete || exam.canPublish` gates the ENTIRE `<DropdownMenu>` block
  including `<DropdownMenuTrigger>`, not just its content — confirmed by
  reading source (menu trigger button is inside the `{hasMenu && (...)}` JSX
  block, line 46-87). When no action applies (owner-published, or another
  teacher's draft), the trigger itself does not render — no dead disabled
  button, no empty menu to open. `exam-bank-screen.stories.tsx`'s
  `TeacherRealMode_PublishedOwnPaperHasNoActions` and admin-read-only stories
  both assert `queryByRole("button", { name: /Mở menu thao tác đề thi/i })` is
  absent, confirming this at the test level too.
- **`canEdit`/`canDelete` real-mode DRAFT-only gating + new error codes** — no
  icon-only control or menu item conveys status/permission by color alone
  (menu items are always icon+translated text; `StatusBadge` unchanged). All 5
  new error codes (`question-not-found`, `mcq-options-invalid`, `correct-
  option-invalid`, `options-not-allowed`, `question-difficulty-invalid`) have
  plain-language Vietnamese copy in both `vi.json`/`en.json` (verified, no
  missing keys either direction) with no technical jargon ("API", status codes,
  etc.) and each names what's wrong in a way that implies the fix (e.g. "Câu
  hỏi trắc nghiệm cần từ 2 đến 4 phương án và mỗi phương án phải có nội dung"
  tells the user exactly what range/requirement to meet).
- **Delete confirm dialog** — `git diff main..HEAD --stat -- src/components/
  shared/destructive-confirm-dialog` is empty: the component is byte-for-byte
  unchanged, so its prior a11y audit (US-E18.15) still holds in full. Copy
  (`deleteDialog.title/body/confirm/cancel/deleting`) is present in both
  `vi.json`/`en.json`; body text ("Thao tác này không thể hoàn tác. Chỉ đề thi
  ở trạng thái nháp mới có thể xoá.") clearly states irreversibility and the
  draft-only precondition in plain language.
- **Focus management on `[id]/edit`** — the route change is a full RSC render
  branch (`resolveBuilderAccess` decides server-side which component tree to
  return: `ExamBuilderUnavailable` vs. `ExamBuilderScreen`), not a client-side
  state toggle within an already-mounted page. This is a normal page
  navigation, so the browser's native "focus moves to `<body>`/document start,
  SR announces the new page title" behavior applies — no special focus-
  management code was needed and none was added; `ExamBuilderScreen` already
  had its own sr-only `<h1>` (unchanged, confirmed still present at line
  142-144) from before this US, so heading-navigation works identically to the
  mock-mode case that already existed.

### 4. Keyboard Navigation Map (changed surfaces)

**Exam list card (`exam-card.tsx`), owner-DRAFT real mode:**
1. Tab → card title link (if any) → Tab → "Mở menu thao tác đề thi" trigger
   button (only present when `hasMenu`).
2. Enter/Space on trigger → Radix `DropdownMenu` opens, focus moves into menu
   (first item "Chỉnh sửa"/Edit).
3. Arrow Down/Up → cycles Edit → Publish → (separator, skipped) → Delete.
4. Enter on "Xoá" (Delete, `variant="destructive"`) → menu closes → `AlertDialog`
   (`DestructiveConfirmDialog`) opens, focus moves to dialog (Radix default);
   Escape or "Huỷ" closes and (per the unmodified shared component) returns
   focus to the trigger; Enter on "Xoá" (confirm) runs the delete mutation.
5. Owner-published or another-teacher's-draft: step 1's Tab skips straight
   past where the trigger would be — no dead stop, confirmed by the `hasMenu`
   guard removing the element entirely.

**Question list (`question-list.tsx` + `question-list-item.tsx`), real mode
(`reorderEnabled=false`):**
1. Tab reaches the (optional) static `role="note"` explainer text — not
   focusable, so Tab does not stop there; it's read in document order only for
   users doing linear/virtual-cursor review, not a Tab stop.
2. Tab → question 1's select button → Tab → question 2's select button → …
   (move-up/move-down buttons are entirely absent from the DOM, so Tab never
   pauses where they'd have been — confirmed no gap/skip artifact) → Tab →
   "Thêm câu hỏi" (Add question) button.
3. Mock mode (`reorderEnabled=true`, unchanged): each question item additionally
   exposes move-up/move-down icon buttons (native `disabled` on first/last item
   — acceptable here since these are plain buttons in a list, not a roving-
   tabindex composite widget, so native `disabled` doesn't break Arrow-key
   navigation the way it would on `role="tab"`).

**`ExamBuilderUnavailable` (any reason):**
1. Page loads → sr-only `<h1>` is the first heading (H-key navigable) → visible
   `EmptyState` title/body (non-interactive) → Tab → "Quay lại kho đề thi" back
   button (only interactive element on the page) → Enter/Space navigates back
   to `/teacher/exam-bank`.

### 5. Screen Reader Script

**Reorder-note state (real mode, >1 question), before vs. after this US:**
- Before US-E18.28 (mock-only build, hypothetical if this had shipped as
  "disabled" instead of "omitted"): SR user tabs to a "Move up" button,
  hears "Move up, dimmed/unavailable" with no reason — confusing dead control.
- After (as shipped): SR user reading linearly hears "Thứ tự câu hỏi được sắp
  theo lúc thêm và chưa thay đổi được trong môi trường này." as a plain note
  before the question list; tabbing through the list, no move-button stop is
  encountered at all — no confusing disabled-control announcement. Net: clearer
  than a disabled-button pattern would have been.

**`ExamBuilderUnavailable`, `not-author` reason, before vs. after:**
- Before (US-E18.15, blanket message): "Heading level 1, Không khả dụng." …
  (generic body) … "button, Quay lại kho đề thi."
- After (this US, reason-specific body, same generic heading — A11Y-402):
  "Heading level 1, Không khả dụng." … "Bạn chỉ có thể chỉnh sửa đề thi do
  chính mình tạo." … "button, Quay lại kho đề thi." — SR user now gets an
  accurate, specific reason in the body (an improvement over the old blanket
  copy), but heading-jump navigation alone still only surfaces "Không khả
  dụng" for all three reasons (see A11Y-402 for the optional enhancement).

**Delete confirm flow (now reachable for real papers, not just mock):**
- SR user activates "Xoá" menu item → alertdialog announced: "Xoá đề thi này?"
  … "Thao tác này không thể hoàn tác. Chỉ đề thi ở trạng thái nháp mới có thể
  xoá." … two buttons "Huỷ", "Xoá" — unchanged from the already-audited
  US-E18.15 pattern, now exercised against real backend data for the first
  time.

### 6. Quick Wins (sorted by severity, all < 30 min)

1. **A11Y-401** (Major) — remove `role="status"` from the static
   `authoringDisabledNote` `<p>` in `exam-bank-screen.tsx:200-205`. ~2 min.
2. **A11Y-402** (Minor) — add a `REASON_TITLE_KEY` map + 2 new i18n keys so the
   sr-only `<h1>`/`EmptyState` title varies per reason in
   `exam-builder-unavailable.tsx`. ~15 min including both `vi.json`/`en.json`
   entries. Optional/deferrable.

### Gate Verdict: **PASS**

No Blocking or Critical findings. One Major finding (A11Y-401) is a one-line,
low-risk fix `fe-lead`/`fe-nextjs-engineer` can apply before or after merge at
their discretion — recommend applying it pre-merge since it's trivial, but it
does not need to hold the gate open. One Minor finding (A11Y-402) is an
optional enhancement, explicitly deferrable per the story's own "engineer's
call" framing for this component.

**Fix applied (fe-lead, pre-merge, 2026-08-01)**: A11Y-401 — removed
`role="status"` from `authoringDisabledNote`'s `<p>` in
`exam-bank-screen.tsx`; updated the story assertion in
`exam-bank-screen.stories.tsx` (`TeacherRealMode_CreateDisabledEditDeleteWired`)
that had pinned the old `role="status"` attribute. Re-verified:
`bunx vitest run src/features/exam-bank` (9 files/98 tests, unchanged) and
`bunx vitest run --config vitest.storybook.mts src/features/exam-bank/presentation/exam-bank-screen`
(1 file/8 tests) both green. A11Y-402 deferred as an optional follow-up (not
blocking).

## Design Review Gate

_(pending — required, UI-behavior change per Design Notes above)_

## QA Gate — `fe-qa-playwright`

_(pending)_
