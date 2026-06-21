# Integration Map — US-E11.5 Mixed Exam Result: submitted_pending_essay Status + Pending-Essay Flow

**Story:** US-E11.5  
**Author:** ba-integration-analyst  
**Date:** 2026-06-21  
**Depends on:** US-E11.1 integration (base exam flow, already implemented)

---

## 1. Integration Overview

| Dimension | Value |
|---|---|
| Endpoints touched | 5 (all inherited from E11.1 — extended, not replaced) |
| Services touched | `lms` only |
| Real vs mock-first | All 5: MOCK-FIRST (`lms` not shipped, decision 0014) |
| New endpoint constants | None — extends `EXAM_EP` in `bootstrap/endpoint/exam.endpoint.ts` |
| New HTTP methods | None |
| Data sensitivity | Internal — student exam scores are per-tenant, not public |
| Role gate | `student` only (gate already established at route layout in E11.1) |

**Risk notes:**
1. `ExamQuestion` entity currently has no `type` discriminant. E11.5 must introduce `type: 'mcq' | 'essay'` — this is a domain entity change that touches the mapper, DTO, mock repository, and all four ViewModels. The FE team must confirm no E11.1 test breaks (NFR-E11.5-008).
2. `ExamResult` entity carries no `status` field. E11.5 must add it; the mapper currently has no branch for `submitted_pending_essay`. The mapper branch is a must-have before any result UI work starts (TR-E11.5-003).
3. `ExamSummary` entity has no `hasEssayQuestions`, `essayCount`, `mcqScore`, `mcqMax`, or `essayMax` fields. All five must be added to the entity, DTO, mapper, and fixtures.
4. `SubmitExamDto` currently carries only `{ questionId, selectedOptionId }` per answer. The essay extension adds a `type` discriminant and a `textAnswer` field — the DTO must become a discriminated union (see Section 2).
5. `ExamAnswer` ViewModel type (in `exam-taking.i-vm.ts`) must also become a discriminated union to match.

---

## 2. Endpoint Catalogue

---

### INT-E11.5-001 — List Exams (extended)

**Service:** lms  
**Method + Path:** `GET /lms/api/v1/exams`  
**Status:** MOCK-FIRST — lms not shipped (decision 0014)  
**Screen served:** ExamList (`/student/exams`)  
**Protected:** yes — `student` role (route layout gate from E11.1)

**Request (outbound, camelCase):**

No change from E11.1. Query params remain unchanged (no server-side filter by `submitted_pending_essay` — filtering is client-side per E11.1 pattern).

**Response payload delta (inbound, after envelope unwrap — fields added to `ExamSummaryDto` and `ExamSummary` entity):**

| Field | Type | Meaning | Sensitivity |
|---|---|---|---|
| `hasEssayQuestions` | `boolean` | Whether the exam contains essay questions; drives ExamBriefing mixed indicator | Internal |
| `essayCount` | `number` | Number of essay questions in the exam | Internal |
| `essayMax` | `number` | Max score attributable to essay questions | Internal |
| `mcqScore` | `number \| null` | Auto-graded MCQ score; present for `submitted_pending_essay`, null otherwise | Internal |
| `mcqMax` | `number` | Max score attributable to MCQ questions | Internal |
| `status` | `string` (wire) → `ExamStatus` (entity) | Now includes `'submitted_pending_essay'` alongside existing `'available'`, `'completed'`, `'expired'` | Internal |

**`submitted_pending_essay` in this response:** present in the `status` field of an exam item; drives the pending-essay card variant on ExamList.

**Pagination:** cursor-based (`nextCursor`, `hasMore` in `meta.pagination`) — no change from E11.1. `useInfiniteQuery` pattern applies.

**Loading / empty / skeleton:**
- Loading: skeleton card (existing from E11.1; no new skeleton needed)
- Empty (all filter): existing `exam.empty.*` i18n key state
- Empty ("Cho cham" filter active, no `submitted_pending_essay` exams): same empty state component, driven by filter result — see TR-E11.5-018

