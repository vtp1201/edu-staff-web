# Feature Specification — US-E11.5
## Mixed Exam Result: `submitted_pending_essay` Status + Pending-Essay Flow

**Status:** Draft  
**Lane:** normal  
**Story:** US-E11.5  
**Parent epic:** E11 LMS Exams  
**Depends on:** US-E11.1 (base exam flow — must not regress)  
**Blocks:** none  

**Sources (all read before writing this spec):**
- `requirements.md` — TR-E11.5-001 through TR-E11.5-018; NFR-E11.5-001 through NFR-E11.5-009
- `integration.md` — INT-E11.5-001 through INT-E11.5-005; ViewModel deltas §4.1–4.5; Mock-first plan §5
- `use-cases.md` — UC-E11.5-001 through UC-E11.5-008; AC-E11.5-001 through AC-E11.5-055; BR-001 through BR-020
- `story.md` — original product contract; AC-1 through AC-10 (superseded by use-cases.md AC set)
- `docs/decisions/0048-exam-result-nullable-score-for-pending-essay.md` — ADR 0048
- `docs/product/design-spec.jsonc` — key `exams.result.mixedExamPendingEssay`
- `design_src/edu/exam.jsx` — `AVAILABLE_EXAMS` (exam id=5 lines 42–56); `ExamResultScreen` isPendingEssay branch (lines 620–740)

---

## 1. Summary

US-E11.5 extends the already-implemented E11.1 exam flow to handle **mixed-format exams** that combine MCQ and essay questions. A new `ExamStatus` value — `submitted_pending_essay` — signals that MCQ auto-grading is complete but the essay section is still awaiting teacher review.

Four existing screens receive targeted, additive deltas:
- **ExamList** — pending-essay card variant; "Chờ chấm" filter chip; completed-count includes this status
- **ExamBriefing** — mixed-type badge, type-row update, essay grading note
- **ExamTaking** — essay `<textarea>` question type; char count; empty-essay advisory warning in submit modal; navigator icon
- **ExamResult** — partial-score hero; pending-essay warning banner (ARIA live region); essay stats cell; essay question-review label; grade-book deep-link; clean `completed` transition (E11.1 behavior restored)

All changes are **additive**. Pure MCQ exams retain their exact E11.1 rendering path without modification. The feature is **student-only** (RBAC gate), **mock-first** against the `lms` service (decision 0014), and **reuses all 14 existing `exam.*` i18n keys** without regenerating them.

---

## 2. Scope Boundary

### In scope
- `ExamStatus` domain union extension: add `'submitted_pending_essay'`
- `calculatePartialScore()` pure domain function (MCQ-only scoring)
- `getExamResult` mapper branch for `submitted_pending_essay`
- `ExamSummary`, `ExamQuestion`, `ExamAnswer`, `ExamResult`, `QuestionResult` entity/ViewModel deltas (all additive — see §7)
- ExamList: pending-essay card variant (badge, partial-score banner, CTA, border)
- ExamList: "Chờ chấm" filter chip (`submitted_pending_essay`)
- ExamList: "Đã hoàn thành" StatCard count includes `submitted_pending_essay`
- ExamBriefing: mixed-exam badge, type-row value, essay grading note
- ExamTaking: essay textarea question type, char count, char count color change at 1900, empty-essay submit warning, navigator icon
- ExamResult: pending-essay score hero, warning banner (`role="alert"` + `aria-live="assertive"`), stats row essay cell, question-review essay label, grade-book deep-link
- ExamResult: completed-transition (standard E11.1 view when `status === 'completed'`)
- Three mock fixtures: extend `MOCK_EXAMS` (exam-005), `buildMockMixedQuestions()` factory, `MOCK_PENDING_ESSAY_RESULT`
- Five Storybook stories (see §16)
- `docs/TEST_MATRIX.md` row status: `planned` → `spec-ready` (done by this spec)

### Out of scope
- Teacher-side essay grading UI (separate story)
- `POST /lms/exams/:id/submit` real API call (mock-first only)
- Real-time status polling for essay grading completion
- Email/push notification when essay is graded (`noti` service, separate epic)
- Parent, principal, teacher views of pending-essay result
- File upload for essay answers (text-only)
- Exam creation/editing of essay questions (ExamBank, US-E11.3)
- Any change to ExamResult for pure MCQ exams (E11.1 behavior unchanged)

### External dependencies

| Dependency | Service | Status | Handling |
|---|---|---|---|
| `GET /lms/api/v1/exams` | `lms` | Not shipped (decision 0014) | Mock fixture `MOCK_EXAMS` including exam-005 |
| `GET /lms/api/v1/exams/:id` | `lms` | Not shipped | Mock exam-005 detail with `hasEssayQuestions: true` |
| `GET /lms/api/v1/exams/:id/questions` | `lms` | Not shipped | `buildMockMixedQuestions()` factory |
| `POST /lms/api/v1/exams/:id/submit` | `lms` | Not shipped | Mock submit handler; payload extended with essay answers |
| `GET /lms/api/v1/exams/:id/result` | `lms` | Not shipped | `MOCK_PENDING_ESSAY_RESULT` fixture |
| `/student/grades` route | `features/grades` | Design-ready (US-E13.6) | Deep-link only; no dependency on grades internals |

---

## 3. Design References

### Normative layout
**`docs/product/design-spec.jsonc`** — key path: `exams.result.mixedExamPendingEssay`

This entry (lines 1248–1379) is the normative layout specification. Key values:
- `scoreHero.circle.denominator`: `"/{mcqMax} · 'TN' label"` — `exam.result.mcqLabel` i18n key
- `scoreHero.badge.style`: `"white text on rgba(255,255,255,0.20)"` — hero gradient background
- `pendingEssayBanner.background`: `var(--edu-warning-light)`, `border`: `1px solid var(--edu-warning) + '40'`, borderRadius: 12, padding: `14px 18px`
- `pendingEssayBanner.icon`: name `"clock"`, size 18, color `var(--edu-warning)`, boxSize 38, boxBg `var(--edu-warning)+'22'`, boxRadius 10
- `pendingEssayBanner.title`: fontSize 14, fontWeight 800, color `var(--edu-warning)`, key `exam.result.pendingEssayTitle`
- `pendingEssayBanner.body`: fontSize 12.5, color `var(--edu-text-secondary)`, lineHeight 1.55, key `exam.result.pendingEssayBody`
- `statsRow.essayCount.color`: `var(--edu-warning)`, icon: `fileText`
- `examListCard.statusBadge.bg`: `var(--edu-warning-light)`, key `exam.status.submittedPendingEssay`
- `examListCard.cta.text`: `exam.cta.viewPendingResult`
- `briefingMixedIndicator.badge.color`: `var(--edu-purple)`
- `takingEssayQuestion.textarea.maxLength`: 2000
- `filterChip.id`: `"submitted_pending_essay"`, key `exam.filter.pendingEssay`

### Reference mockup
**`design_src/edu/exam.jsx`**
- `AVAILABLE_EXAMS` array: exam id=5 (lines 42–56) — `submitted_pending_essay` mock data shape
- `ExamResultScreen` `isPendingEssay` branch (lines 620–740) — score hero, pending-essay banner, grade-book deep-link rendering

---

## 4. Actors & RBAC

| Actor | Route gate | Capabilities in this story |
|---|---|---|
| `student` | `(app)/student/exams/**` — established in E11.1 | View pending-essay card; use "Chờ chấm" filter; view mixed briefing note; answer essay textarea; view partial MCQ score on result; navigate grade-book deep-link |
| `teacher` | n/a | Out of scope — essay grading is a future teacher-side story |
| `principal` | n/a | Out of scope |
| `parent` | n/a | Out of scope |
| Screen reader / AT | n/a | Receives `role="alert"` + `aria-live="assertive"` announcement on pending-essay banner mount; navigates essay textarea via label; reads char count via `aria-describedby` |

**No additional RBAC work required.** The `student` role guard at the route layout level is already established in E11.1.

---

## 5. Domain Changes Required

> All changes are additive. Existing E11.1 types must not have their non-null fields removed; only new nullable fields are added and `ExamStatus` is extended with a new string literal.

### 5.1 `ExamStatus` union extension
**File:** `src/features/exam/domain/entities/exam.entity.ts` (or wherever `ExamStatus` is declared)

The system SHALL add `'submitted_pending_essay'` to the `ExamStatus` string union:
```ts
type ExamStatus = 'available' | 'completed' | 'expired' | 'submitted_pending_essay'
```
All switch/discriminated-union exhaustiveness checks on `ExamStatus` SHALL be updated so `tsc --noEmit` catches unhandled branches at build time.

### 5.2 `ExamSummary` entity — additive fields
New fields added to the `ExamSummary` entity:

| Field | Type | Default when absent | Notes |
|---|---|---|---|
| `hasEssayQuestions` | `boolean` | `false` | Drives ExamBriefing mixed indicator |
| `essayCount` | `number` | `0` | Number of essay questions |
| `essayMax` | `number` | `0` | Max points attributable to essay section |
| `mcqScore` | `number \| null` | `null` | Auto-graded MCQ score; null for non-pending |
| `mcqMax` | `number` | `0` | Max points attributable to MCQ section |
| `questionTypes` | `('mcq' \| 'essay')[]` | `['mcq']` | Distinct types present; used by briefing "Loại bài" row |

### 5.3 `ExamQuestion` entity — additive field
New field on `ExamQuestion`:

| Field | Type | Default when absent | Notes |
|---|---|---|---|
| `type` | `'mcq' \| 'essay'` | `'mcq'` | Discriminant; absent in E11.1 — default `'mcq'` for backward compatibility |

When `type === 'essay'`: `options` will be `[]`. The mapper must normalize `options: undefined` → `options: []`.

