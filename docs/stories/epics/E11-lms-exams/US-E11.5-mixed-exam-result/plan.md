# US-E11.5 — Mixed Exam Result: `submitted_pending_essay` Status + Pending-Essay Flow

**Plan authored by:** fe-planner
**Lane:** normal — no new tokens required (warning/warning-light/purple already exist)
**Mock-first:** lms service not shipped — `NEXT_PUBLIC_USE_MOCK` + mock fixture extension (decision 0014)
**Dependency:** extends E11.1; must not regress any existing exam tests

---

## 1. Summary

Four screens receive additive deltas layered on top of E11.1 (student exam flow). No existing
file is deleted; every change is additive — new union members, nullable fields, new branches in
mappers, and new UI sub-sections.

**Done when:**
- `ExamStatus` carries `'submitted_pending_essay'`; `ExamQuestion` carries optional `type`
- `ExamResult.score` / `passed` are nullable; partial-score fields present on entity + DTO
- `calculatePartialScore()` + `isResultFinal()` unit-tested green
- `ExamAnswer` is a discriminated union (mcq + essay variants)
- `SubmitExamInput.answers` accepts the union
- Mock fixture `exam-005` (mixed exam) + `buildMockMixedQuestions()` + `MOCK_PENDING_ESSAY_RESULT` exist
- ExamList shows "Chờ chấm" filter chip + pending-essay card variant
- ExamBriefing shows mixed indicator, updated type row, grading note when `hasEssayQuestions`
- ExamTaking renders essay textarea + char count + navigator essay icon
- ExamResult renders partial-score hero (score null path), pending-essay warning banner, essay
  stats, essay question label in review, completed-after-essay path
- 5 new Storybook stories pass interaction tests
- `bun vitest run` and `bun build` green; E11.1 tests unchanged

**Key decisions to flag for fe-lead / ADR:**
- `ExamResult.score: number | null` and `passed: boolean | null` is a public entity contract
  change — flag as ADR-0048 (decision required before implementation). Mapper must handle both
  null and number at the DTO→entity boundary.
- `SubmitExamInput.answers` union shape must stay compatible with the mock repo's submit
  handler; the real lms contract is pending so the union is mock-first only.

---

## 2. Phased Breakdown

---

### Phase 1 — Domain layer (TDD red first)

**Goal:** extend entities, add pure domain helpers, define discriminated answer union. All pure
TypeScript — zero framework imports.

**Files changed:**

| File | Change |
|---|---|
| `src/features/exam/domain/entities/exam.entity.ts` | Add `'submitted_pending_essay'` to `ExamStatus`; add `'mixed'` to `ExamType`; add optional fields to `ExamSummary`: `hasEssayQuestions?`, `essayCount?`, `essayMax?`, `mcqScore?`, `mcqMax?`, `questionTypes?` |
| `src/features/exam/domain/entities/exam-question.entity.ts` | Add `type?: 'mcq' \| 'essay'` to `ExamQuestion` (optional, default behaviour = mcq) |
| `src/features/exam/domain/entities/exam-result.entity.ts` | Change `score: number` → `score: number \| null`; `passed: boolean` → `passed: boolean \| null`; add `status?: ExamStatus`; add `mcqScore?`, `mcqMax?`, `essayMax?`, `essayCount?`; relax `QuestionResult.correctOptionId` → `string \| null`, `isCorrect` → `boolean \| null`; add `type?: 'mcq' \| 'essay'`, `textAnswer?: string \| null` to `QuestionResult` |
| `src/features/exam/domain/calculate-score.ts` | Add `calculatePartialScore(correctCount, mcqCount)` — MCQ-only score (correct/mcqCount * 10, round 1dp); add `isResultFinal(result: Pick<ExamResult, 'status' \| 'score'>): boolean` guard |
| `src/features/exam/domain/repositories/i-exam.repository.ts` | Update `SubmitExamInput.answers` to accept `ExamAnswer[]` (discriminated union defined in new file) |
| `src/features/exam/domain/entities/exam-answer.entity.ts` | **New file.** `McqAnswer { type: 'mcq'; questionId: string; selectedOptionId: string \| null }` + `EssayAnswer { type: 'essay'; questionId: string; text: string }` + `ExamAnswer = McqAnswer \| EssayAnswer` |

**Test first (red → green):**