**Errors → UI behavior:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_NOT_FOUND` / 404 | `not-found` | Toast error; list stays visible | No |
| `UNAUTHORIZED` / 401 | — | Redirect to login (handled by HTTP interceptor globally) | No |
| `FORBIDDEN` / 403 | — | Role error page (student gate) | No |
| Network / 5xx | `network-error` | Inline error banner with retry button | Yes (`retryable: true`) |
| `unknown` | `unknown` | Generic error toast | No |

---

### INT-E11.5-002 — Get Exam Detail / Briefing (extended)

**Service:** lms  
**Method + Path:** `GET /lms/api/v1/exams/:id`  
**Status:** MOCK-FIRST  
**Screen served:** ExamBriefing (`/student/exams/:id/briefing`)  
**Protected:** yes — `student` role

**Request (outbound):** No change from E11.1 — path param `id` only.

**Response payload delta (fields added to `ExamSummaryDto` and `ExamSummary` entity):**

Same five fields as INT-E11.5-001 (`hasEssayQuestions`, `essayCount`, `essayMax`, `mcqScore`, `mcqMax`), applied to the single-exam detail shape.

Additionally:

| Field | Type | Meaning | Sensitivity |
|---|---|---|---|
| `questionTypes` | `('mcq' \| 'essay')[]` | List of distinct question types present in the exam; used by briefing to show "Trac nghiem + Tu luan" row value without loading all questions | Internal |

**`submitted_pending_essay` in this response:** not applicable — briefing is reached before submission. However, `hasEssayQuestions: true` drives the mixed-exam indicator UI.

**Pagination:** none (single resource).

**Loading / empty / skeleton:**
- Loading: skeleton for briefing header + metadata rows (existing from E11.1)
- Error state per existing `exam.errors.*` i18n keys

**Errors → UI behavior:** Same error table as INT-E11.5-001.

---

### INT-E11.5-003 — Get Exam Questions (extended)

**Service:** lms  
**Method + Path:** `GET /lms/api/v1/exams/:id/questions`  
**Status:** MOCK-FIRST  
**Screen served:** ExamTaking (`/student/exams/:id/taking`)  
**Protected:** yes — `student` role

**Request (outbound):** No change — path param `id` only.

**Response payload delta (fields added to `ExamQuestionDto` and `ExamQuestion` entity):**

| Field | Type | Meaning | Sensitivity |
|---|---|---|---|
| `type` | `'mcq' \| 'essay'` | Question type discriminant; absent on existing MCQ questions (safe default: treat absent as `'mcq'`) | Internal |

**When `type === 'essay'`:** the `options` array is absent or empty. The mapper must tolerate `options: undefined` and normalize to `options: []`.

**`submitted_pending_essay` in this response:** not present — this endpoint is called during exam taking, before submission.

**Pagination:** none (full question list for the exam in one response, as per E11.1).

**Loading / empty / skeleton:**
- Loading: skeleton question card (existing from E11.1)
- Empty questions (0 questions): error state — exam cannot be taken; show `exam.errors.*` key

**Errors → UI behavior:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_NOT_FOUND` / 404 | `not-found` | Navigate back to list; toast error | No |
| `EXAM_AFTER_DEADLINE` / 400 or 403 | `after-deadline` | Banner "Bài thi đã hết hạn"; CTA back to list | No |
| `EXAM_MAX_ATTEMPTS` / 403 | `max-attempts-exceeded` | Banner "Đã nộp tối đa số lần"; CTA to result | No |
| Network / 5xx | `network-error` | Inline error with retry | Yes |

---

### INT-E11.5-004 — Submit Exam Answers (extended)

**Service:** lms  
**Method + Path:** `POST /lms/api/v1/exams/:id/submit`  
**Status:** MOCK-FIRST  
**Screen served:** ExamTaking — submit action  
**Protected:** yes — `student` role

**Request (outbound, camelCase) — EXTENDED:**

The `answers` array now carries a discriminated union. Each item is one of:

```json
{
  "answers": [
    {
      "questionId": "q-1",
      "type": "mcq",
      "selectedOption": 0
    },
    {
      "questionId": "q-21",
      "type": "essay",
      "textAnswer": "Student's free-text response here"
    }
  ],
  "startedAt": 1719000000000
}
```

| Field | Type | Meaning | Constraint |
|---|---|---|---|
| `answers[].questionId` | `string` | References `ExamQuestion.id` | Required for all answer types |
| `answers[].type` | `'mcq' \| 'essay'` | Discriminant; determines which sibling fields are present | Required |
| `answers[].selectedOption` | `number \| null` | 0-based option index for MCQ (0=A, 1=B, 2=C, 3=D); `null` = skipped | Present only when `type === 'mcq'` |
| `answers[].textAnswer` | `string` | Student's free-text essay response | Present only when `type === 'essay'`; max 2000 chars; empty string is valid (student may submit blank) |
| `startedAt` | `number` | Unix timestamp (ms) when the exam session began | Required; unchanged from E11.1 |