### 5.4 `ExamResult` entity — additive fields (ADR-0048)
Per **ADR-0048** (`docs/decisions/0048-exam-result-nullable-score-for-pending-essay.md`):

**Breaking nullable relaxation** on existing non-nullable fields:
- `score: number` → **`score: number | null`** — null means final score not yet available
- `passed: boolean` → **`passed: boolean | null`** — null means pass/fail not determinable

New fields added:

| Field | Type | Notes |
|---|---|---|
| `status` | `'completed' \| 'submitted_pending_essay'` | New field; existing E11.1 results implicitly have `'completed'` |
| `mcqScore` | `number \| null` | Auto-graded MCQ score |
| `mcqMax` | `number \| null` | Max MCQ points |
| `essayMax` | `number \| null` | Max essay points; null for pure MCQ |
| `essayCount` | `number` | Essay question count; 0 for pure MCQ |

**`isResultFinal(result: ExamResult): boolean`** — canonical guard:
```ts
function isResultFinal(result: ExamResult): boolean {
  return result.status === 'completed'
}
```
The presentation SHALL render `score`, `passed`, and pass/fail badge **only** when `isResultFinal(result) === true`. ADR-0048 is the authoritative decision record for this guard.

> [RISK] The nullable relaxation of `score` and `passed` is a breaking change to the existing E11.1 entity interface. All E11.1 components that read these fields without a null guard will fail TypeScript compilation after this change. The `fe-tech-lead-reviewer` MUST audit all call sites before merging. See OQ-6 in §14.

### 5.5 `QuestionResult` entity — additive fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `type` | `'mcq' \| 'essay'` | `'mcq'` | Discriminant; absent in E11.1 — default |
| `textAnswer` | `string \| null` | `null` | Student's submitted essay text |
| `correctOptionId` | `string \| null` | existing | Relax to allow null for essay |
| `isCorrect` | `boolean \| null` | existing | Relax to allow null for essay |

### 5.6 `calculatePartialScore()` pure domain function
**Signature:** `calculatePartialScore(questions: ExamQuestion[], answers: Record<string, ExamAnswer>): { mcqCorrect: number; mcqTotal: number; mcqScore: number }`

- Operates exclusively on questions where `type === 'mcq'` (skips `type === 'essay'`)
- Returns `{ mcqCorrect: 0, mcqTotal: 0, mcqScore: 0 }` when `questions` is empty — no throw
- The existing `calculateScore()` from E11.1 remains **unchanged**

### 5.7 `ExamAnswer` ViewModel — discriminated union
`ExamAnswer` in `exam-taking.i-vm.ts` becomes a discriminated union:

```ts
type ExamAnswer =
  | { questionId: string; type: 'mcq'; selectedOptionId: string | null }
  | { questionId: string; type: 'essay'; textAnswer: string }
```

### 5.8 `ExamResultVm` interface — additive field
New prop on `ExamResultVm`:

| Field | Type | Notes |
|---|---|---|
| `onNavigateToGrades` | `() => void` | Grade-book deep-link CTA; navigates to `/student/grades` |

---

## 6. Integration Contract

> MOCK-FIRST — `lms` service not shipped (decision 0014). All five endpoints return mock data when `NEXT_PUBLIC_USE_MOCK=true`. No real HTTP calls to `lms` are made by this story.

All endpoints are inherited from E11.1 — extended, not replaced. No new endpoint constants needed (`EXAM_EP` in `bootstrap/endpoint/exam.endpoint.ts` is sufficient).

### INT-E11.5-001 — List Exams (extended)
**MOCK-FIRST — lms service not shipped (decision 0014)**

| Attribute | Value |
|---|---|
| Method + Path | `GET /lms/api/v1/exams` |
| Screen | ExamList (`/student/exams`) |
| Auth | Bearer (httpOnly cookie) — student role |
| Pagination | Cursor-based (`nextCursor`, `hasMore` in `meta.pagination`) — `useInfiniteQuery`; no change from E11.1 |

**Response payload delta** (fields added to `ExamSummaryDto` + `ExamSummary` entity — all fields from §5.2):
`hasEssayQuestions`, `essayCount`, `essayMax`, `mcqScore`, `mcqMax`, `questionTypes`; `status` now includes `'submitted_pending_essay'`.

**Filtering:** Client-side only — no server-side filter by `submitted_pending_essay`. The "Chờ chấm" chip filters the already-loaded list in memory.

**Error → UI mapping:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_NOT_FOUND` / 404 | `not-found` | Toast error; list stays visible | No |
| `UNAUTHORIZED` / 401 | — | Redirect to login (interceptor) | No |
| `FORBIDDEN` / 403 | — | Role error page | No |
| Network / 5xx | `network-error` | Inline error banner + retry button | Yes |
| `unknown` | `unknown` | Generic error toast | No |

---

### INT-E11.5-002 — Get Exam Detail / Briefing (extended)
**MOCK-FIRST — lms service not shipped (decision 0014)**

| Attribute | Value |
|---|---|
| Method + Path | `GET /lms/api/v1/exams/:id` |
| Screen | ExamBriefing (`/student/exams/:id/briefing`) |
| Auth | Bearer — student role |
| Pagination | None |

**Response payload delta:** Same five fields as INT-E11.5-001 plus `questionTypes: ('mcq' | 'essay')[]`. `hasEssayQuestions: true` drives the mixed indicator UI. This endpoint is reached before submission — `submitted_pending_essay` status is not applicable here.

If `questionTypes` is absent, the briefing SHALL derive the mixed indicator from `hasEssayQuestions: boolean` alone (sufficient for the binary MCQ vs mixed decision). See OQ-4.

**Error → UI mapping:** Same as INT-E11.5-001.

---

### INT-E11.5-003 — Get Exam Questions (extended)
**MOCK-FIRST — lms service not shipped (decision 0014)**

| Attribute | Value |
|---|---|
| Method + Path | `GET /lms/api/v1/exams/:id/questions` |
| Screen | ExamTaking (`/student/exams/:id/taking`) |
| Auth | Bearer — student role |
| Pagination | None — full question list in one response (E11.1 pattern) |

**Response payload delta:** `type: 'mcq' | 'essay'` added to `ExamQuestionDto` + `ExamQuestion` entity. When `type === 'essay'`: `options` array is absent or empty — mapper normalizes `undefined` → `[]`.

Safe default: treat absent `type` as `'mcq'` for backward compatibility.

**Error → UI mapping:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_NOT_FOUND` / 404 | `not-found` | Navigate back to list; toast error | No |
| `EXAM_AFTER_DEADLINE` / 400 or 403 | `after-deadline` | Banner "Bài thi đã hết hạn"; CTA back to list | No |
| `EXAM_MAX_ATTEMPTS` / 403 | `max-attempts-exceeded` | Banner "Đã nộp tối đa số lần"; CTA to result | No |
| Network / 5xx | `network-error` | Inline error with retry | Yes |

---

### INT-E11.5-004 — Submit Exam Answers (extended)
**MOCK-FIRST — lms service not shipped (decision 0014)**

| Attribute | Value |
|---|---|
| Method + Path | `POST /lms/api/v1/exams/:id/submit` |
| Screen | ExamTaking — submit action |
| Auth | Bearer — student role |

**Request body (camelCase) — extended discriminated union:**

```json
{
  "startedAt": 1719000000000,
  "answers": [
    {
      "questionId": "q-1",
      "type": "mcq",
      "selectedOption": 0
    },
    {
      "questionId": "q-2",
      "type": "mcq",
      "selectedOption": null
    },
    {
      "questionId": "q-21",
      "type": "essay",
      "textAnswer": "Đây là câu trả lời tự luận của học sinh."
    },
    {
      "questionId": "q-22",
      "type": "essay",
      "textAnswer": ""
    }
  ]
}
```

| Field | Type | Constraint |
|---|---|---|
| `answers[].questionId` | `string` | Required for all types |
| `answers[].type` | `'mcq' \| 'essay'` | Discriminant; required |
| `answers[].selectedOption` | `number \| null` | MCQ only: 0=A, 1=B, 2=C, 3=D; null = skipped |
| `answers[].textAnswer` | `string` | Essay only; max 2000 chars; empty string is valid |
| `startedAt` | `number` | Unix ms; required; unchanged from E11.1 |

> [OPEN QUESTION OQ-1] The existing E11.1 `SubmitExamDto` uses `selectedOptionId: string | null` (e.g. `"A"`, `"B"`). The request contract above uses `selectedOption: number` (0-based integer). These are different wire shapes. For mock purposes either shape works, but the DTO and mapper must be consistent. Confirm with lms team before real integration. See §14.

**`textAnswer` constraints:**
- Max 2000 characters (client-side `maxlength` enforcement; backend should also validate)
- Empty string `""` is valid — student may intentionally submit blank
- `textAnswer.trim().length > 0` = answered for progress counter; raw value (including whitespace) is sent to backend

**Response payload (after envelope unwrap):**

| Field | Type | Meaning |
|---|---|---|
| `examId` | `string` | Confirms which exam was submitted |
| `status` | `string` | `'submitted_pending_essay'` for mixed exams; `'completed'` for pure MCQ |

Client navigates to `GET /lms/api/v1/exams/:id/result` immediately after successful submit.

**`textAnswer` is confidential student academic data.** It MUST NOT be logged client-side, MUST NOT be stored in browser localStorage, transmitted only over HTTPS.

