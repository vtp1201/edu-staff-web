# Use Cases — US-E11.5 Mixed Exam Result: submitted_pending_essay Status + Pending-Essay Flow

**Story:** US-E11.5  
**Author:** ba-use-case-modeler  
**Date:** 2026-06-21  
**Depends on:** US-E11.1 (base exam flow — must not regress)  
**Supersedes:** story.md AC-1 through AC-10 (those ACs are subsumed into the numbered AC-E11.5-* set below)

---

## 1. Use Case Scope Summary

| Dimension | Value |
|---|---|
| Total UCs | 8 |
| Primary actor | Student (role-gated; no other role can access these screens) |
| System actor | lms service (mock-first per decision 0014) |
| Screens in scope | ExamList, ExamBriefing, ExamTaking, ExamResult |
| Screens out of scope | Teacher essay grading, parent/principal views, any grade bank write |
| Boundary | Student-facing read + submit path only; no real-time polling; no file upload |

The 8 UCs map to four student journeys across four screens:

- UC-E11.5-001: View pending-essay exam on ExamList (card + filter)
- UC-E11.5-002: View ExamList in loading / empty / error states
- UC-E11.5-003: View mixed-exam briefing before starting
- UC-E11.5-004: Answer essay questions during ExamTaking
- UC-E11.5-005: Submit mixed exam with one or more blank essay answers (advisory warning)
- UC-E11.5-006: View partial result after submission (submitted_pending_essay)
- UC-E11.5-007: View completed result after essay is graded (status transitions to completed)
- UC-E11.5-008: ExamResult loading and error states

---

## 2. Actor Catalogue

| Actor / Role | Type | Capabilities within this story |
|---|---|---|
| Student | Primary human actor | View pending-essay exam card; use "Cho cham" filter; view mixed briefing; type essay answers; submit mixed exam; view partial MCQ score on result; navigate to grade-book deep-link |
| lms service | External system (mock-first) | Returns exam list with `submitted_pending_essay` status; returns exam detail with `hasEssayQuestions`; accepts submit payload with essay text answers; returns result with `mcqScore`, `mcqMax`, `essayMax`, `essayCount`, `questionResults[].textAnswer` |
| Screen reader / AT | Assistive technology (implicit) | Receives live-region announcement of pending-essay banner; navigates essay textarea by label; reads char count via aria-describedby |

**Out-of-scope actors:**
- Teacher: essay grading is a future story; no teacher-side UC here.
- Principal, parent: routes are gated to `student` role only (E11.1 gate unchanged).

---

## 3. Use Case Catalogue

---

### UC-E11.5-001: View Pending-Essay Exam Card on ExamList

**Primary actor:** Student  
**Secondary actor:** lms service  
**Trigger:** Student navigates to `/student/exams` and the exam list includes at least one exam with `status === 'submitted_pending_essay'`  
**Preconditions:**
1. Student is authenticated with `student` role.
2. ExamList screen is rendered with data from `GET /lms/api/v1/exams` (mock: `AVAILABLE_EXAMS` including exam-005).
3. The response contains at least one exam with `status: 'submitted_pending_essay'`, `mcqScore: 6.0`, `mcqMax: 7.0`, `essayCount: 3`.

**Postconditions:**
- The pending-essay exam card is rendered with warning badge, partial-score inline banner, and "Xem ket qua tam thoi" CTA.
- "Da hoan thanh" StatCard includes the count of `submitted_pending_essay` exams.

**Main success scenario:**
1. Student lands on ExamList.
2. System renders exam cards; for exam-005 (`submitted_pending_essay`), a distinct card variant is shown.
3. Card shows: warning status badge (from `exam.status.submittedPendingEssay` i18n key), partial-score inline banner with clock icon showing MCQ score, CTA button labeled from `exam.cta.viewPendingResult` i18n key, card border `--edu-warning/40`.
4. Pass/fail badge is absent from this card.
5. Student clicks "Xem ket qua tam thoi" CTA.
6. System navigates student to ExamResult for exam-005 in `submitted_pending_essay` state (UC-E11.5-006).

**Alternative flows:**
- A1: Student activates "Cho cham" filter chip (label from `exam.filter.pendingEssay` i18n key). Only `submitted_pending_essay` exam cards are shown; all other status cards are hidden. "Da hoan thanh" count remains visible in StatCard.
- A2: Student deactivates "Cho cham" filter. All exam cards are shown again (no filter).
- A3: `mcqScore` is null in the response. Partial-score inline banner shows "--/--" without crashing.