**Note on `selectedOption` vs `selectedOptionId`:** The existing E11.1 `SubmitExamDto` uses `selectedOptionId: string | null` (e.g. `"A"`, `"B"`). The request contract above uses a 0-based integer index `selectedOption`. This is an [OPEN QUESTION] — see Section 5. The integration map shows the integer form as per the story design notes; confirm with lms team when service ships.

**Response payload (inbound, after envelope unwrap):**

No change from E11.1. Submit returns:

| Field | Type | Meaning |
|---|---|---|
| `examId` | `string` | Confirms which exam was submitted |
| `status` | `string` | Will be `'submitted_pending_essay'` for mixed exams, `'completed'` for pure MCQ |

The client navigates to `GET /lms/api/v1/exams/:id/result` immediately after a successful submit response to retrieve the result.

**`submitted_pending_essay` in this response:** present in `status` when the exam has essay questions — this is the first point where the client learns the outcome is partial.

**Pagination:** none.

**Loading / empty / skeleton:**
- Loading: full-screen submit overlay / spinner (existing from E11.1)
- No empty state (action endpoint)

**Errors → UI behavior:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_AFTER_DEADLINE` / 400 | `after-deadline` | Modal: "Đã hết thời gian nộp bài"; close returns to list | No |
| `EXAM_ALREADY_SUBMITTED` / 409 | `already-submitted` | Modal: "Bạn đã nộp bài này rồi"; CTA to result | No |
| `EXAM_MAX_ATTEMPTS` / 403 | `max-attempts-exceeded` | Modal: "Đã nộp tối đa số lần" | No |
| `EXAM_ESSAY_TOO_LONG` / 422 | new — see Open Questions | Inline field error on essay textarea: text exceeds limit; student must shorten | No |
| `VALIDATION_ERROR` / 422 with `fields[]` | `unknown` | Map `fields[].field` to per-question errors; surface as inline warnings | No |
| Network / 5xx | `network-error` | Toast error; keep exam state in memory so student can retry | Yes |
| `UNAUTHORIZED` / 401 | — | Redirect to login (interceptor) | No |

---

### INT-E11.5-005 — Get Exam Result (extended)

**Service:** lms  
**Method + Path:** `GET /lms/api/v1/exams/:id/result`  
**Status:** MOCK-FIRST  
**Screen served:** ExamResult (`/student/exams/:id/result`)  
**Protected:** yes — `student` role

**Request (outbound):** No change — path param `id` only.

**Response payload delta (fields added to `ExamResultDto` and `ExamResult` entity):**

| Field | Type | Meaning | Present when |
|---|---|---|---|
| `status` | `'completed' \| 'submitted_pending_essay'` | Result status; absent in E11.1 DTO (entity had no status) | Always |
| `mcqScore` | `number \| null` | Auto-graded MCQ score (e.g. `6.0`); null if not yet computed | `submitted_pending_essay` and `completed` |
| `mcqMax` | `number` | Maximum score attributable to MCQ questions | Always for mixed exams |
| `essayMax` | `number \| null` | Maximum score attributable to essay questions | Mixed exams; null for pure MCQ |
| `essayCount` | `number` | Number of essay questions in the exam | Always for mixed exams |

**`questionResults[]` delta — essay question variant:**

| Field | Type | Meaning | Present when |
|---|---|---|---|
| `questionResults[].type` | `'mcq' \| 'essay'` | Question type discriminant in the review list | Always |
| `questionResults[].textAnswer` | `string \| null` | The student's submitted essay text; shown read-only in question review | `type === 'essay'` |
| `questionResults[].correctOptionId` | absent or null | Not applicable for essay; mapper must tolerate absence | `type === 'essay'` only |
| `questionResults[].isCorrect` | absent or null | Not scored for essay in pending state; mapper must tolerate absence | `type === 'essay'` only |

**`submitted_pending_essay` in this response:** the `status` field equals `'submitted_pending_essay'`; `score`, `passed`, `totalScore` may be absent or null; `mcqScore` and `mcqMax` are populated. The mapper must NOT populate `ExamResult.passed` or `ExamResult.score` from the total-score field in this branch (TR-E11.5-003).

**Pagination:** none (single resource).

**Loading / empty / skeleton:**
- Loading: score-hero skeleton (card-sized, existing from E11.1 plus new fields)
- No empty state — result either exists or returns 404

**Errors → UI behavior:**

| Code / Status | Failure type | UI behavior | Retryable |
|---|---|---|---|
| `EXAM_NOT_FOUND` / 404 | `not-found` | Inline error: "Không tìm thấy kết quả"; CTA back to list | No |
| `EXAM_RESULT_NOT_READY` / 404 or custom | new — see Open Questions | Inline state: result not yet available; show retry or "come back later" message | Yes (poll or manual retry) |
| `UNAUTHORIZED` / 401 | — | Redirect to login | No |
| `FORBIDDEN` / 403 | — | Error page (student owns this result only) | No |
| Network / 5xx | `network-error` | Inline error with retry button | Yes |
| `unknown` | `unknown` | Generic toast error | No |

---

## 3. Submit Payload Schema (INT-E11.5-004 Detail)

The extended `POST /lms/api/v1/exams/:id/submit` body uses a discriminated union for `answers[]`:

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

**Constraints on `textAnswer`:**
- Maximum 2000 characters (enforced client-side by `maxlength` on `<textarea>`; backend should also validate)
- Empty string `""` is a valid submission — student intentionally submits blank essay; backend must accept without error
- Leading/trailing whitespace does not count as "answered" for the progress counter (client-side rule: `textAnswer.trim().length > 0` = answered), but the raw value (including whitespace) is sent to the backend

**Constraint on `selectedOption`:**
- 0-based integer: `0 = A`, `1 = B`, `2 = C`, `3 = D`
- `null` = student skipped the MCQ question

---

## 4. ViewModel Deltas

These are the additive field changes required on top of the existing E11.1 ViewModel interfaces. All existing fields remain unchanged.

### 4.1 `ExamSummary` entity delta (shared by ExamListVm and ExamBriefingVm)

`ExamSummary` in `src/features/exam/domain/entities/exam.entity.ts` needs:

| Field | Type | Notes |
|---|---|---|
| `status` | extended to `ExamStatus` (includes `'submitted_pending_essay'`) | `ExamStatus` union must add the new value |
| `hasEssayQuestions` | `boolean` | New field; safe default `false` when absent |
| `essayCount` | `number` | Number of essay questions |
| `essayMax` | `number` | Max points for essay section |
| `mcqScore` | `number \| null` | Auto-graded MCQ score; null for non-pending exams |
| `mcqMax` | `number` | Max points for MCQ section |
| `questionTypes` | `('mcq' \| 'essay')[]` | Distinct types present (used by briefing "Loai bai" row) |

`ExamType` in the same file currently has only `"multiple-choice"`. It should be extended or left as-is if `questionTypes[]` is the preferred discriminant for the briefing row.

### 4.2 `ExamQuestion` entity delta (used by ExamTakingVm)

`ExamQuestion` in `src/features/exam/domain/entities/exam-question.entity.ts` needs:

| Field | Type | Notes |
|---|---|---|
| `type` | `'mcq' \| 'essay'` | Question type discriminant; absent fields in E11.1 must default to `'mcq'` for backward compatibility |

When `type === 'essay'`: `options` will be `[]` (empty array; mapper normalizes `undefined` → `[]`).

### 4.3 `ExamAnswer` ViewModel delta (used by ExamTakingVm.onSubmit)

`ExamAnswer` in `src/features/exam/presentation/exam-taking/exam-taking.i-vm.ts` must become a discriminated union:

| Variant | Fields |
|---|---|
| MCQ answer | `questionId: string`, `type: 'mcq'`, `selectedOptionId: string \| null` |
| Essay answer | `questionId: string`, `type: 'essay'`, `textAnswer: string` |

### 4.4 `ExamResult` entity delta (used by ExamResultVm)

`ExamResult` in `src/features/exam/domain/entities/exam-result.entity.ts` needs:

| Field | Type | Notes |
|---|---|---|
| `status` | `'completed' \| 'submitted_pending_essay'` | New field; existing E11.1 results implicitly have `'completed'` |
| `mcqScore` | `number \| null` | Auto-graded MCQ score; null on pure-MCQ `completed` exams if not provided by backend |
| `mcqMax` | `number \| null` | Max MCQ points |
| `essayMax` | `number \| null` | Max essay points; null for pure MCQ exams |
| `essayCount` | `number` | Essay question count; 0 for pure MCQ exams |

`QuestionResult` in the same file needs:

| Field | Type | Notes |
|---|---|---|
| `type` | `'mcq' \| 'essay'` | Discriminant; absent in E11.1 — default `'mcq'` for backward compatibility |
| `textAnswer` | `string \| null` | Student's submitted essay text; null for MCQ questions |
| `correctOptionId` | `string \| null` | Already `string` in E11.1; relax to allow `null` for essay |
| `isCorrect` | `boolean \| null` | Already `boolean` in E11.1; relax to allow `null` for essay |

### 4.5 `ExamResultVm` interface delta

`ExamResultVm` in `src/features/exam/presentation/exam-result/exam-result.i-vm.ts` needs:

| Field | Type | Notes |
|---|---|---|
| `onNavigateToGrades` | `() => void` | Grade-book deep-link CTA; navigate to `/student/grades` (TR-E11.5-016) |

No other changes — `result: ExamResult` already carries all new fields via the entity delta above.

---

## 5. Mock-First Plan

All five endpoints are MOCK-FIRST. The following fixtures must be added to or extended in `src/features/exam/infrastructure/repositories/mocks/exam.fixtures.ts`.

### 5.1 Extend `MOCK_EXAMS` — add exam id=5 (mixed, pending-essay)

Add one entry to `MOCK_EXAMS` with:

```
id: "exam-005"
title: "Kiểm tra Ngữ văn - Giữa kỳ"
subjectId: "sub-005"
subjectName: "Ngữ văn"
subjectColor: "purple"
teacherName: "Hoàng Thị Em"
description: "Bài kiểm tra kết hợp trắc nghiệm và tự luận."
durationMinutes: 60
totalQuestions: 27  (24 MCQ + 3 essay)
deadline: "2026-06-15T23:59:00Z"
status: "submitted_pending_essay"
type: "multiple-choice"        // legacy field — keep for backward compat
hasEssayQuestions: true
essayCount: 3
essayMax: 3.0
mcqScore: 6.0
mcqMax: 7.0
questionTypes: ["mcq", "essay"]
```

### 5.2 Add `buildMockMixedQuestions(mcqCount, essayCount)` factory

Returns an array of `ExamQuestion` where the last `essayCount` items have `type: 'essay'` and `options: []`. The first `mcqCount` items have `type: 'mcq'` and the standard OPTIONS_POOL.

### 5.3 Add `MOCK_PENDING_ESSAY_RESULT` fixture

A new named constant of type `ExamResult` (after entity delta applied):

```
examId: "exam-005"
examTitle: "Kiểm tra Ngữ văn - Giữa kỳ"
status: "submitted_pending_essay"
score: null                    // total not yet known
totalQuestions: 27
correctCount: 18               // MCQ only
incorrectCount: 6              // MCQ only
skippedCount: 0                // MCQ only
timeTakenSeconds: 2700
rank: null
percentile: null
passed: null                   // not determined yet
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