**Error → UI mapping:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_AFTER_DEADLINE` / 400 | `after-deadline` | Modal: "Đã hết thời gian nộp bài"; close → list | No |
| `EXAM_ALREADY_SUBMITTED` / 409 | `already-submitted` | Modal: "Bạn đã nộp bài này rồi"; CTA to result | No |
| `EXAM_MAX_ATTEMPTS` / 403 | `max-attempts-exceeded` | Modal: "Đã nộp tối đa số lần" | No |
| `EXAM_ESSAY_TOO_LONG` / 422 | `essay-too-long` (new variant) | Inline field error on essay textarea; student must shorten | No |
| `VALIDATION_ERROR` / 422 with `fields[]` | `unknown` | Map `fields[].field` to per-question inline warnings | No |
| Network / 5xx | `network-error` | Toast error; exam state retained in memory for retry | Yes |
| `UNAUTHORIZED` / 401 | — | Redirect to login | No |

> [OPEN QUESTION OQ-2] `EXAM_ESSAY_TOO_LONG` error code is assumed. It does not exist in any current lms `ERROR_CODES.md`. The failure union needs `{ type: 'essay-too-long' }`. Confirm with lms team when service ships. See §14.

---

### INT-E11.5-005 — Get Exam Result (extended)
**MOCK-FIRST — lms service not shipped (decision 0014)**

| Attribute | Value |
|---|---|
| Method + Path | `GET /lms/api/v1/exams/:id/result` |
| Screen | ExamResult (`/student/exams/:id/result`) |
| Auth | Bearer — student role |
| Pagination | None |

**Response payload delta** (fields added to `ExamResultDto` + `ExamResult` entity):

| Field | Type | Present when |
|---|---|---|
| `status` | `'completed' \| 'submitted_pending_essay'` | Always |
| `mcqScore` | `number \| null` | Both statuses on mixed exams |
| `mcqMax` | `number` | Mixed exams |
| `essayMax` | `number \| null` | Mixed exams; null for pure MCQ |
| `essayCount` | `number` | Mixed exams |

Per **ADR-0048**: `score` and `passed` may be null for `submitted_pending_essay`. The mapper MUST NOT populate `ExamResult.passed` or `ExamResult.score` from the total-score field in the `submitted_pending_essay` branch.

**`questionResults[]` delta — essay variant:**

| Field | Type | Notes |
|---|---|---|
| `questionResults[].type` | `'mcq' \| 'essay'` | Discriminant; default `'mcq'` when absent |
| `questionResults[].textAnswer` | `string \| null` | Student's submitted essay text; shown read-only |
| `questionResults[].correctOptionId` | `string \| null` | null for essay; mapper must tolerate absence |
| `questionResults[].isCorrect` | `boolean \| null` | null for essay in pending state |

**Important:** `submitted_pending_essay` result is a **success state** (partial result variant), NOT an empty state or error. When `result.status === 'submitted_pending_essay'`, render the pending-essay variant.

**Error → UI mapping:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_NOT_FOUND` / 404 | `not-found` | Inline error: "Không tìm thấy kết quả"; CTA back to list | No |
| `EXAM_RESULT_NOT_READY` — transient 404 or custom | `result-not-ready` (new variant) | Inline: result not yet available; retry / "come back later" | Yes |
| `UNAUTHORIZED` / 401 | — | Redirect to login | No |
| `FORBIDDEN` / 403 | — | Error page — student owns this result only | No |
| Network / 5xx | `network-error` | Inline error with retry button | Yes |
| `unknown` | `unknown` | Generic toast error | No |

> [OPEN QUESTION OQ-3] `EXAM_RESULT_NOT_READY` error code: transient 404 or dedicated code TBD. The failure union may need `{ type: 'result-not-ready' }` with retry behavior. Confirm with lms team. See §14.

---

## 7. ViewModel Deltas

All deltas are additive — existing E11.1 fields remain unchanged.

### 7.1 `ExamSummary` entity (shared by ExamListVm and ExamBriefingVm)
See §5.2 — fields: `hasEssayQuestions`, `essayCount`, `essayMax`, `mcqScore`, `mcqMax`, `questionTypes`. `ExamStatus` extended with `'submitted_pending_essay'`.

### 7.2 `ExamQuestion` entity (ExamTakingVm)
See §5.3 — field: `type: 'mcq' | 'essay'`; safe default `'mcq'`. `options: []` for essay questions.

### 7.3 `ExamAnswer` ViewModel (ExamTakingVm.onSubmit)
See §5.7 — becomes discriminated union: MCQ variant with `selectedOptionId` | Essay variant with `textAnswer`.

### 7.4 `ExamResult` entity (ExamResultVm)
See §5.4 — `score` and `passed` relax to nullable (ADR-0048); new fields `status`, `mcqScore`, `mcqMax`, `essayMax`, `essayCount`.

### 7.5 `QuestionResult` entity (within ExamResult)
See §5.5 — fields: `type`, `textAnswer`, nullable relaxation on `correctOptionId` and `isCorrect`.

### 7.6 `ExamResultVm` interface
See §5.8 — new prop: `onNavigateToGrades: () => void`.

---

## 8. Mock-First Plan

> MOCK-FIRST — lms service not shipped (decision 0014). All data is returned by `MockExamRepository` when `NEXT_PUBLIC_USE_MOCK=true`. No new env var required.

**File:** `src/features/exam/infrastructure/repositories/mocks/exam.fixtures.ts`

### Fixture 1 — Extend `MOCK_EXAMS` (add exam-005)

Add one entry:
```
id: "exam-005"
title: "Kiểm tra Ngữ văn - Giữa kỳ"
subjectId: "sub-005"
subjectName: "Ngữ văn"
subjectColor: "purple"
teacherName: "Hoàng Thị Em"
description: "Bài kiểm tra kết hợp trắc nghiệm và tự luận."
durationMinutes: 60
totalQuestions: 27   (24 MCQ + 3 essay)
deadline: "2026-06-15T23:59:00Z"
status: "submitted_pending_essay"
type: "multiple-choice"          // legacy field; keep for backward compat
hasEssayQuestions: true
essayCount: 3
essayMax: 3.0
mcqScore: 6.0
mcqMax: 7.0
questionTypes: ["mcq", "essay"]
```

### Fixture 2 — `buildMockMixedQuestions(mcqCount, essayCount)` factory

Returns an array of `ExamQuestion` where:
- First `mcqCount` items: `type: 'mcq'` with standard OPTIONS_POOL
- Last `essayCount` items: `type: 'essay'`, `options: []`

This factory must remain backward-compatible — calling `buildMockQuestions(30)` (or existing equivalent) must still produce MCQ-only questions so E11.1 tests are unaffected.

### Fixture 3 — `MOCK_PENDING_ESSAY_RESULT`

Named constant of type `ExamResult` (post entity delta):
```
examId: "exam-005"
examTitle: "Kiểm tra Ngữ văn - Giữa kỳ"
status: "submitted_pending_essay"
score: null                    // total not yet known (ADR-0048)
totalQuestions: 27
correctCount: 18               // MCQ only
incorrectCount: 6              // MCQ only
skippedCount: 0                // MCQ only
timeTakenSeconds: 2700
rank: null
percentile: null
passed: null                   // not determined yet (ADR-0048)
mcqScore: 6.0
mcqMax: 7.0
essayMax: 3.0
essayCount: 3
questionResults: [
  // 24 MCQ items (type: 'mcq', correctOptionId, isCorrect, textAnswer: null)
  // 3 essay items (type: 'essay', correctOptionId: null, isCorrect: null,
  //                textAnswer: "Student answer text or empty string")
]
```

### NEXT_PUBLIC_USE_MOCK guard
The mock repository handles `submitted_pending_essay` in `getResult()` by returning `MOCK_PENDING_ESSAY_RESULT` when `examId === 'exam-005'`.

---

## 9. Acceptance Criteria

> These 55 ACs are copied verbatim from `use-cases.md` §4 and supersede story.md AC-1 through AC-10.

---

### ExamList — Pending-Essay Card (UC-E11.5-001, UC-E11.5-002)

**AC-E11.5-001 — Pending-essay card: warning status badge**
Satisfies: TR-E11.5-004, story.md AC-1
Given the student is on ExamList and the response includes exam-005 with `status: 'submitted_pending_essay'`,
When the card for exam-005 renders,
Then the card displays a status badge whose label value resolves from the `exam.status.submittedPendingEssay` i18n key, the badge text color is `text-edu-warning-foreground` (not white), and the badge background is `bg-edu-warning/15`.

**AC-E11.5-002 — Pending-essay card: no pass/fail badge**
Satisfies: TR-E11.5-004, story.md AC-1
Given the student is on ExamList and exam-005 has `status: 'submitted_pending_essay'`,
When the card for exam-005 renders,
Then no pass/fail badge (neither "Đạt" nor "Không đạt" nor any pass/fail indicator) is present on that card.

**AC-E11.5-003 — Pending-essay card: partial-score inline banner with MCQ score**
Satisfies: TR-E11.5-004, NFR-E11.5-003
Given exam-005 has `mcqScore: 6.0` and `mcqMax: 7.0`,
When the pending-essay card renders,
Then a partial-score inline banner appears below the exam description; it shows a clock icon in `text-edu-warning` color, the MCQ score fraction "6.0 / 7.0", and its background is `bg-edu-warning-light`.

**AC-E11.5-004 — Pending-essay card: null mcqScore fallback**
Satisfies: TR-E11.5-004
Given exam-005 has `mcqScore: null`,
When the pending-essay card renders,
Then the partial-score inline banner shows "--/--" (or equivalent null fallback) without a JavaScript error or blank card.

**AC-E11.5-005 — Pending-essay card: CTA button label**
Satisfies: TR-E11.5-004, story.md AC-1
Given the pending-essay exam card is rendered,
When the student views the CTA button,
Then the button label resolves from the `exam.cta.viewPendingResult` i18n key; the button background is `bg-edu-warning-light` and text/border color is `text-edu-warning` / `border-edu-warning`.