**Exception flows:**
- E1 (`not-found` / 404): Toast error; exam list remains visible without the affected card.
- E2 (`network-error` / 5xx): Inline error banner with retry button appears above the card list.
- E3 (`UNAUTHORIZED` / 401): HTTP interceptor redirects student to login.
- E4 (`FORBIDDEN` / 403): Role error page shown (student gate in E11.1).

**Business rules:**
- BR-001: `submitted_pending_essay` counts toward the "Da hoan thanh" StatCard value alongside `completed` exams (TR-E11.5-005).
- BR-002: Warning badge text and CTA button text use `--edu-warning-foreground` (`#2A3547`) on `--edu-warning-light` background, not white text (NFR-E11.5-003).
- BR-003: Card border color is `--edu-warning/40`; no default `--edu-border` on pending-essay cards (TR-E11.5-004).

**Non-functional constraints:**
- Skeleton appears within 320ms of navigation (NFR-E11.5-005).
- Card layout does not overflow horizontally at 320px viewport width (NFR-E11.5-006).
- All badge and button text from `exam.*` i18n namespace only; no hardcoded Vietnamese strings in .tsx (NFR-E11.5-007).

---

### UC-E11.5-002: ExamList Loading / Empty / Error States

**Primary actor:** Student  
**Trigger:** Student navigates to ExamList; data is pending, absent, or an error occurred.  
**Preconditions:** Student is authenticated with `student` role.  
**Postconditions:** The correct UI state (skeleton / empty state / error banner) is rendered.

**Main success scenario (loading):**
1. Student navigates to `/student/exams`.
2. System renders skeleton card placeholders (existing E11.1 skeleton; no new skeleton shape needed).
3. Within 320ms, skeleton is visible.
4. Data arrives; skeleton is replaced by real exam cards (including pending-essay variant if applicable).

**Alternative flows:**
- A1 (empty — all filter, no exams): No exams in response. Existing `exam.empty.*` empty state is rendered. No skeleton lingers.
- A2 (empty — "Cho cham" filter active, no `submitted_pending_essay` exams): "Cho cham" chip is active but there are no pending-essay exams. Same `exam.empty.*` empty state component renders, indicating no matching exams (TR-E11.5-018).
- A3 (empty — other filter active): Behavior unchanged from E11.1.

**Exception flows:**
- E1 (`network-error` / 5xx, `retryable: true`): Inline error banner with retry button renders in place of cards. Student clicks retry; system re-fetches. Skeleton shows during retry fetch.
- E2 (`unknown`): Generic error toast; list area may be blank.
- E3 (`UNAUTHORIZED` / 401): Redirect to login (interceptor).

**Business rules:**
- BR-004: Skeleton replacement must not cause layout shift (CLS) (NFR-E11.5-005).

---

### UC-E11.5-003: View Mixed-Exam Briefing Before Starting

**Primary actor:** Student  
**Trigger:** Student navigates to ExamBriefing for an exam with `hasEssayQuestions === true`  
**Preconditions:**
1. Student is authenticated.
2. ExamBriefing screen exists from E11.1.
3. Exam entity for the selected exam carries `hasEssayQuestions: true`.
4. Exam entity carries `questionTypes: ['mcq', 'essay']` or `hasEssayQuestions: true` is sufficient to derive the "Trac nghiem + Tu luan" label.

**Postconditions:**
- Three additional UI elements are visible for mixed exam: mixed badge, updated type-row value, essay grading note.
- Pure MCQ exams show none of these elements (E11.1 unchanged).

**Main success scenario:**
1. Student clicks a mixed exam from ExamList or enters briefing URL for exam-005.
2. System renders ExamBriefing with standard elements from E11.1.
3. Because `hasEssayQuestions === true`, three additional elements are rendered:
   a. Mixed badge adjacent to exam header — label from `exam.briefing.mixedType` i18n key; color `--edu-purple` background `--edu-purple/15`.
   b. "Loai bai" metadata row value shows `exam.briefing.mixedTypeValue` i18n key ("Trac nghiem + Tu luan") instead of plain "Trac nghiem".
   c. Essay grading note below the rules list, rendered in `text-muted-foreground` 12px — text from `exam.briefing.essayGradingNote` i18n key. This note is not numbered (not part of the rules list).
4. Student reads briefing and starts exam (navigates to ExamTaking).