### 5.4 `NEXT_PUBLIC_USE_MOCK` guard

All mock data is returned by `MockExamRepository` when `NEXT_PUBLIC_USE_MOCK=true` (decision 0014). No new env var needed. The mock repository must handle the `submitted_pending_essay` status in `getResult()` by returning `MOCK_PENDING_ESSAY_RESULT` when `examId === 'exam-005'`.

---

## 6. Error / Loading / Empty States per Endpoint

| Endpoint | Loading | Empty / No-data | Error |
|---|---|---|---|
| INT-E11.5-001 List | Skeleton card (existing); no new skeleton | "Cho cham" filter: existing empty-state component | Inline error banner + retry; `network-error` failure |
| INT-E11.5-002 Briefing detail | Header + metadata row skeleton (existing) | n/a — 404 = error, not empty | `not-found` → toast + back-to-list |
| INT-E11.5-003 Questions | Question-card skeleton (existing) | 0 questions → error state (exam misconfiguration) | `after-deadline`, `max-attempts-exceeded`, `network-error` |
| INT-E11.5-004 Submit | Full-screen submit overlay (existing) | n/a (action) | Per-essay validation (`EXAM_ESSAY_TOO_LONG`), deadline, duplicate-submit |
| INT-E11.5-005 Result | Score-hero skeleton (existing) | n/a — pending-essay IS a valid result state, not empty | `not-found`, `EXAM_RESULT_NOT_READY`, `network-error` |