**AC-E11.5-006 — Pending-essay card: CTA navigation**
Satisfies: TR-E11.5-004
Given the pending-essay exam card is rendered with exam-005,
When the student clicks the "Xem kết quả tạm thời" CTA button,
Then the student is navigated to the ExamResult screen for exam-005 (at `/student/exams/exam-005/result`).

**AC-E11.5-007 — Pending-essay card: card border color**
Satisfies: TR-E11.5-004, NFR-E11.5-009
Given the pending-essay exam card is rendered,
When the card is inspected,
Then the card border uses `border-edu-warning/40` (not the default `border-border`) and no raw hex color is used.

**AC-E11.5-008 — Completed count includes submitted_pending_essay**
Satisfies: TR-E11.5-005
Given the exam list contains 2 exams with `status: 'completed'` and 1 exam with `status: 'submitted_pending_essay'`,
When the "Đã hoàn thành" StatCard is rendered,
Then its value is 3 (not 2).

**AC-E11.5-009 — "Chờ chấm" filter chip: label**
Satisfies: TR-E11.5-006
Given the student is on ExamList,
When the filter chip row renders,
Then a filter chip is present whose label resolves from the `exam.filter.pendingEssay` i18n key.

**AC-E11.5-010 — "Chờ chấm" filter chip: filters to pending-essay only**
Satisfies: TR-E11.5-006, story.md AC-1
Given the exam list contains exams of various statuses,
When the student activates the "Chờ chấm" filter chip,
Then only exam cards with `status === 'submitted_pending_essay'` are visible; all other status cards are hidden.

**AC-E11.5-011 — "Chờ chấm" filter chip: empty state when no pending exams**
Satisfies: TR-E11.5-018
Given the "Chờ chấm" filter chip is active and no exams have `status === 'submitted_pending_essay'`,
When the card list area renders,
Then the existing `exam.empty.*` empty state component is shown; no pending-essay cards are rendered and no blank/broken layout is present.

**AC-E11.5-012 — ExamList loading: skeleton within 320ms**
Satisfies: TR-E11.5-017, NFR-E11.5-005
Given the student navigates to ExamList and data fetch is pending,
When 320ms have elapsed since navigation,
Then skeleton card placeholders are visible in the card list area.

**AC-E11.5-013 — ExamList loading: skeleton replaced without layout shift**
Satisfies: TR-E11.5-017, NFR-E11.5-005
Given skeleton cards are visible on ExamList,
When the data response arrives and real cards replace the skeleton,
Then no cumulative layout shift (CLS) occurs in the card list area.

**AC-E11.5-014 — ExamList error: network error with retry**
Satisfies: TR-E11.5-017, INT-E11.5-001
Given the `GET /lms/api/v1/exams` request fails with a 5xx error where `retryable: true`,
When the error response is received,
Then an inline error banner with a retry button appears in the card list area; the student can click retry to re-fetch.

---

### ExamBriefing — Mixed Indicator (UC-E11.5-003)

**AC-E11.5-015 — Briefing: mixed badge shown for hasEssayQuestions true**
Satisfies: TR-E11.5-007, story.md AC-2
Given the student navigates to ExamBriefing for exam-005 where `hasEssayQuestions === true`,
When the briefing screen renders,
Then a badge is shown adjacent to the exam header whose label resolves from `exam.briefing.mixedType` i18n key; the badge color is `text-edu-purple` and background is `bg-edu-purple/15`.

**AC-E11.5-016 — Briefing: type row shows mixed value**
Satisfies: TR-E11.5-007
Given `hasEssayQuestions === true` on the exam,
When the "Loại bài" (exam type) metadata row renders,
Then its value resolves from `exam.briefing.mixedTypeValue` i18n key ("Trắc nghiệm + Tự luận") instead of the MCQ-only value.

**AC-E11.5-017 — Briefing: essay grading note shown outside rules list**
Satisfies: TR-E11.5-007, story.md AC-2
Given `hasEssayQuestions === true` on the exam,
When the briefing screen renders,
Then a supplementary note whose text resolves from `exam.briefing.essayGradingNote` i18n key is visible below the rules list; it is NOT inside the numbered rules list; its text color is `text-muted-foreground` at 12px (caption size).

**AC-E11.5-018 — Briefing: no mixed elements for pure MCQ exam**
Satisfies: TR-E11.5-007
Given the student navigates to ExamBriefing for a pure MCQ exam where `hasEssayQuestions === false` (or the field is absent),
When the briefing screen renders,
Then none of the three mixed elements (mixed badge, mixed type row value, essay grading note) are present; the briefing is identical to E11.1.

**AC-E11.5-019 — Briefing: hasEssayQuestions absent treated as false**
Satisfies: TR-E11.5-007
Given the exam entity does not carry the `hasEssayQuestions` field,
When the briefing screen renders,
Then the screen treats the value as `false`; no mixed indicator, no note, no type-row update.

---

### ExamTaking — Essay Textarea (UC-E11.5-004)

**AC-E11.5-020 — Taking: essay question renders textarea not radio options**
Satisfies: TR-E11.5-008, story.md AC-3
Given ExamTaking is active and the current question has `type === 'essay'`,
When the question component renders,
Then a `<textarea>` input is shown; no A/B/C/D option buttons or radio inputs are present.

**AC-E11.5-021 — Taking: essay textarea placeholder**
Satisfies: TR-E11.5-008, NFR-E11.5-007
Given the essay question's textarea is empty,
When the textarea renders,
Then the placeholder text resolves from the `exam.taking.essayPlaceholder` i18n key; no hardcoded Vietnamese string is in the component .tsx.

**AC-E11.5-022 — Taking: character count starts at 0**
Satisfies: TR-E11.5-008
Given the essay question is first rendered with no answer state,
When the character count element renders,
Then it displays "0/2000 ký tự" (from `exam.taking.essayCharCount` with `count: 0`).

**AC-E11.5-023 — Taking: character count updates on keystroke**
Satisfies: TR-E11.5-008
Given the student is typing in the essay textarea,
When the student types 50 characters,
Then the character count element displays "50/2000 ký tự" (or equivalent via `exam.taking.essayCharCount` key with `count: 50`).

**AC-E11.5-024 — Taking: 2000-char limit enforced**
Satisfies: TR-E11.5-008
Given the student has typed 2000 characters in the essay textarea,
When the student attempts to type an additional character,
Then the character is not accepted; the character count remains at 2000/2000.

**AC-E11.5-025 — Taking: character count color change at 1900**
Satisfies: TR-E11.5-008, NFR-E11.5-009
Given the student has typed fewer than 1900 characters,
When the character count element renders,
Then its color is `text-muted-foreground`.
Given the student types to reach 1900 characters,
When the character count element updates,
Then its color changes to `text-edu-warning`.

**AC-E11.5-026 — Taking: essay textarea programmatic label**
Satisfies: NFR-E11.5-002, WCAG 2.1 AA SC 1.3.1, 3.3.2
Given an essay question is rendered,
When inspecting the textarea element,
Then the `<textarea>` has an associated `<label>` element linked via `htmlFor` / `id` (or an `aria-label`) that identifies the question; the label is visible or accessible to assistive technology.

**AC-E11.5-027 — Taking: char count aria-describedby wired to textarea**
Satisfies: NFR-E11.5-002, WCAG 2.1 AA SC 1.3.1
Given an essay question is rendered,
When inspecting the char count element,
Then the char count element has an `id` and the `<textarea>` has `aria-describedby` set to that same `id`, linking the two programmatically.

**AC-E11.5-028 — Taking: essay question answered when non-whitespace present**
Satisfies: TR-E11.5-008
Given the student types only spaces or tabs (whitespace-only) in an essay textarea,
When the progress counter evaluates the essay question,
Then the question is NOT counted as answered (trim result is empty).
Given the student types at least one non-whitespace character,
When the progress counter evaluates the essay question,
Then the question IS counted as answered.

**AC-E11.5-029 — Taking: navigator shows fileText icon for essay questions**
Satisfies: TR-E11.5-010, story.md AC-4, NFR-E11.5-004
Given the question navigator grid is rendered for a mixed exam,
When an essay question cell is inspected,
Then it contains a `fileText` Lucide icon (10px); MCQ question cells show question numerals (as per E11.1) without the fileText icon.

**AC-E11.5-030 — Taking: essay navigator button has accessible aria-label**
Satisfies: NFR-E11.5-004, WCAG 2.1 AA SC 4.1.2
Given an essay question navigator button is rendered,
When the button's accessible name is evaluated,
Then it includes the question number and indicates that the question is an essay type (e.g. "Câu 25 - tự luận" or equivalent from the i18n key); the button is not icon-only without an accessible name.

---

### ExamTaking — Submit with Empty Essay Warning (UC-E11.5-005)

**AC-E11.5-031 — Taking: empty-essay warning in submit modal**
Satisfies: TR-E11.5-009, story.md AC-3
Given the student is in ExamTaking for a mixed exam and at least one essay question has an empty `textAnswer`,
When the student opens the submit confirmation modal,
Then an inline warning is visible inside the modal; its text resolves from `exam.taking.essayEmptyWarning` i18n key; its text color is `text-edu-warning` and background is `bg-edu-warning-light`.

**AC-E11.5-032 — Taking: empty-essay warning does not block submission**
Satisfies: TR-E11.5-009
Given the empty-essay warning is shown in the submit modal,
When the student clicks the confirm button,
Then the submission proceeds normally; no second block or second confirmation is required.

**AC-E11.5-033 — Taking: no empty-essay warning when all essays answered**
Satisfies: TR-E11.5-009
Given all essay questions have a non-empty `textAnswer` (trim().length > 0),
When the student opens the submit confirmation modal,
Then the empty-essay warning is NOT shown in the modal.