File: `src/features/exam/domain/use-cases/__tests__/calculate-score.test.ts`
Extend existing test file — add a new `describe('calculatePartialScore')` block and a
`describe('isResultFinal')` block before writing the implementation.

```
calculatePartialScore
  it('10 correct / 15 mcq = 6.7', ...)
  it('15/15 = 10', ...)
  it('0/15 = 0', ...)
  it('0/0 = 0 (guard)', ...)

isResultFinal
  it('returns true when score is a number', ...)
  it('returns false when score is null', ...)
  it('returns false when status is submitted_pending_essay', ...)
  it('returns true when status is completed and score is a number', ...)
```

**Done when:** `bun vitest run` green on the extended calculate-score test file; no other test
regressions.

---

### Phase 2 — Infrastructure layer (DTO + mapper + mock fixtures)

**Goal:** extend DTO interfaces, add mapper branches for nullable/essay fields, seed mock data
for a mixed exam.

**Files changed:**

| File | Change |
|---|---|
| `src/features/exam/infrastructure/dtos/exam-response.dto.ts` | Add optional fields to `ExamSummaryDto`: `hasEssayQuestions?`, `essayCount?`, `essayMax?`, `mcqScore?`, `mcqMax?`, `questionTypes?`; add `type?: string` to `ExamQuestionDto`; change `score: number` → `score: number \| null`, `passed: boolean` → `passed: boolean \| null`, add `status?`, `mcqScore?`, `mcqMax?`, `essayMax?`, `essayCount?` to `ExamResultDto`; relax `QuestionResultDto.correctOptionId` → `string \| null`, `isCorrect` → `boolean \| null`; add `type?`, `textAnswer?` to `QuestionResultDto`; update `SubmitExamDto.answers` to `{ questionId: string; selectedOptionId?: string \| null; text?: string; type: 'mcq' \| 'essay' }[]` |
| `src/features/exam/infrastructure/mappers/exam.mapper.ts` | `mapExamSummary`: pass through new optional fields; `mapExamQuestion`: pass through `type`; `mapQuestionResult`: pass through `type`, `textAnswer`, relax `correctOptionId`/`isCorrect` to nullable; `mapExamResult`: pass through nullable `score`/`passed`, new aggregate fields |
| `src/features/exam/infrastructure/repositories/mocks/exam.fixtures.ts` | Add `exam-005` summary (`status: 'submitted_pending_essay'`, `type: 'mixed'`, `hasEssayQuestions: true`); add `buildMockMixedQuestions(mcqCount, essayCount)` — returns mcq questions then essay questions; add `MOCK_QUESTIONS['exam-005']`; add `MOCK_PENDING_ESSAY_RESULT` (score: null, passed: null, status: 'submitted_pending_essay', mcqScore: 6.7, mcqMax: 7, essayMax: 3, essayCount: 2, questionResults include essay entries with `type: 'essay'`, `correctOptionId: null`, `isCorrect: null`) |

**Test first (red → green):**

File: `src/features/exam/infrastructure/mappers/__tests__/exam.mapper.test.ts`
Extend existing file with two new `it` blocks:

```
it('mapExamSummary passes through hasEssayQuestions + essay aggregate fields', ...)
it('mapExamResult handles score: null and passed: null (pending-essay result)', ...)
it('mapQuestionResult handles essay type with null correctOptionId and isCorrect', ...)
```

**Done when:** mapper test file green; existing mapper tests unchanged; `exam-005` fixture
accessible via `MOCK_EXAMS` and `MOCK_QUESTIONS`.

---

### Phase 3 — Presentation: ExamList

**Goal:** add `'submitted_pending_essay'` to filter chips and ExamCard rendering.

**Files changed:**

| File | Change |
|---|---|
| `src/features/exam/presentation/exam-list/exam-list.tsx` | Add `'submitted_pending_essay'` to `FilterKey` union and `FILTERS` array; add `submitted_pending_essay: 'warning'` entry to `STATUS_TONE` map; in `ExamCard`: add `isPendingEssay` branch — renders `Button variant="outline"` with `t('cta.viewPendingResult')` and a `StatusBadge tone="warning"` (using existing warning token, no new token needed) |
| `src/features/exam/presentation/exam-list/exam-list.stories.tsx` | Add story `ExamList_PendingEssayCard` — exams array contains `exam-005` summary; verify filter chip "Chờ chấm" appears and card CTA reads "Xem kết quả tạm thời" |

**Test first (Storybook interaction):**