**Alternative flows:**
- A1 (pure MCQ exam, `hasEssayQuestions === false`): None of the three mixed-exam elements render. E11.1 briefing behavior is unchanged.
- A2 (`hasEssayQuestions` absent from entity): Treated as `false` (safe default). No mixed indicator shown (TR-E11.5-007).

**Exception flows:**
- E1 (`EXAM_NOT_FOUND` / 404): Toast error + navigate back to list (E11.1 behavior).
- E2 (`network-error` / 5xx): Inline error state per existing `exam.errors.*` i18n keys.

**Business rules:**
- BR-005: Essay grading note is supplementary, not a rule — it must not appear inside the numbered rules list.
- BR-006: Mixed badge color is `--edu-purple` (`#7B5EA7`); this is the existing purple role-color token, not a new token (NFR-E11.5-009).

---

### UC-E11.5-004: Answer Essay Questions During ExamTaking

**Primary actor:** Student  
**Trigger:** ExamTaking renders a question where `question.type === 'essay'`  
**Preconditions:**
1. Student has started an exam with mixed question types.
2. ExamTaking screen exists from E11.1.
3. Questions loaded from `GET /lms/api/v1/exams/:id/questions`; at least one has `type: 'essay'` and `options: []`.

**Postconditions:**
- Student's essay text is recorded in the answer state for the question.
- Essay question is counted as "answered" in the progress counter when `textAnswer.trim().length > 0`.
- Answer is included in the submit payload as `{ questionId, type: 'essay', textAnswer: string }`.

**Main success scenario:**
1. Student navigates to an essay question via the question navigator or sequential navigation.
2. System renders a `<textarea>` (no A/B/C/D option buttons) with placeholder text from `exam.taking.essayPlaceholder` i18n key.
3. Character count display reads "0/2000 ky tu" (from `exam.taking.essayCharCount` i18n key with `count: 0`).
4. Student types a free-text answer.
5. Character count updates on every keystroke.
6. When character count reaches 2000, no additional characters are accepted (maxlength enforcement).
7. Once the textarea contains at least one non-whitespace character, the question is marked as answered in the progress counter.
8. Essay question button in the navigator grid shows a `fileText` icon (Lucide, 10px) to distinguish it from MCQ questions.
9. Student navigates to other questions or returns to essay question; previously typed text is preserved in state.

**Alternative flows:**
- A1 (character count reaches 1900): Char count display color changes to `--edu-warning` (from default `text-muted-foreground`); input is still accepted until 2000. Student is aware they are near the limit.
- A2 (student clears textarea): Character count returns to 0; question is marked as unanswered in the progress counter.
- A3 (student types only whitespace): `textAnswer.trim().length === 0`; question is NOT counted as answered. Raw whitespace value is preserved in state and included in submit payload.
- A4 (navigator icon render failure): Navigator falls back to numeral-only display; no crash (TR-E11.5-010).

**Exception flows:**
- E1 (`EXAM_NOT_FOUND` / 404 on questions load): Navigate back to exam list; toast error.
- E2 (`EXAM_AFTER_DEADLINE` / 400 or 403): Banner "Bài thi đã hết hạn"; CTA back to list.
- E3 (`EXAM_MAX_ATTEMPTS` / 403): Banner "Da nop toi da so lan"; CTA to result.
- E4 (`network-error` on questions load): Inline error with retry (existing E11.1 behavior).

**Business rules:**
- BR-007: Essay textarea has `maxlength="2000"` (or equivalent) — characters beyond 2000 are not accepted. This is enforced client-side; backend may also validate (TR-E11.5-008).
- BR-008: "Answered" for essay = `textAnswer.trim().length > 0`. Leading/trailing whitespace alone does not qualify as an answer for progress tracking, but the raw value (including whitespace) is sent to the backend.
- BR-009: Essay questions show `fileText` icon in navigator; MCQ questions continue to show question numerals as per E11.1 (TR-E11.5-010).

**Non-functional constraints:**
- Essay `<textarea>` has a programmatic `<label>` or `aria-label` linking it to the question text (NFR-E11.5-002, WCAG 2.1 AA SC 1.3.1 and 3.3.2).
- Char count element has `aria-describedby` pointing to the textarea ID (NFR-E11.5-002).
- Essay navigator button has `aria-label` that includes the question number and indicates essay type (NFR-E11.5-004, WCAG 2.1 AA SC 4.1.2).
- All string references use `exam.taking.*` i18n keys (NFR-E11.5-007).

---

### UC-E11.5-005: Submit Mixed Exam with Empty Essay Warning