**Pending-essay is not an empty state.** When `result.status === 'submitted_pending_essay'`, the result screen renders the partial-result variant (score hero + warning banner + stats row with essay pending cell). This is a distinct success state, not an error or empty state.

---

## 7. Auth and Security

| Endpoint | Protected | Role | Token | PII fields |
|---|---|---|---|---|
| GET /lms/api/v1/exams | Yes | `student` | Bearer (httpOnly cookie) | `teacherName` (minor PII) |
| GET /lms/api/v1/exams/:id | Yes | `student` | Bearer | `teacherName` |
| GET /lms/api/v1/exams/:id/questions | Yes | `student` | Bearer | None |
| POST /lms/api/v1/exams/:id/submit | Yes | `student` | Bearer | `textAnswer` (student's written response — treat as confidential student data) |
| GET /lms/api/v1/exams/:id/result | Yes | `student` | Bearer | `mcqScore`, `score` (academic records), `textAnswer` in review |

`textAnswer` on the submit payload and the result `questionResults[].textAnswer` field constitutes student academic data. It must not be logged client-side, must not be stored in browser localStorage, and is only transmitted over HTTPS to the backend. Server-side token flow is unchanged from E11.1 (decision 0018 hybrid).

---

## 8. Open Questions

1. **[OPEN QUESTION]** `selectedOption` integer vs `selectedOptionId` string: The existing `SubmitExamDto` in `exam-response.dto.ts` uses `selectedOptionId: string | null` (e.g. `"A"`, `"B"`). The story design notes use `selectedOption: 0` (0-based integer). These are different wire shapes. The FE team must confirm with the lms team which form the real API will expect before implementing the submit DTO. For mock purposes, either shape works — but the DTO and mapper must be consistent. Flag to `ba-lead` if this needs an ADR.

2. **[OPEN QUESTION]** `EXAM_ESSAY_TOO_LONG` error code: The 422 `EXAM_ESSAY_TOO_LONG` code is assumed here because the story specifies a 2000-char max. This code does not exist in any current `ERROR_CODES.md` for lms (lms is not shipped). The failure union must add this variant: `{ type: 'essay-too-long' }`. `ba-lead` should flag this to the lms team for confirmation when service ships.

3. **[OPEN QUESTION]** `EXAM_RESULT_NOT_READY` error code: If a student navigates to the result route before the submit response returns, or if the backend hasn't processed the submission yet, there may be a transient 404 or a dedicated error code. The failure union may need a `{ type: 'result-not-ready' }` variant with a retry behavior. Confirm with lms team.

4. **[OPEN QUESTION]** `questionTypes` field on exam detail: The integration map proposes `questionTypes: ('mcq' | 'essay')[]` on the exam detail response so the ExamBriefing "Loai bai" row can display "Trac nghiem + Tu luan" without loading all questions. If the backend does not return this field, the briefing must derive the value from `hasEssayQuestions: boolean` alone (less precise but sufficient for the binary MCQ vs mixed decision). Confirm field existence with lms team.

5. **[OPEN QUESTION]** E11.1 question entity `type` field: As confirmed by reading `exam-question.entity.ts`, the existing entity has no `type` discriminant. This is a domain entity extension (not just a DTO delta). The FE team must update the entity, DTO, mapper, mock factory (`buildMockQuestions`), and all usages. The `buildMockQuestions` factory currently always produces MCQ-only questions; it must remain backward-compatible so existing E11.1 tests do not require modification (NFR-E11.5-008). The recommended approach: add `type?: 'mcq' | 'essay'` with default `'mcq'` to the entity, keeping the field optional for backward compatibility, then graduate to required once E11.1 tests are updated.

6. **[OPEN QUESTION]** `score` and `passed` nullability on `ExamResult`: The existing `ExamResult` entity declares `score: number` and `passed: boolean` (non-nullable). For `submitted_pending_essay`, both must be nullable (`score: number | null`, `passed: boolean | null`). This is a breaking change to the entity interface that will require updates to all E11.1 components that read these fields. The FE team must audit usages before changing the type. Flag to `ba-lead` if this requires an ADR for the entity contract change.