Story `ExamList_PendingEssayCard`:
- `expect(canvas.getByText('Chờ chấm tự luận')).toBeInTheDocument()` (status badge)
- `expect(canvas.getByRole('tab', { name: 'Chờ chấm' })).toBeInTheDocument()` (filter chip)
- `expect(canvas.getByRole('button', { name: 'Xem kết quả tạm thời' })).toBeInTheDocument()`

**Done when:** story renders without console error; interaction assertions pass.

---

### Phase 4 — Presentation: ExamBriefing

**Goal:** show mixed-exam badge, updated type chip, grading note when `hasEssayQuestions` is set.

**Context:** `ExamBriefingVm` receives `exam: ExamSummary`. The briefing currently reads
`t('briefing.typeValue')` unconditionally for the type InfoChip — this needs to branch on
`exam.type === 'mixed'`.

**Files changed:**

| File | Change |
|---|---|
| `src/features/exam/presentation/exam-briefing/exam-briefing.i-vm.ts` | No change needed — `ExamBriefingVm.exam` is `ExamSummary` which will carry the new fields after Phase 1 |
| `src/features/exam/presentation/exam-briefing/exam-briefing.tsx` | In the type `InfoChip`: branch `exam.type === 'mixed'` → `t('briefing.mixedTypeValue')` else `t('briefing.typeValue')`; add `mixedType` badge (`<StatusBadge tone="purple">`) in the header band when `exam.type === 'mixed'`; after the rules section, add a conditional `<p>` block showing `t('briefing.essayGradingNote')` when `exam.hasEssayQuestions` (muted-foreground, text-sm, with `Info` lucide icon) |
| `src/features/exam/presentation/exam-briefing/exam-briefing.stories.tsx` | Add story `Briefing_MixedIndicator` — pass `exam-005` summary; verify mixed badge and grading note are visible |

**Test first (Storybook interaction):**

Story `Briefing_MixedIndicator`:
- `expect(canvas.getByText('Bài thi kết hợp')).toBeInTheDocument()` (badge label)
- `expect(canvas.getByText('Trắc nghiệm + Tự luận')).toBeInTheDocument()` (type chip value)
- `expect(canvas.getByText(/Phần tự luận sẽ được giáo viên chấm/)).toBeInTheDocument()`

**Done when:** story renders; existing `Briefing_Default` story still passes.

---

### Phase 5 — Presentation: ExamTaking

**Goal:** render essay textarea for questions with `type === 'essay'`; show char count;
show distinct navigator icon for essay questions.

**Context:** current `ExamTakingScreen` uses a `Map<string, string>` for `answers` (MCQ
option IDs). After this phase it must handle two answer shapes. The `ExamAnswer` discriminated
union is defined in Phase 1 (`exam-answer.entity.ts`) but `exam-taking.i-vm.ts` currently
defines its own inline `ExamAnswer` — that inline type must be replaced by the domain entity.

**Files changed:**

| File | Change |
|---|---|
| `src/features/exam/presentation/exam-taking/exam-taking.i-vm.ts` | Remove inline `ExamAnswer` interface; import from `@/features/exam/domain/entities/exam-answer.entity` |
| `src/features/exam/presentation/exam-taking/exam-taking.tsx` | Change `answers` state: `Map<string, string>` → `Map<string, string \| null>` for MCQ + add `essayAnswers: Map<string, string>` state for essay text; in question render: branch `current.type === 'essay'` → render `<textarea>` with `placeholder={t('taking.essayPlaceholder')}` + char-count `<p>` using `t('taking.essayCharCount', { count })`; add `aria-label` + `maxLength={2000}`; update `buildAnswers()` to produce `ExamAnswer[]` (discriminated) by checking question type; add warning `<p role="alert">` showing `t('taking.essayEmptyWarning')` in submit modal / confirmation when any essay question has empty text |
| `src/features/exam/presentation/exam-taking/question-navigator.tsx` | Accept optional `essayIds?: Set<string>` prop; when a question id is in `essayIds` and not current/answered, render a `PenLine` lucide icon (12px) inside the navigator button as a secondary indicator (does not replace the number — overlaid bottom-right as a 10px absolute badge); add `essay` entry to the legend row |
| `src/features/exam/presentation/exam-taking/exam-taking.stories.tsx` | Add story `Taking_EssayQuestion` — pass `exam-005` questions; navigate to an essay question (index > mcqCount); verify textarea visible + char count visible |

**Test first (Storybook interaction):**