**Primary actor:** Student  
**Trigger:** Student opens the submit confirmation modal when at least one essay question has an empty answer  
**Preconditions:**
1. Student is in ExamTaking for a mixed exam.
2. Submit modal exists from E11.1.
3. At least one essay question has `textAnswer.trim().length === 0`.

**Postconditions:**
- Student sees an advisory warning in the submit modal about blank essay answers.
- Student can still confirm submission; blank essays are submitted as empty strings.
- After successful submission, system navigates to ExamResult in `submitted_pending_essay` state.

**Main success scenario:**
1. Student clicks the submit button (having left at least one essay blank).
2. System opens the submit confirmation modal (from E11.1).
3. System detects one or more essay questions with empty text answers.
4. Inside the modal, an inline warning is shown — text from `exam.taking.essayEmptyWarning` i18n key; rendered in `text-edu-warning` color on `bg-edu-warning-light` background.
5. Student reads the warning and confirms submission.
6. System sends `POST /lms/api/v1/exams/:id/submit` with the extended payload — MCQ answers and essay answers (empty strings for blank essays).
7. System receives submit response with `status: 'submitted_pending_essay'`.
8. System navigates to ExamResult; UC-E11.5-006 begins.

**Alternative flows:**
- A1 (all essay questions answered): Student opens submit modal with all essays non-empty. Warning does NOT appear in the modal. Student confirms. Flow continues from step 6.
- A2 (student cancels modal): Modal closes; student returns to exam. Essay text is preserved in state.
- A3 (student submits, then backend returns `status: 'completed'`): This occurs only for pure MCQ exams where the lms service has resolved all questions instantly. System navigates to ExamResult in `completed` state (UC-E11.5-007).

**Exception flows:**
- E1 (`EXAM_AFTER_DEADLINE` / 400): Modal shows "Da het thoi gian nop bai"; close returns student to list.
- E2 (`EXAM_ALREADY_SUBMITTED` / 409): Modal shows "Ban da nop bai nay roi"; CTA to result.
- E3 (`EXAM_MAX_ATTEMPTS` / 403): Modal shows "Da nop toi da so lan".
- E4 (`EXAM_ESSAY_TOO_LONG` / 422): Inline field error on essay textarea in the taking screen — text exceeds limit; student must shorten before resubmitting. Warning does not appear inside the modal for this error; the error surfaces back on the taking screen.
- E5 (`network-error` / 5xx, `retryable: true`): Toast error; exam state is preserved in memory so student can retry without losing answers.
- E6 (`UNAUTHORIZED` / 401): Interceptor redirects to login.

**Business rules:**
- BR-010: Blank essay submission is explicitly allowed — an empty string `""` is a valid `textAnswer`. The warning is advisory, not blocking (TR-E11.5-009).
- BR-011: The warning appears only when at least one essay question is empty. If all essays are answered, the warning must NOT appear (TR-E11.5-009).
- BR-012: Essay text is treated as confidential student data — it must not be logged client-side, must not be stored in localStorage, transmitted only over HTTPS (integration.md §7).

---

### UC-E11.5-006: View Partial Result — submitted_pending_essay State

**Primary actor:** Student  
**Secondary actor:** lms service  
**Trigger:** Student navigates to ExamResult for a mixed exam with `result.status === 'submitted_pending_essay'` (immediately after submission or by revisiting the result URL)  
**Preconditions:**
1. `GET /lms/api/v1/exams/:id/result` (mock: `MOCK_PENDING_ESSAY_RESULT`) returns `status: 'submitted_pending_essay'`, `mcqScore: 6.0`, `mcqMax: 7.0`, `essayMax: 3.0`, `essayCount: 3`.
2. `isResultFinal(result)` returns `false` because `result.status !== 'completed'`.
3. ExamResult screen exists from E11.1.

**Postconditions:**
- Student sees the pending-essay result variant: MCQ partial score, no total score, no pass/fail badge, pending-essay banner, essay stats cell, essay labels in question review.
- Student can navigate to grade-book deep-link.

