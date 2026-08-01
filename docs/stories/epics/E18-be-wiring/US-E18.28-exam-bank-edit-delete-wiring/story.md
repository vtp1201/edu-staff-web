# US-E18.28 Exam-bank edit/delete + MCQ options wiring (core US-152)

## Status

planned

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

_(fe-nextjs-engineer fills in: files changed, test counts, `tsc`/`build`
proof.)_

## Tech-Lead Review — `fe-tech-lead-reviewer`

_(pending)_

## Accessibility Audit — `fe-accessibility-auditor`

_(pending)_

## Design Review Gate

_(pending — required, UI-behavior change per Design Notes above)_

## QA Gate — `fe-qa-playwright`

_(pending)_