Story `Taking_EssayQuestion`:
- `expect(canvas.getByRole('textbox')).toBeInTheDocument()`
- `expect(canvas.getByText('0/2000 ký tự')).toBeInTheDocument()`
- userEvent: type 5 chars → `expect(canvas.getByText('5/2000 ký tự')).toBeInTheDocument()`

**Done when:** story assertions pass; MCQ question path unchanged (existing taking stories pass).

---

### Phase 6 — Presentation: ExamResult

**Goal:** handle `score: null` path (partial-score hero), pending-essay warning banner, essay
stats card, essay label in question review, and completed-after-essay path.

**Context:** current `ExamResultScreen` calls `result.score.toFixed(1)` — this will throw at
runtime when `score` is null. All four display paths must be gated.

**Files changed:**

| File | Change |
|---|---|
| `src/features/exam/presentation/exam-result/exam-result.i-vm.ts` | No change — `ExamResultVm.result` is `ExamResult` which will carry new fields after Phase 1 |
| `src/features/exam/presentation/exam-result/exam-result.tsx` | Score hero: gate `result.score !== null` before `.toFixed(1)`; when `score === null`, render `"—"` in the score slot + `<StatusBadge tone="warning">{t('result.partialResultBadge')}</StatusBadge>` instead of pass/fail badge; add pending-essay warning banner (conditional on `result.status === 'submitted_pending_essay'`): a `<section>` with warning tone border (`border-edu-warning bg-edu-warning/10`), `AlertTriangle` lucide icon, heading `t('result.pendingEssayTitle')`, body `t('result.pendingEssayBody', { mcqScore, mcqMax, essayMax })`; update stats row: when `result.essayCount` is present and > 0, add a 4th stat card `t('result.essayPending')` with value `String(result.essayCount)` + `PenLine` icon + `tone="warning"`; in `categoryOf()`: handle essay questions — when `q.type === 'essay'` return `'essay'` (add to `ReviewFilter` union + filter chip + visible filter branch); in `QuestionReviewCard`: when `q.type === 'essay'`, render a text-answer display block (`bg-muted rounded p-3 text-sm`) with label `t('result.essayQuestionLabel')` instead of the options list + correct/wrong indicators; completed-after-essay path: when `isResultFinal(result)` AND `result.status` was previously `submitted_pending_essay` (inferred by presence of `essayCount > 0`) render the normal pass/fail hero — the null guard handles this naturally since score will be non-null |
| `src/features/exam/presentation/exam-result/exam-result.stories.tsx` | Add `Result_PendingEssay` story (score: null, status: submitted_pending_essay); add `Result_CompletedAfterEssay` story (score: 8.3, passed: true, status: completed, essayCount: 2) |

**Test first (Storybook interaction):**

Story `Result_PendingEssay`:
- `expect(canvas.getByText('CHƯA CÓ ĐIỂM TỔNG')).toBeInTheDocument()`
- `expect(canvas.getByText('Điểm tự luận đang chờ giáo viên chấm')).toBeInTheDocument()`
- `expect(canvas.getByText('Chờ chấm')).toBeInTheDocument()` (essay stat card)

Story `Result_CompletedAfterEssay`:
- `expect(canvas.queryByText('CHƯA CÓ ĐIỂM TỔNG')).not.toBeInTheDocument()`
- `expect(canvas.getByText('8.3')).toBeInTheDocument()`
- `expect(canvas.getByText('Đã hoàn thành')).toBeInTheDocument()` (pass badge)

**Done when:** both new stories pass; existing `Result_Completed` story still green.

---

### Phase 7 — Storybook stories consolidation check

All 5 new stories created across Phases 3–6. This phase is a verification pass only.

**Stories to confirm exist and have passing interactions:**

| Story | File | Key assertion |
|---|---|---|
| `ExamList_PendingEssayCard` | `exam-list.stories.tsx` | Filter chip + card CTA |
| `Briefing_MixedIndicator` | `exam-briefing.stories.tsx` | Mixed badge + grading note |
| `Taking_EssayQuestion` | `exam-taking.stories.tsx` | Textarea + char count updates |
| `Result_PendingEssay` | `exam-result.stories.tsx` | Partial-score hero + warning banner |
| `Result_CompletedAfterEssay` | `exam-result.stories.tsx` | Normal score hero, no pending banner |

Run: `bun build-storybook` — must complete without type errors.

---