**Main success scenario:**
1. ExamResult screen loads result data.
2. Because `isResultFinal(result) === false` (status is `submitted_pending_essay`), the pending-essay variant is rendered:
   a. **Score hero**: Circle displays `mcqScore` (e.g. "6.0") with `/{mcqMax}` and label from `exam.result.mcqLabel` ("TN"); hero gradient color is `--edu-warning`. Total score ("--/10" format) is NOT shown.
   b. **Status badge**: Displays text from `exam.result.partialResultBadge` i18n key ("CHUA CO DIEM TONG"). Pass/fail badge (present in E11.1) is hidden.
   c. **Pending-essay banner**: Rendered between score hero and grade-book button. Background `bg-edu-warning-light`, border `border-edu-warning/40` (1px). Clock icon (Lucide `clock`, 18px, `text-edu-warning`) in a 38x38 icon box (`bg-edu-warning/22`, radius 10px). Title from `exam.result.pendingEssayTitle`. Body from `exam.result.pendingEssayBody` with interpolated `{mcqScore}`, `{mcqMax}`, `{essayMax}`.
   d. **Stats row**: MCQ correct / incorrect / skipped cells (E11.1 unchanged) + fourth essay cell showing `essayCount` with label from `exam.result.essayPending` i18n key in `--edu-warning` color.
   e. **Question review — essay items**: Essay questions show student's submitted `textAnswer` (read-only); label from `exam.result.essayQuestionLabel` ("Cau tu luan -- Cho cham") instead of correct/incorrect badge; no A/B/C/D option rows.
   f. **Question review — MCQ items**: Rendered exactly as per E11.1 (correct / incorrect / skipped markers).
   g. **Grade-book deep-link button**: "Xem diem trong bang diem" with `award` Lucide icon; navigates to `/student/grades`.
3. Pending-essay banner is announced to screen readers on mount via `role="alert"` and `aria-live="assertive"`.
4. Student reads result and optionally navigates to grade-book.

**Alternative flows:**
- A1 (`mcqScore` is null): Score circle shows "--" without crashing (TR-E11.5-011).
- A2 (`essayMax` is null): Banner body interpolation shows "--" for `{essayMax}` placeholder (TR-E11.5-012).
- A3 (`essayCount` is 0 or null): Essay stats cell is hidden (TR-E11.5-013).
- A4 (student submitted no essay text for an essay question): Question review shows a placeholder (empty-answer indicator) rather than a blank space for that question (TR-E11.5-014).
- A5 (student clicks grade-book deep-link): Student navigates to `/student/grades`; ExamResult unmounts. If grades route is unavailable, navigation fails silently — no crash on ExamResult (TR-E11.5-016).

**Exception flows:**
- E1 (`EXAM_NOT_FOUND` / 404): Inline error: "Khong tim thay ket qua"; CTA back to list.
- E2 (`EXAM_RESULT_NOT_READY` — transient 404 or custom code): Inline state indicating result is not yet available; retry or "come back later" message. This is a retryable state (INT-E11.5-005).
- E3 (`network-error` / 5xx): Inline error with retry button (see UC-E11.5-008).
- E4 (`UNAUTHORIZED` / 401): Redirect to login.
- E5 (`FORBIDDEN` / 403): Error page — student owns this result only.

**Business rules:**
- BR-013: `isResultFinal(result)` must return `true` only when `result.status === 'completed'`. The presentation renders pass/fail badge and total score only when `isResultFinal()` is `true` (ADR-0048).
- BR-014: `ExamResult.score` and `.passed` are typed as `number | null` and `boolean | null`. The presentation must not render these fields without guarding against null (ADR-0048).
- BR-015: Warning badge ("CHUA CO DIEM TONG") uses `--edu-warning-foreground` text color on `--edu-warning-light` background, not white (NFR-E11.5-003).
- BR-016: Pending-essay banner carries `role="alert"` and `aria-live="assertive"` — no screen reader user must navigate to it manually to hear the message (NFR-E11.5-001, WCAG 2.1 AA SC 4.1.3).

**Non-functional constraints:**
- Banner icon and text stack vertically on 320px viewport (NFR-E11.5-006).
- Score hero renders without horizontal overflow at 320px (NFR-E11.5-006).
- All strings from `exam.*` i18n namespace; no hardcoded Vietnamese in .tsx (NFR-E11.5-007).
- No raw color values in component — only semantic design tokens (NFR-E11.5-009).

---

### UC-E11.5-007: View Completed Result After Essay Is Graded

**Primary actor:** Student  
**Trigger:** Student navigates to ExamResult for a mixed exam whose essay has been graded — `result.status === 'completed'`  
**Preconditions:**
1. `GET /lms/api/v1/exams/:id/result` returns `status: 'completed'` (essay has been graded by teacher out-of-band).
2. `isResultFinal(result)` returns `true`.
3. ExamResult screen exists from E11.1.

**Postconditions:**
- Standard E11.1 ExamResult view is rendered: total score, pass/fail badge, score-based gradient, full stats row. No pending-essay overlay elements are visible.