**AC-E11.5-034 — Taking: submit loading state**
Satisfies: TR-E11.5-017
Given the student confirms submission,
When the submit request is in flight,
Then the full-screen submit overlay / spinner (existing from E11.1) is visible; the submit button is disabled or replaced by the overlay.

**AC-E11.5-035 — Taking: submit network error retains exam state**
Satisfies: INT-E11.5-004
Given the student confirms submission and the `POST .../submit` request fails with a network error,
When the error is received,
Then a toast error is shown; the exam taking screen remains open; previously typed essay text is preserved in state (student can retry without re-typing).

---

### ExamResult — Pending-Essay Variant (UC-E11.5-006)

**AC-E11.5-036 — Result (pending): score hero shows MCQ partial score only**
Satisfies: TR-E11.5-011, story.md AC-5
Given `result.status === 'submitted_pending_essay'` and `isResultFinal(result) === false`,
When the score hero renders,
Then the score circle displays `mcqScore` (e.g. "6.0") with `/{mcqMax}` (e.g. "/7.0") and a label from `exam.result.mcqLabel` i18n key ("TN"); the total score out of 10 is NOT displayed; the hero gradient color is `--edu-warning`.

**AC-E11.5-037 — Result (pending): no pass/fail badge**
Satisfies: TR-E11.5-011, story.md AC-5
Given `result.status === 'submitted_pending_essay'`,
When the result screen renders,
Then no pass/fail badge (neither "Đạt" nor "Không đạt") is present.

**AC-E11.5-038 — Result (pending): partial-result badge shown**
Satisfies: TR-E11.5-011, NFR-E11.5-003
Given `result.status === 'submitted_pending_essay'`,
When the result screen renders,
Then a badge is shown whose text resolves from `exam.result.partialResultBadge` i18n key ("CHƯA CÓ ĐIỂM TỔNG"); its text color is `text-edu-warning-foreground` (not white) and background is `bg-edu-warning-light`.

**AC-E11.5-039 — Result (pending): null mcqScore shows dashes**
Satisfies: TR-E11.5-011
Given `result.mcqScore === null`,
When the score hero renders,
Then the score circle shows "--" without a JavaScript error or visual breakage.

**AC-E11.5-040 — Result (pending): warning banner rendered**
Satisfies: TR-E11.5-012, story.md AC-6
Given `result.status === 'submitted_pending_essay'`,
When the result screen renders,
Then a warning banner is present between the score hero and the grade-book button; its background is `bg-edu-warning-light`, border is `border-edu-warning/40` (1px solid); a clock icon (Lucide `clock`, 18px) is shown on the left with `text-edu-warning` in a 38x38 icon box with `bg-edu-warning/22` background and radius 10px.

**AC-E11.5-041 — Result (pending): banner title and body from i18n keys**
Satisfies: TR-E11.5-012, NFR-E11.5-007
Given the pending-essay warning banner is rendered,
When the banner text content is evaluated,
Then the title text resolves from `exam.result.pendingEssayTitle` i18n key and the body text resolves from `exam.result.pendingEssayBody` i18n key with `{mcqScore}`, `{mcqMax}`, `{essayMax}` interpolated from the result entity; no hardcoded Vietnamese string is in the .tsx file.

**AC-E11.5-042 — Result (pending): banner has role=alert and aria-live=assertive**
Satisfies: TR-E11.5-012, NFR-E11.5-001, story.md AC-6/AC-9, WCAG 2.1 AA SC 4.1.3
Given `result.status === 'submitted_pending_essay'`,
When the pending-essay banner mounts,
Then the banner element has `role="alert"` and `aria-live="assertive"` attributes; a screen reader announces the banner content without requiring the user to move focus to it.

**AC-E11.5-043 — Result (pending): stats row has essay count cell**
Satisfies: TR-E11.5-013
Given `result.status === 'submitted_pending_essay'` and `essayCount: 3`,
When the stats row renders,
Then a fourth cell is present showing the value "3" with a label resolving from `exam.result.essayPending` i18n key in `text-edu-warning` color; the existing three MCQ cells (correct / incorrect / skipped) remain visible.

**AC-E11.5-044 — Result (pending): essay stats cell hidden when essayCount is 0**
Satisfies: TR-E11.5-013
Given `essayCount === 0` or `essayCount === null`,
When the stats row renders,
Then the essay count cell is not rendered; only the three standard MCQ cells are shown.

**AC-E11.5-045 — Result (pending): essay question review shows pending label**
Satisfies: TR-E11.5-014, story.md AC-7
Given the question review section renders for a `submitted_pending_essay` result,
When an essay question row is rendered,
Then the row shows a label whose text resolves from `exam.result.essayQuestionLabel` i18n key ("Câu tự luận — Chờ chấm") instead of a correct/incorrect/skipped badge; no A/B/C/D option rows are shown for essay questions.

**AC-E11.5-046 — Result (pending): essay review shows student's submitted text**
Satisfies: TR-E11.5-014
Given the student submitted non-empty essay text for a question,
When the question review row for that essay question renders,
Then the student's submitted `textAnswer` is shown read-only in the row; no correct answer text is shown.

**AC-E11.5-047 — Result (pending): empty essay review shows placeholder**
Satisfies: TR-E11.5-014
Given the student submitted an empty essay answer (textAnswer: ""),
When the question review row for that essay question renders,
Then a placeholder indicator (not a blank space) is shown to indicate no answer was submitted.

**AC-E11.5-048 — Result (pending): MCQ question review unchanged from E11.1**
Satisfies: TR-E11.5-014, NFR-E11.5-008
Given the question review section renders and contains MCQ questions,
When the MCQ question rows render,
Then they display correct/incorrect/skipped markers exactly as per E11.1; no E11.5 elements appear on MCQ rows.

**AC-E11.5-049 — Result (pending): grade-book deep-link button present**
Satisfies: TR-E11.5-016
Given `result.status === 'submitted_pending_essay'` and the student is on ExamResult,
When the screen renders,
Then a "Xem điểm trong bảng điểm" button is present with a Lucide `award` icon; clicking it navigates the student to `/student/grades`.

---

### ExamResult — Completed Transition (UC-E11.5-007)

**AC-E11.5-050 — Result (completed): standard E11.1 view restored**
Satisfies: TR-E11.5-015, story.md AC-8
Given `result.status === 'completed'` and `isResultFinal(result) === true`, even for an exam that previously had `submitted_pending_essay` status,
When the ExamResult screen renders,
Then the standard E11.1 score hero (total score, score-based gradient), pass/fail badge, and standard three-cell stats row are shown; no pending-essay banner, no partial-result badge, and no essay stats cell are present.

**AC-E11.5-051 — Result (completed): isResultFinal guard respected**
Satisfies: TR-E11.5-015, ADR-0048
Given `result.score` is a non-null number and `result.passed` is a non-null boolean and `result.status === 'completed'`,
When `isResultFinal(result)` is called,
Then it returns `true`; the score and pass/fail are rendered; no null-guard fallback is triggered.

---

### ExamResult — Loading and Error States (UC-E11.5-008)

**AC-E11.5-052 — Result loading: skeleton within 320ms**
Satisfies: TR-E11.5-017, NFR-E11.5-005
Given the student navigates to ExamResult and the data fetch is pending,
When 320ms have elapsed since navigation,
Then the score-hero skeleton (card-sized) is visible.

**AC-E11.5-053 — Result error: fetch failed with retry**
Satisfies: TR-E11.5-017, INT-E11.5-005
Given the `GET /lms/api/v1/exams/:id/result` request fails with a 5xx network error where `retryable: true`,
When the error response is received,
Then an inline error state is shown with a retry button; clicking retry re-fetches the result; skeleton reappears during the retry fetch.

**AC-E11.5-054 — Result error: not-found**
Satisfies: INT-E11.5-005
Given the result endpoint returns 404 `EXAM_NOT_FOUND`,
When the error is received,
Then an inline error message is shown; a CTA navigates the student back to the exam list; no retry is offered.

---

### Accessibility (cross-cutting)

**AC-E11.5-055 — a11y: motion-safe animations**
Satisfies: NFR-E11.5-001 (a11y), accessibility.md rule
Given any animation or transition is used on ExamResult or ExamList (score hero gradient, banner fade, skeleton pulse),
When the user's OS has `prefers-reduced-motion: reduce` set,
Then the animation is reduced or disabled; no auto-playing motion content appears; this applies to all modified screens.

---

## 10. Non-Functional Requirements