### Phase 8 — E2E gate (regression + full suite)

**Goal:** verify E11.1 tests are untouched and all new tests pass.

**Actions:**

1. `bun vitest run` — all unit + integration tests green (target: calculate-score, mapper,
   mock-repo, exam-taking-timer, submit-use-case + new Phase 1/2 additions).
2. `bun build` — TypeScript compile clean (the `score.toFixed(1)` null access from Phase 6,
   the inline `ExamAnswer` removal from Phase 5, and the `SubmitExamInput` union change from
   Phase 1 must all type-check).
3. Storybook interaction tests — no regressions on existing E11.1 stories.
4. Manual smoke: navigate mock exam flow for `exam-005` (mixed) end-to-end:
   list → briefing (mixed badge) → taking (MCQ + essay questions) → submit → result (pending
   banner) → navigate to list.

**Done when:** gate green; story packet status updated to `implemented` in `TEST_MATRIX.md`.

---

## 3. Component + State Sketch

No new shared components needed — all changes are additive branches inside existing
presentation components. State classification per screen:

**ExamList:** `filter: FilterKey` — local UI state. Now includes `'submitted_pending_essay'`
in the union. No server state change (mock repo returns updated `ExamSummary[]`).

**ExamBriefing:** no state change. Conditional render driven by `exam.type` and
`exam.hasEssayQuestions` props — pure derivation, no new `useState`.

**ExamTaking:** add `essayAnswers: Map<string, string>` local state alongside existing
`answers` Map. The two maps are merged in `buildAnswers()` into a discriminated
`ExamAnswer[]`. No TanStack Query involvement (submit is a server action prop).

**ExamResult:** add `ReviewFilter` member `'essay'` to local filter state. Conditional
sections (`pendingBanner`, `essayStatCard`) are derived from `result.status` and
`result.essayCount` — no new state.

---

## 4. Risks, Dependencies, Open Questions

**ADR required (flag to fe-lead before Phase 1 implementation):**
- **ADR-0048** — `ExamResult.score: number | null` and `passed: boolean | null`. This is a
  breaking entity shape change. The mapper and every consumer of `ExamResult` must handle
  null. The submit-use-case test fixture and mock repo must also be updated (buildMockResult
  currently always produces a non-null score — it must remain valid for MCQ-only exams and
  produce null for pending-essay exams).

**Contract gap (mock-first):**
- The lms service's actual DTO for mixed-exam results is not shipped. The `SubmitExamDto`
  answer union shape (`{ type, questionId, selectedOptionId?, text? }`) is invented for the
  mock. When lms ships, the DTO must be reconciled — flag in `integration.md`.

**Phase 1 cascading impact:**
- `submit-exam.use-case.test.ts` references `ExamResult` (via mock repo return) — it may need
  updating when `score` and `passed` become nullable. Read that test before touching the entity
  to avoid unexpected failures (the test likely asserts `result.passed === true` on a value
  that is now typed `boolean | null`).

**Phase 5 navigator prop change:**
- Adding `essayIds?: Set<string>` to `QuestionNavigatorProps` is additive (optional prop) so
  existing stories pass without change. Confirm the stories file passes the right prop shape.

**a11y — essay textarea:**
- `maxLength={2000}` does not announce remaining chars to screen readers. Add
  `aria-describedby` pointing to the char-count paragraph so VoiceOver/NVDA users hear the
  count.

**[OPEN QUESTION] — essay char limit:**
- The i18n key `essayCharCount` shows `/2000` but the spec does not confirm whether 2000 is
  a hard server-enforced limit or a soft UI hint. Confirm with BA before Phase 5 ships — if
  soft, remove `maxLength` and keep as informational only.

**[OPEN QUESTION] — essay answer in submit payload:**
- Does an empty essay answer (user left blank) get sent as `{ type: 'essay', text: '' }` or
  omitted entirely? The warning in Phase 5 alerts but does not block submit. Confirm desired
  behavior with BA to decide whether to gate the submit button or just warn.

**[OPEN QUESTION] — completed-after-essay transition:**
- The `Result_CompletedAfterEssay` story is seeded with a completed result. In the real flow
  the student would land on the pending-essay result, then later re-open to see the final score.
  The page component (`app/.../exams/[id]/result/page.tsx`) would re-fetch via `getResult()`.
  No page-level change is needed for this US, but the re-fetch path must be verified when lms
  ships (currently the mock always returns the same fixture).