**Main success scenario:**
1. Student navigates to ExamResult for the previously pending-essay exam.
2. System calls `GET /lms/api/v1/exams/:id/result`; response has `status: 'completed'`.
3. `isResultFinal(result) === true`.
4. System renders standard E11.1 ExamResult:
   - Score hero with total score and score-based gradient color.
   - Pass/fail badge (pass or fail per `result.passed`).
   - Standard stats row (correct / incorrect / skipped — three cells; no essay cell).
   - Question review with MCQ correct/incorrect/skipped markers for all questions.
   - No pending-essay banner.
   - No partial-result badge.
   - Grade-book deep-link button remains present.
5. Student sees final grade and pass/fail status.

**Alternative flows:**
- A1 (exam originally had essay questions, now completed): Mixed-exam elements (pending-essay banner, essay stats cell, essay question labels) are all absent. Pure E11.1 rendering applies.

**Exception flows:**
- E1: Same error handling as UC-E11.5-008.

**Business rules:**
- BR-017: When `result.status === 'completed'`, ALL E11.5 overlay elements MUST be absent — the pending-essay banner, partial-result badge, essay stats cell, essay question labels. E11.1 behavior is fully restored (TR-E11.5-015, NFR-E11.5-008).
- BR-018: The `completed` branch must not regress any E11.1 test — all existing Vitest and Storybook play() assertions for the result screen must continue to pass.

---

### UC-E11.5-008: ExamResult Loading and Error States

**Primary actor:** Student  
**Trigger:** Student navigates to ExamResult; data is pending or an error occurred.  
**Preconditions:** Student is authenticated. ExamResult URL is valid for the exam ID.

**Main success scenario (loading):**
1. Student navigates to ExamResult.
2. System renders score-hero skeleton (card-sized, existing from E11.1 extended for new fields).
3. Within 320ms, skeleton is visible.
4. Data arrives; skeleton replaced by real result content — either pending-essay variant (UC-E11.5-006) or completed variant (UC-E11.5-007).

**Alternative flows:**
- A1 (result not yet ready — `EXAM_RESULT_NOT_READY` or transient 404): Inline state showing result is not yet available; retry button or "come back later" message. This differs from a permanent error. The state is retryable (INT-E11.5-005).
- A2 (`EXAM_NOT_FOUND` / 404 permanent): Inline error: "Khong tim thay ket qua"; CTA back to exam list. Not retryable.

**Exception flows:**
- E1 (`network-error` / 5xx, `retryable: true`): Inline error banner with retry button.
- E2 (`UNAUTHORIZED` / 401): Redirect to login (interceptor).
- E3 (`FORBIDDEN` / 403): Error page — student does not own this result.
- E4 (`unknown`): Generic toast error.

**Business rules:**
- BR-019: Skeleton replacement must not cause layout shift (CLS) on the score-hero area (NFR-E11.5-005).
- BR-020: "Pending-essay" is NOT an empty state. When `result.status === 'submitted_pending_essay'`, the result screen renders the partial-result variant (success state), not an empty or error state (INT-E11.5-005, Section 6).

---

## 4. Acceptance Criteria

Format: Given/When/Then. Each AC references the TR/NFR/INT it satisfies. The numbering AC-E11.5-001 through AC-E11.5-055 supersedes story.md AC-1 through AC-10.

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
Then no pass/fail badge (neither "Dat" nor "Khong dat" nor any pass/fail indicator) is present on that card.

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
When the student clicks the "Xem ket qua tam thoi" CTA button,
Then the student is navigated to the ExamResult screen for exam-005 (at `/student/exams/exam-005/result`).

**AC-E11.5-007 — Pending-essay card: card border color**
Satisfies: TR-E11.5-004, NFR-E11.5-009
Given the pending-essay exam card is rendered,
When the card is inspected,
Then the card border uses `border-edu-warning/40` (not the default `border-border`) and no raw hex color is used.

**AC-E11.5-008 — Completed count includes submitted_pending_essay**
Satisfies: TR-E11.5-005
Given the exam list contains 2 exams with `status: 'completed'` and 1 exam with `status: 'submitted_pending_essay'`,
When the "Da hoan thanh" StatCard is rendered,
Then its value is 3 (not 2).

**AC-E11.5-009 — "Cho cham" filter chip: label**
Satisfies: TR-E11.5-006
Given the student is on ExamList,
When the filter chip row renders,
Then a filter chip is present whose label resolves from the `exam.filter.pendingEssay` i18n key.