| ID | Category | Requirement | Measurable target | QA verification |
|---|---|---|---|---|
| NFR-E11.5-001 | Accessibility | Warning banner live region | `role="alert"` or `aria-live="assertive"` on pending-essay banner; axe-core 0 critical/serious violations on ExamResult pending-essay Storybook story; WCAG 2.1 AA | `fe-accessibility-auditor` runs axe-core on `Result_PendingEssay` story; play() asserts attributes |
| NFR-E11.5-002 | Accessibility | Essay textarea labeling | Each `<textarea>` has associated `<label>` (htmlFor/id) or `aria-label`; char count has `aria-describedby` pointing to textarea; WCAG 2.1 AA SC 1.3.1 + 3.3.2 | `fe-accessibility-auditor`; AC-E11.5-026 + AC-E11.5-027 in Storybook play() |
| NFR-E11.5-003 | Accessibility | Warning badge color contrast | Warning-color text on warning-light background ≥4.5:1 contrast; `--edu-warning-foreground` (#2A3547) used — NOT white on `--edu-warning` background | axe-core contrast check; visual inspection in `ExamList_PendingEssayCard` story |
| NFR-E11.5-004 | Accessibility | Navigator essay icon label | Each essay navigator button has `aria-label` including question number + essay type indicator; no icon-only button without accessible name; WCAG 2.1 AA SC 4.1.2 | AC-E11.5-030 play() assertion; axe-core |
| NFR-E11.5-005 | Performance | Skeleton load | Skeleton/loading state appears within 320ms of navigation; no CLS when real content replaces skeleton | Storybook play() timer assertion on loading stories; Lighthouse CLS ≤ 0.1 |
| NFR-E11.5-006 | Responsive | No layout break at 320px | All modified screens (ExamList card, ExamResult hero, pending-essay banner) render without horizontal overflow or overlapping elements at 320/375/768/1280px; banner icon and text stack vertically at 320px | `fe-qa-playwright` viewport tests; visual inspection per breakpoint in Storybook |
| NFR-E11.5-007 | i18n | All strings from `exam.*` namespace | Zero hardcoded Vietnamese or English UI strings in .tsx files (outside mock/fixtures); all new keys in both `vi.json` and `en.json` under `exam` namespace; `tsc --noEmit` passes (typed keys); existing 14 keys REUSED — no parallel keys added | `tsc --noEmit` must pass; Biome lint; grep for diacritics in .tsx (trừ mock/fixtures) |
| NFR-E11.5-008 | Quality | No regression vs E11.1 | All existing E11.1 Vitest unit tests and Storybook play() assertions pass after E11.5 changes; `bun vitest run` green; `bun build` green | `fe-tech-lead-reviewer` explicitly verifies E11.1 test suite after nullable relaxation |
| NFR-E11.5-009 | Design System | Design tokens only | Zero raw color values (`#`, `rgb`, `oklch` literals) in .tsx files; only semantic tokens from `src/app/tokens.css` used; warning uses `--edu-warning` / `--edu-warning-light`; purple uses `--edu-purple`; no new tokens required | `fe-tech-lead-reviewer` token audit; Biome custom rule or grep |

---

## 11. UI States Required

### ExamList

| State | Trigger | UI |
|---|---|---|
| Loading | Data fetch pending | Skeleton card placeholders (existing from E11.1); visible within 320ms |
| Empty (all filter) | No exams in response | Existing `exam.empty.*` empty state component |
| Empty ("Chờ chấm" filter, no pending exams) | Filter active, no `submitted_pending_essay` exams | Same `exam.empty.*` component; driven by client-side filter result |
| Error (network) | 5xx, `retryable: true` | Inline error banner with retry button above card list |
| Success | Data loaded | Card list including pending-essay variant (warning badge, partial-score banner, CTA) for `submitted_pending_essay` exams |

### ExamBriefing

| State | Trigger | UI |
|---|---|---|
| Loading | Data fetch pending | Header + metadata row skeleton (existing from E11.1) |
| Error | `not-found` / `network-error` | Existing `exam.errors.*` error state |
| Success — mixed exam | `hasEssayQuestions === true` | Three additional elements: mixed badge, type-row update, essay grading note |
| Success — pure MCQ | `hasEssayQuestions === false` (or absent) | Standard E11.1 briefing; no mixed elements |

ExamBriefing and ExamTaking have no new async calls; their existing loading/error states from E11.1 remain unchanged except as noted.

### ExamTaking

| State | Trigger | UI |
|---|---|---|
| Loading | Questions fetch pending | Question-card skeleton (existing from E11.1) |
| Error | `EXAM_NOT_FOUND`, `EXAM_AFTER_DEADLINE`, `EXAM_MAX_ATTEMPTS`, network | Per existing E11.1 error handling |
| Success — essay question | `question.type === 'essay'` | `<textarea>` with placeholder, char count, 2000 maxlength |
| Success — MCQ question | `question.type === 'mcq'` | Standard A/B/C/D options (E11.1 unchanged) |
| Submit modal — empty essay | At least one essay empty | Advisory warning in modal; submission still allowed |
| Submit loading | Submit in flight | Full-screen submit overlay (existing from E11.1) |

### ExamResult

| State | Trigger | UI |
|---|---|---|
| Loading | Result fetch pending | Score-hero skeleton (card-sized; existing from E11.1 extended for new fields); visible within 320ms |
| Error — not found | `EXAM_NOT_FOUND` / 404 | Inline error: "Không tìm thấy kết quả"; CTA back to list; no retry |
| Error — result not ready | `EXAM_RESULT_NOT_READY` | Inline: "Kết quả chưa sẵn sàng"; retry or "come back later"; retryable |
| Error — network | 5xx, `retryable: true` | Inline error with retry button; skeleton on retry |
| Success — pending-essay | `result.status === 'submitted_pending_essay'`, `isResultFinal() === false` | MCQ partial score hero; "CHƯA CÓ ĐIỂM TỔNG" badge; pending-essay warning banner; essay stats cell; essay question-review labels; grade-book deep-link |
| Success — completed | `result.status === 'completed'`, `isResultFinal() === true` | Standard E11.1 score hero; pass/fail badge; three-cell stats row; no E11.5 overlay elements; grade-book deep-link remains |

---

## 12. a11y Checklist

All items are WCAG 2.1 AA. Each is verifiable by `fe-accessibility-auditor` + axe-core.

- [ ] **Pending-essay banner live region** — `role="alert"` + `aria-live="assertive"` on the warning banner element (NFR-E11.5-001, AC-E11.5-042). Screen reader announces on mount without focus movement.
- [ ] **Essay textarea programmatic label** — `<textarea>` has `<label htmlFor="...">` or `aria-label` linking it to the question text (NFR-E11.5-002, AC-E11.5-026). WCAG SC 1.3.1 + 3.3.2.
- [ ] **Char count `aria-describedby`** — char count `<span>` has an `id`; the `<textarea>` has `aria-describedby` set to that `id` (NFR-E11.5-002, AC-E11.5-027). WCAG SC 1.3.1.
- [ ] **Warning badge contrast** — all warning-colored badge and banner text uses `--edu-warning-foreground` (`#2A3547`) on `--edu-warning-light` backgrounds. White text MUST NOT be used on `--edu-warning` yellow (NFR-E11.5-003). WCAG SC 1.4.3 (≥4.5:1).
- [ ] **Navigator essay button accessible name** — essay navigator buttons carry `aria-label` that includes the question number and indicates essay type (e.g. "Câu 25 - tự luận"); not icon-only without name (NFR-E11.5-004, AC-E11.5-030). WCAG SC 4.1.2.
- [ ] **Motion-safe animations** — all animations on modified screens gated behind `@media (prefers-reduced-motion: reduce)` (AC-E11.5-055, accessibility.md). Score hero gradient, banner fade-in, skeleton pulse must all respect this media query.
- [ ] **Keyboard navigability** — all new interactive elements (CTA button, filter chip, grade-book deep-link, submit modal warning area) are keyboard reachable; tab order follows reading order.
- [ ] **Touch target size** — CTA buttons and filter chips ≥44×44px on mobile (accessibility.md rule).
- [ ] **Responsive no-overflow** — pending-essay banner and partial-score inline banner stack icon + text vertically at 320px viewport; no horizontal overflow (NFR-E11.5-006).
- [ ] **`<html lang>`** — already set by E11.1 locale routing; verify unchanged.
- [ ] **Focus ring** — all new interactive elements show focus ring using `--ring`; no `outline: none` without replacement.

---

## 13. i18n Requirements

### Key reuse policy
The system SHALL NOT add new `exam.*` i18n keys unless an existing key is demonstrably insufficient. All 14 existing `exam.*` keys MUST be reused as-is. If a key is found missing, flag to `ba-lead` before adding it.

> [CONSTRAINT] Mock/fixture data (exam titles, teacher names, subject names) is NOT i18n — it lives in `*.fixtures.ts` and is exempt.

### New keys required for this story
All new user-visible strings must be added to BOTH `src/bootstrap/i18n/messages/vi.json` AND `src/bootstrap/i18n/messages/en.json` under the `exam` namespace, with vi as source. TypeScript compile-time check (`messages.d.ts` augmentation) will catch incorrect keys.

| i18n Key | vi value | en value | Where used |
|---|---|---|---|
| `exam.status.submittedPendingEssay` | "Chờ chấm tự luận" | "Pending Essay Grade" | ExamList card status badge (AC-E11.5-001) |
| `exam.cta.viewPendingResult` | "Xem kết quả tạm thời" | "View Partial Result" | ExamList card CTA button (AC-E11.5-005) |
| `exam.filter.pendingEssay` | "Chờ chấm" | "Pending Essay" | ExamList filter chip (AC-E11.5-009) |
| `exam.briefing.mixedType` | "Bài thi kết hợp" | "Mixed Exam" | ExamBriefing mixed badge (AC-E11.5-015) |
| `exam.briefing.mixedTypeValue` | "Trắc nghiệm + Tự luận" | "MCQ + Essay" | ExamBriefing type row (AC-E11.5-016) |
| `exam.briefing.essayGradingNote` | "Phần tự luận sẽ được giáo viên chấm và cập nhật kết quả sau." | "The essay section will be graded by the teacher and results updated later." | ExamBriefing essay note (AC-E11.5-017) |
| `exam.taking.essayPlaceholder` | "Nhập câu trả lời của bạn..." | "Enter your answer..." | Essay textarea placeholder (AC-E11.5-021) |
| `exam.taking.essayCharCount` | "{count}/2000 ký tự" | "{count}/2000 characters" | Char count display (AC-E11.5-022/023) |
| `exam.taking.essayEmptyWarning` | "Bạn chưa trả lời câu tự luận." | "You have not answered the essay question." | Submit modal warning (AC-E11.5-031) |
| `exam.result.mcqLabel` | "TN" | "MCQ" | Score circle label (AC-E11.5-036) |
| `exam.result.partialResultBadge` | "CHƯA CÓ ĐIỂM TỔNG" | "PARTIAL RESULT" | Result hero badge (AC-E11.5-038) |
| `exam.result.pendingEssayTitle` | "Điểm tự luận đang chờ giáo viên chấm" | "Essay score awaiting teacher grading" | Warning banner title (AC-E11.5-041) |
| `exam.result.pendingEssayBody` | "Phần trắc nghiệm đã được chấm tự động — {mcqScore}/{mcqMax}đ. Phần tự luận (tối đa {essayMax}đ) sẽ được giáo viên chấm thủ công." | "Multiple-choice section auto-graded — {mcqScore}/{mcqMax} pts. The essay section (max {essayMax} pts) will be manually graded by the teacher." | Warning banner body (AC-E11.5-041) |
| `exam.result.essayPending` | "Câu tự luận (chờ chấm)" | "Essay Questions (Pending)" | Stats row essay cell label (AC-E11.5-043) |
| `exam.result.essayQuestionLabel` | "Câu tự luận — Chờ chấm" | "Essay Question — Pending Grade" | Question review essay label (AC-E11.5-045) |

> [NOTE] These keys are PROPOSED based on the design-spec values. The FE team must verify whether any of these 15 keys already exist in the current `vi.json`/`en.json`. If any pre-exist, use them as-is without regenerating.

### Translation boundary
- `useTranslations("exam")` in client components
- `getTranslations("exam")` in server components / RSC pages
- Server actions, use-cases, and repositories do NOT translate — they return error codes / `Failure["type"]`; the presentation layer translates

---

## 14. Open Questions

**[OQ-1]** `selectedOption` integer vs `selectedOptionId` string (INT-E11.5-004): The existing E11.1 `SubmitExamDto` uses `selectedOptionId: string | null` (e.g. `"A"`, `"B"`). The story design notes use `selectedOption: number` (0-based integer). These are different wire shapes. For mock purposes either shape works, but the DTO and mapper must be consistent. The FE team must confirm with the lms team before real integration. Flag to `ba-lead` if an ADR is warranted.

**[OQ-2]** `EXAM_ESSAY_TOO_LONG` error code (INT-E11.5-004): This 422 error code is assumed because the story specifies a 2000-char max. It does not exist in any current lms `ERROR_CODES.md`. The failure union needs `{ type: 'essay-too-long' }`. Confirm with lms team when service ships; flag to `ba-lead`.

**[OQ-3]** `EXAM_RESULT_NOT_READY` error code (INT-E11.5-005): If the backend has not finished processing a submission when the client fetches the result, a transient 404 or dedicated code may apply. The failure union may need `{ type: 'result-not-ready' }` with retry behavior. Confirm with lms team.

**[OQ-4]** `questionTypes` field on exam detail (INT-E11.5-002): The integration map proposes `questionTypes: ('mcq' | 'essay')[]` on the exam detail response for the briefing "Loại bài" row. If the backend does not return this field, the briefing derives the value from `hasEssayQuestions: boolean` alone (sufficient for the binary MCQ vs mixed decision). Confirm with lms team. Fallback is safe and specified.

**[OQ-5]** E11.1 question entity `type` field (INT-E11.5-003): The existing `ExamQuestion` entity has no `type` discriminant. Introducing `type?: 'mcq' | 'essay'` (optional, default `'mcq'`) touches the mapper, DTO, mock factory, and all four ViewModels. The FE team must confirm no E11.1 test breaks after this change (NFR-E11.5-008). Recommended approach: add `type?: 'mcq' | 'essay'` as optional with default `'mcq'`, keeping the field optional for backward compatibility. Flag to `ba-lead` if this introduces scope risk.

**[OQ-6]** `score` and `passed` nullability on `ExamResult` entity — ADR-0048 (INT-E11.5-005): The existing `ExamResult` entity declares `score: number` and `passed: boolean` as non-nullable. For `submitted_pending_essay`, both must become `number | null` and `boolean | null`. This is a breaking change that will cause TypeScript compile errors on all E11.1 call sites that read these fields without null guards. Per **ADR-0048**, the `isResultFinal()` guard is the canonical solution. The `fe-tech-lead-reviewer` MUST explicitly audit all E11.1 usages of `score` and `passed` before this change is merged. ADR-0048 is currently "Proposed" — it should be moved to "Accepted" once the FE team confirms the approach.

**[OQ-7]** Stats row layout at 375px with four cells (requirements.md §9): A four-cell stats row (MCQ correct / incorrect / skipped + essay pending) may not fit at 375px without a layout change. Should the row use a 2×2 grid, a scrollable row, or should the essay cell replace the "Skipped" cell in the pending-essay state? This is a design decision. Flag to `ba-lead` to route to `uiux-lead` if the FE team raises it during planning.

---

## 15. Traceability Matrix

| AC | TR/NFR Source | Integration | UC | Storybook Story |
|---|---|---|---|---|
| AC-E11.5-001 | TR-E11.5-004 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-002 | TR-E11.5-004 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-003 | TR-E11.5-004, NFR-E11.5-003 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-004 | TR-E11.5-004 | INT-E11.5-001 | UC-E11.5-001 (A3) | ExamList_PendingEssayCard |
| AC-E11.5-005 | TR-E11.5-004 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-006 | TR-E11.5-004 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-007 | TR-E11.5-004, NFR-E11.5-009 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-008 | TR-E11.5-005 | INT-E11.5-001 | UC-E11.5-001 | ExamList_PendingEssayCard |
| AC-E11.5-009 | TR-E11.5-006 | INT-E11.5-001 | UC-E11.5-001 (A1) | ExamList_PendingEssayCard |
| AC-E11.5-010 | TR-E11.5-006 | INT-E11.5-001 | UC-E11.5-001 (A1) | ExamList_PendingEssayCard |
| AC-E11.5-011 | TR-E11.5-018 | INT-E11.5-001 | UC-E11.5-002 (A2) | ExamList_PendingEssayCard |
| AC-E11.5-012 | TR-E11.5-017, NFR-E11.5-005 | INT-E11.5-001 | UC-E11.5-002 | ExamList_PendingEssayCard |
| AC-E11.5-013 | TR-E11.5-017, NFR-E11.5-005 | INT-E11.5-001 | UC-E11.5-002 | ExamList_PendingEssayCard |
| AC-E11.5-014 | TR-E11.5-017 | INT-E11.5-001 | UC-E11.5-002 (E1) | ExamList_PendingEssayCard |
| AC-E11.5-015 | TR-E11.5-007 | INT-E11.5-002 | UC-E11.5-003 | Briefing_MixedIndicator |
| AC-E11.5-016 | TR-E11.5-007 | INT-E11.5-002 | UC-E11.5-003 | Briefing_MixedIndicator |
| AC-E11.5-017 | TR-E11.5-007 | INT-E11.5-002 | UC-E11.5-003 | Briefing_MixedIndicator |
| AC-E11.5-018 | TR-E11.5-007 | INT-E11.5-002 | UC-E11.5-003 (A1) | Briefing_MixedIndicator |
| AC-E11.5-019 | TR-E11.5-007 | INT-E11.5-002 | UC-E11.5-003 (A2) | Briefing_MixedIndicator |
| AC-E11.5-020 | TR-E11.5-008 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-021 | TR-E11.5-008, NFR-E11.5-007 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-022 | TR-E11.5-008 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-023 | TR-E11.5-008 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-024 | TR-E11.5-008 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-025 | TR-E11.5-008, NFR-E11.5-009 | INT-E11.5-003 | UC-E11.5-004 (A1) | Taking_EssayQuestion |
| AC-E11.5-026 | NFR-E11.5-002 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-027 | NFR-E11.5-002 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-028 | TR-E11.5-008 | INT-E11.5-003 | UC-E11.5-004 (A2/A3) | Taking_EssayQuestion |
| AC-E11.5-029 | TR-E11.5-010, NFR-E11.5-004 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-030 | NFR-E11.5-004 | INT-E11.5-003 | UC-E11.5-004 | Taking_EssayQuestion |
| AC-E11.5-031 | TR-E11.5-009 | INT-E11.5-004 | UC-E11.5-005 | Taking_EssayQuestion |
| AC-E11.5-032 | TR-E11.5-009 | INT-E11.5-004 | UC-E11.5-005 | Taking_EssayQuestion |
| AC-E11.5-033 | TR-E11.5-009 | INT-E11.5-004 | UC-E11.5-005 (A1) | Taking_EssayQuestion |
| AC-E11.5-034 | TR-E11.5-017 | INT-E11.5-004 | UC-E11.5-005 | Taking_EssayQuestion |
| AC-E11.5-035 | INT-E11.5-004 | INT-E11.5-004 | UC-E11.5-005 (E5) | Taking_EssayQuestion |
| AC-E11.5-036 | TR-E11.5-011 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-037 | TR-E11.5-011 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-038 | TR-E11.5-011, NFR-E11.5-003 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-039 | TR-E11.5-011 | INT-E11.5-005 | UC-E11.5-006 (A1) | Result_PendingEssay |
| AC-E11.5-040 | TR-E11.5-012 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-041 | TR-E11.5-012, NFR-E11.5-007 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-042 | TR-E11.5-012, NFR-E11.5-001 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-043 | TR-E11.5-013 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-044 | TR-E11.5-013 | INT-E11.5-005 | UC-E11.5-006 (A3) | Result_PendingEssay |
| AC-E11.5-045 | TR-E11.5-014 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-046 | TR-E11.5-014 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-047 | TR-E11.5-014 | INT-E11.5-005 | UC-E11.5-006 (A4) | Result_PendingEssay |
| AC-E11.5-048 | TR-E11.5-014, NFR-E11.5-008 | INT-E11.5-005 | UC-E11.5-006 | Result_PendingEssay |
| AC-E11.5-049 | TR-E11.5-016 | n/a (local navigation) | UC-E11.5-006 (A5) | Result_PendingEssay |
| AC-E11.5-050 | TR-E11.5-015 | INT-E11.5-005 | UC-E11.5-007 | Result_CompletedAfterEssay |
| AC-E11.5-051 | TR-E11.5-015, ADR-0048 | INT-E11.5-005 | UC-E11.5-007 | Result_CompletedAfterEssay |
| AC-E11.5-052 | TR-E11.5-017, NFR-E11.5-005 | INT-E11.5-005 | UC-E11.5-008 | Result_PendingEssay |
| AC-E11.5-053 | TR-E11.5-017 | INT-E11.5-005 | UC-E11.5-008 (E1) | Result_PendingEssay |
| AC-E11.5-054 | INT-E11.5-005 | INT-E11.5-005 | UC-E11.5-008 (A2) | Result_PendingEssay |
| AC-E11.5-055 | NFR-E11.5-001, accessibility.md | n/a | All UCs | All 5 stories |

---

## 16. Storybook Stories Required

All five stories live under `src/features/exam/presentation/` in the appropriate screen folder.

### Story 1 — `ExamList_PendingEssayCard`
**File:** `src/features/exam/presentation/exam-list/ExamList.stories.tsx` (add story variant)  
**Description:** ExamList screen with exam-005 (`submitted_pending_essay`) in the mock data set.

**States to cover:**
- `PendingEssayCard_Default` — card renders with warning badge, partial-score inline banner (mcqScore: 6.0/mcqMax: 7.0), CTA button, warning border
- `PendingEssayCard_NullScore` — card renders with `mcqScore: null`; banner shows "--/--"
- `PendingEssayCard_FilterActive` — "Chờ chấm" chip active; only pending-essay cards visible
- `PendingEssayCard_FilterEmpty` — "Chờ chấm" chip active, no pending exams; empty state renders
- `PendingEssayCard_Loading` — skeleton visible within 320ms
- `PendingEssayCard_Error` — inline error banner with retry button

**AC coverage:** AC-E11.5-001 through AC-E11.5-014

---

### Story 2 — `Briefing_MixedIndicator`
**File:** `src/features/exam/presentation/exam-briefing/ExamBriefing.stories.tsx` (add story variant)  
**Description:** ExamBriefing screen for exam-005 with `hasEssayQuestions: true`.

**States to cover:**
- `MixedBriefing_Default` — three mixed elements visible: badge (`--edu-purple`), type row "Trắc nghiệm + Tự luận", essay grading note below rules list
- `MixedBriefing_PureMCQ` — `hasEssayQuestions: false`; standard E11.1 briefing; no mixed elements

**AC coverage:** AC-E11.5-015 through AC-E11.5-019

---

### Story 3 — `Taking_EssayQuestion`
**File:** `src/features/exam/presentation/exam-taking/ExamTaking.stories.tsx` (add story variant)  
**Description:** ExamTaking screen with a mixed question set from `buildMockMixedQuestions()`.

**States to cover:**
- `EssayQuestion_Empty` — essay question rendered; textarea empty; char count "0/2000"; navigator fileText icon
- `EssayQuestion_Typed` — student has typed 50 chars; char count "50/2000"; question marked answered
- `EssayQuestion_NearLimit` — student has typed 1900 chars; char count color `text-edu-warning`
- `EssayQuestion_AtLimit` — 2000 chars; additional input blocked
- `EssayQuestion_WhitespaceOnly` — whitespace only; question NOT counted as answered
- `SubmitModal_EmptyEssayWarning` — submit modal open with at least one essay empty; warning shown
- `SubmitModal_AllAnswered` — submit modal open, all essays answered; warning NOT shown
- `SubmitLoading` — full-screen overlay visible during submit
- `SubmitNetworkError` — toast error; exam state retained; essay text preserved
- `NavigatorEssayIcon` — navigator grid; essay cells show `fileText` icon; MCQ cells show numerals

**AC coverage:** AC-E11.5-020 through AC-E11.5-035

---

### Story 4 — `Result_PendingEssay`
**File:** `src/features/exam/presentation/exam-result/ExamResult.stories.tsx` (add story variant)  
**Description:** ExamResult screen with `MOCK_PENDING_ESSAY_RESULT` fixture.

**States to cover:**
- `PendingEssay_Default` — full pending-essay variant: MCQ score hero (6.0/7.0, "TN"), "CHƯA CÓ ĐIỂM TỔNG" badge, warning banner (`role="alert"`), four-cell stats row, essay question-review labels, grade-book deep-link
- `PendingEssay_NullScore` — `mcqScore: null`; score circle shows "--"
- `PendingEssay_NullEssayMax` — `essayMax: null`; banner body shows "--" for `{essayMax}`
- `PendingEssay_EssayCountZero` — `essayCount: 0`; essay stats cell hidden
- `PendingEssay_EssayReviewEmptyAnswer` — essay question with empty `textAnswer`; placeholder shown
- `PendingEssay_Loading` — score-hero skeleton visible within 320ms
- `PendingEssay_NetworkError` — inline error with retry button; skeleton on retry
- `PendingEssay_NotFound` — `EXAM_NOT_FOUND`; inline error + back-to-list CTA
- `PendingEssay_GradeBookNavigation` — grade-book button present; clicking navigates to `/student/grades`

**AC coverage:** AC-E11.5-036 through AC-E11.5-049, AC-E11.5-052 through AC-E11.5-054, AC-E11.5-055

---

### Story 5 — `Result_CompletedAfterEssay`
**File:** `src/features/exam/presentation/exam-result/ExamResult.stories.tsx` (add story variant)  
**Description:** ExamResult screen for an exam that previously had `submitted_pending_essay` status but now has `status: 'completed'` (essay graded).

**States to cover:**
- `CompletedAfterEssay_Default` — standard E11.1 score hero (total score, pass/fail badge, score-based gradient); no pending-essay banner; no partial-result badge; no essay stats cell; grade-book deep-link present

**AC coverage:** AC-E11.5-050 through AC-E11.5-051, AC-E11.5-055

---

## Handoff to fe-lead

### What `fe-lead` should build

This story extends an already-implemented feature (`src/features/exam/`). Implementation order matters:

1. **Domain changes first** (§5): Extend `ExamStatus` union → relax `ExamResult.score`/`.passed` to nullable (ADR-0048) → add `type` discriminant to `ExamQuestion` → add `calculatePartialScore()`. This step will cause TypeScript compile errors on E11.1 call sites; resolve before proceeding.
2. **Mapper + DTO extensions** (§6): Handle `submitted_pending_essay` branch in `getExamResult` mapper; extend `ExamSummaryDto`, `ExamQuestionDto`, `ExamResultDto`.
3. **Mock fixtures** (§8): Add exam-005 to `MOCK_EXAMS`; implement `buildMockMixedQuestions()`; create `MOCK_PENDING_ESSAY_RESULT`.
4. **ViewModel deltas** (§7): Update ViewModel interfaces — `ExamSummary`, `ExamQuestion`, `ExamAnswer` (discriminated union), `ExamResult`, `ExamResultVm`.
5. **Presentation — four screens** (§9/§11): ExamList card variant + filter chip → ExamBriefing mixed indicator → ExamTaking essay textarea + empty-essay warning → ExamResult pending-essay variant.
6. **i18n keys** (§13): Add all new `exam.*` keys to both `vi.json` and `en.json`.
7. **Storybook** (§16): Five stories with play() assertions covering all ACs.

### Lane
**normal** — four screens affected (all additive); domain entity nullable relaxation is the highest-risk step (OQ-6); mock-first throughout.

### Gate
All five Storybook stories with play() assertions PASS + `bun vitest run` green + `bun build` green + `tsc --noEmit 0 errors` + `fe-tech-lead-reviewer` explicitly verifies no E11.1 regression after `score`/`passed` nullable relaxation + `fe-accessibility-auditor` runs axe-core on `Result_PendingEssay` story.

### Proof rows for `docs/TEST_MATRIX.md`
Update US-E11.5 row to `implemented` after gate:
- Unit: `ExamStatus` extension; `calculatePartialScore()` (MCQ-only); result mapper `submitted_pending_essay` branch; essay question render logic (type discriminant)
- Integration: exam mapper handles `submitted_pending_essay` in list + result responses; `ExamAnswer` discriminated union in submit DTO
- E2E: Storybook `ExamList_PendingEssayCard`, `Briefing_MixedIndicator`, `Taking_EssayQuestion`, `Result_PendingEssay`, `Result_CompletedAfterEssay` — all play() assertions green
- Platform: `bun build` green; `tsc --noEmit` 0 errors; all E11.1 tests remain green (no regression)
- Release: design-review gate PASS (`/impeccable audit` on modified screens)

### Key risks to flag during planning
1. **ADR-0048 nullability cascade** (OQ-6): Relax `score`/`passed` → compile errors on all E11.1 sites that read these fields → shallow but must-audit-first.
2. **`ExamQuestion.type` introduction** (OQ-5): New field on existing entity used by all four ExamTaking ViewModels → regression risk on E11.1 question rendering path.
3. **OQ-1 submit payload shape**: `selectedOption: number` vs `selectedOptionId: string` — must decide before implementing `SubmitExamDto`. Mock-first allows deferral, but the DTO must be internally consistent.
4. **OQ-7 stats row at 375px**: Four-cell row may overflow at 375px — flag to `uiux-lead` if the FE team cannot fit it cleanly within the existing three-cell grid.