**AC-E11.5-010 — "Cho cham" filter chip: filters to pending-essay only**
Satisfies: TR-E11.5-006, story.md AC-1
Given the exam list contains exams of various statuses,
When the student activates the "Cho cham" filter chip,
Then only exam cards with `status === 'submitted_pending_essay'` are visible; all other status cards are hidden.

**AC-E11.5-011 — "Cho cham" filter chip: empty state when no pending exams**
Satisfies: TR-E11.5-018
Given the "Cho cham" filter chip is active and no exams have `status === 'submitted_pending_essay'`,
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
When the "Loai bai" (exam type) metadata row renders,
Then its value resolves from `exam.briefing.mixedTypeValue` i18n key ("Trac nghiem + Tu luan") instead of the MCQ-only value.

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
Then it displays "0/2000 ky tu" (from `exam.taking.essayCharCount` with `count: 0`).

**AC-E11.5-023 — Taking: character count updates on keystroke**
Satisfies: TR-E11.5-008
Given the student is typing in the essay textarea,
When the student types 50 characters,
Then the character count element displays "50/2000 ky tu" (or equivalent via `exam.taking.essayCharCount` key with `count: 50`).

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
Then it includes the question number and indicates that the question is an essay type (e.g. "Cau 25 - tu luan" or equivalent from the i18n key); the button is not icon-only without an accessible name.

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
Then no pass/fail badge (neither "Dat" nor "Khong dat") is present.

**AC-E11.5-038 — Result (pending): partial-result badge shown**
Satisfies: TR-E11.5-011, NFR-E11.5-003
Given `result.status === 'submitted_pending_essay'`,
When the result screen renders,
Then a badge is shown whose text resolves from `exam.result.partialResultBadge` i18n key ("CHUA CO DIEM TONG"); its text color is `text-edu-warning-foreground` (not white) and background is `bg-edu-warning-light`.

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
Then the row shows a label whose text resolves from `exam.result.essayQuestionLabel` i18n key ("Cau tu luan -- Cho cham") instead of a correct/incorrect/skipped badge; no A/B/C/D option rows are shown for essay questions.

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
Then a "Xem diem trong bang diem" button is present with a Lucide `award` icon; clicking it navigates the student to `/student/grades`.

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

## 5. Edge Case Matrix

| Feature | Empty | Max-Length | Concurrent | Auth Expired | Network Error | Wrong Role |
|---|---|---|---|---|---|---|
| ExamList pending-essay card | mcqScore null → "--/--" on inline banner (AC-E11.5-004) | n/a | n/a | 401 → redirect to login (E3 UC-001) | Inline error + retry (E2 UC-001) | 403 → role error page (E4 UC-001) |
| "Cho cham" filter | No pending exams → empty state (AC-E11.5-011) | n/a | Filter state is local; no concurrency issue | 401 → redirect | Network error on list fetch (AC-E11.5-014) | 403 → role error page |
| ExamBriefing mixed indicator | hasEssayQuestions absent → treated as false (AC-E11.5-019) | n/a | n/a | 401 → redirect | Existing `exam.errors.*` error state (E2 UC-003) | 403 → role error page |
| Essay textarea input | Empty textarea → not counted as answered; blank essay submittable (BR-010) | 2000 chars → input blocked at maxlength (AC-E11.5-024) | Concurrent keystrokes → debounced char count; state persisted | 401 → redirect (interceptor) | Submit network error → toast + exam state retained (AC-E11.5-035) | 403 → role error page on ExamTaking route |
| Essay char count color | 0 chars → muted-foreground (AC-E11.5-025) | At 1900+ chars → edu-warning color (AC-E11.5-025) | n/a | n/a | n/a | n/a |
| Submit empty essay warning | All essays answered → no warning (AC-E11.5-033) | n/a | Two rapid submits → EXAM_ALREADY_SUBMITTED 409 → modal "Ban da nop bai nay roi" (E2 UC-005) | EXAM_AFTER_DEADLINE if auth gap is large | EXAM_ESSAY_TOO_LONG 422 → inline field error (E4 UC-005) | Non-student cannot reach ExamTaking |
| Result score hero (pending) | mcqScore null → "--" (AC-E11.5-039) | n/a | n/a | 401 → redirect | Network error + retry (AC-E11.5-053) | 403 → error page (E5 UC-006) |
| Pending-essay banner | essayMax null → "--" interpolated (AC-E11.5-041) | n/a | n/a | 401 → redirect | n/a (banner renders from already-loaded data) | Non-student cannot reach ExamResult |
| Essay stats cell | essayCount 0/null → cell hidden (AC-E11.5-044) | n/a | n/a | n/a | n/a | n/a |
| Essay review (blank answer) | Empty textAnswer → placeholder indicator (AC-E11.5-047) | n/a | n/a | n/a | n/a | n/a |
| Completed transition | status completed → all E11.5 overlays absent (AC-E11.5-050) | n/a | n/a | 401 → redirect | Network error + retry (AC-E11.5-053) | 403 → error page |
| Grade-book deep-link | Route unavailable → silent fail on ExamResult, no crash (A5 UC-006) | n/a | n/a | 401 → redirect | n/a (local navigation) | Non-student cannot reach link |
| isResultFinal guard | result.score null → guard must not crash; presentation hides total score (BR-014) | n/a | n/a | n/a | n/a | n/a |
| E11.1 regression | Pure MCQ exams → zero E11.5 elements rendered (AC-E11.5-018, AC-E11.5-050) | n/a | n/a | n/a | n/a | n/a |

---

## 6. Open Questions

The following open questions from `requirements.md` §9 and `integration.md` §8 require `ba-lead` decision or lms team confirmation before the FE team can finalize implementation. None of these block writing the AC above; they are flagged as assumptions until resolved.

**[OPEN QUESTION OQ-1]** — `selectedOption` integer vs `selectedOptionId` string (INT-E11.5-004, Open Question 1): The existing E11.1 `SubmitExamDto` uses `selectedOptionId: string | null` (e.g. "A", "B"). The story design notes use `selectedOption: number` (0-based). These are different wire shapes. The mapper and DTO must be consistent; mock-first allows either shape for now, but this must be resolved before real lms integration. Flag to `ba-lead` if an ADR is warranted.

**[OPEN QUESTION OQ-2]** — `EXAM_ESSAY_TOO_LONG` error code (INT-E11.5-004, Open Question 2): This 422 error code is assumed because the story specifies a 2000-char max. It does not exist in any current lms `ERROR_CODES.md`. The failure union needs a `{ type: 'essay-too-long' }` variant. Confirm with lms team when service ships; flag to `ba-lead`.

**[OPEN QUESTION OQ-3]** — `EXAM_RESULT_NOT_READY` error code (INT-E11.5-005, Open Question 3): If the backend has not finished processing a submission when the client fetches the result, a transient 404 or dedicated code may apply. The failure union may need a `{ type: 'result-not-ready' }` variant with retry behavior. Confirm with lms team.

**[OPEN QUESTION OQ-4]** — `questionTypes` field on exam detail (INT-E11.5-002, Open Question 4): The integration map proposes `questionTypes: ('mcq' | 'essay')[]` on the exam detail response for the briefing "Loai bai" row. If the backend does not return this field, the briefing derives the value from `hasEssayQuestions: boolean` alone (binary decision: MCQ vs mixed). Confirm with lms team.

**[OPEN QUESTION OQ-5]** — E11.1 question entity `type` field (INT-E11.5-003, Open Question 5): The existing `ExamQuestion` entity has no `type` discriminant. Introducing `type: 'mcq' | 'essay'` (optional, default `'mcq'`) is a domain entity change that touches the mapper, DTO, mock factory, and all four ViewModels. The FE team must confirm no E11.1 test breaks after this change (NFR-E11.5-008). Flag to `ba-lead` if this introduces a scope risk.

**[OPEN QUESTION OQ-6]** — `score` and `passed` nullability on ExamResult entity (INT-E11.5-005, Open Question 6): The existing `ExamResult` entity declares `score: number` and `passed: boolean` as non-nullable. For `submitted_pending_essay`, both must become `number | null` and `boolean | null`. This is a breaking change to the entity interface. The FE team must audit all E11.1 usages of these fields before changing the type signature. ADR-0048 already documents the `isResultFinal()` guard and the nullable intent. Flag to `ba-lead` if any E11.1 component reads `score` or `passed` without a null guard — those components must be patched under NFR-E11.5-008 (no regression).

**[OPEN QUESTION OQ-7]** — Stats row layout at 375px with four cells (requirements.md §9, Open Question 2): A four-cell stats row (MCQ correct / incorrect / skipped + essay pending) may not fit at 375px without a layout change. Should the row use a 2x2 grid, a scrollable row, or should the essay cell replace the "Skipped" cell in the pending-essay state? This is a design decision; flag to `ba-lead` to route to `uiux-lead` if the FE team raises it.
