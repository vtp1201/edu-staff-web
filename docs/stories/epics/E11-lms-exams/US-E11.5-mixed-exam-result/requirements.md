# TR-E11.5 — Mixed Exam Result: submitted_pending_essay Status + Pending-Essay Flow

**Story:** US-E11.5  
**Status:** Draft  
**Parent epic:** E11 LMS Exams  
**Depends on:** US-E11.1 (base exam flow — must not regress)

---

## 1. Requirements Summary

US-E11.5 extends the already-implemented E11.1 exam flow to handle mixed-format exams that combine MCQ and essay questions. A new `ExamStatus` value — `submitted_pending_essay` — signals that MCQ auto-grading is complete but the essay section is still awaiting teacher review. Four existing screens are affected (ExamList, ExamBriefing, ExamTaking, ExamResult); each receives a targeted, additive delta. The feature is student-only (RBAC gate), mock-first against the `lms` service, and reuses all 14 existing `exam.*` i18n keys without regenerating them.

---

## 2. Actors / Roles

| Role | Access | Capabilities within this story |
|---|---|---|
| `student` | `(app)/student/exams/**` | View pending-essay card and filter; view mixed-exam briefing note; answer essay textarea during taking; view partial MCQ score on result screen; navigate to grade-book deep-link |
| `teacher` | n/a | Out of scope for this story (essay grading is a future teacher-side story) |
| `principal` | n/a | Out of scope |
| `parent` | n/a | Out of scope |

---

## 3. Technical Requirements

### TR-E11.5-001 — ExamStatus domain extension

**Priority:** Must  
**Category:** Functional  

The system SHALL extend the `ExamStatus` union type in `src/features/exam/domain/entities/` to include the value `submitted_pending_essay` alongside the existing values `available`, `completed`, and `expired`. All switch/discriminated-union exhaustiveness checks on `ExamStatus` SHALL be updated so the compiler catches unhandled branches at build time.

| Attribute | Detail |
|---|---|
| Trigger | Engineer opens the exam entity file to begin US-E11.5 implementation |
| Preconditions | US-E11.1 domain entity exists; `ExamStatus` is a string union |
| Postconditions | `submitted_pending_essay` is a valid, type-safe `ExamStatus` value; `tsc --noEmit` passes with zero errors |
| Error conditions | If the enum extension breaks existing E11.1 type-guards, build fails — must be resolved before proceeding |

---

### TR-E11.5-002 — MCQ-only partial score calculation

**Priority:** Must  
**Category:** Functional  

The system SHALL expose a pure domain function `calculatePartialScore(questions, answers)` that operates exclusively on MCQ-type questions (skipping questions where `type === 'essay'`). The function SHALL return `{ mcqCorrect, mcqTotal, mcqScore }` without touching essay entries. The existing `calculateScore()` used by E11.1 SHALL remain unchanged.

| Attribute | Detail |
|---|---|
| Trigger | Exam result mapper receives a response with `status === 'submitted_pending_essay'` |
| Preconditions | Question entity has a `type` discriminant (`'mcq' \| 'essay'`) |
| Postconditions | MCQ score is computed correctly; essay questions are counted but not scored |
| Error conditions | If `questions` is empty, return `{ mcqCorrect: 0, mcqTotal: 0, mcqScore: 0 }` without throwing |

---

### TR-E11.5-003 — Exam result mapper: submitted_pending_essay branch

**Priority:** Must  
**Category:** Functional  

The system SHALL extend `getExamResult` response mapper to handle a `submitted_pending_essay` branch. When the response `status` equals `submitted_pending_essay`, the mapper SHALL populate:

- `mcqScore` — the auto-graded MCQ score (numeric)
- `mcqMax` — the total points attributable to MCQ questions
- `essayMax` — the total points attributable to essay questions
- `essayCount` — the number of essay questions in the exam
- `status: 'submitted_pending_essay'`

The mapper SHALL NOT compute a `totalScore` or `passing` field in this branch.

| Attribute | Detail |
|---|---|
| Trigger | `GET /lms/api/v1/exams/:id/result` mock returns `submitted_pending_essay` payload |
| Preconditions | Mock result fixture exists with `mcqScore`, `mcqMax`, `essayMax`, `essayCount` fields |
| Postconditions | ViewModel exposes all five fields; `totalScore` and `passing` fields are absent or `null` |
| Error conditions | Missing `mcqScore` in payload → mapper logs a warning and falls back to `null`; UI renders `--` |

---

### TR-E11.5-004 — ExamList: submitted_pending_essay card variant

**Priority:** Must  
**Category:** Functional  

The system SHALL render a distinct card variant for exams whose `status === 'submitted_pending_essay'` on the ExamList screen (`/student/exams`).

Required card elements:

1. **Status badge** — label from `exam.status.submittedPendingEssay` i18n key; color `--edu-warning`; background `--edu-warning/15`.
2. **Partial-score inline banner** — below the description; shows `mcqScore/mcqMax` with clock icon (`--edu-warning` color); text confirms MCQ auto-graded and essay count pending; uses `--edu-warning-light` background.
3. **CTA button** — label from `exam.cta.viewPendingResult` i18n key; color scheme `--edu-warning-light` background, `--edu-warning` text/border; triggers navigation to ExamResult for this exam.
4. **Card border** — `--edu-warning/40` instead of the default `--edu-border`.
5. No pass/fail indicator is shown on this card variant.

| Attribute | Detail |
|---|---|
| Trigger | ExamList data includes at least one exam with `status === 'submitted_pending_essay'` |
| Preconditions | ExamList screen is rendered for a `student` role; mock data includes exam id=5 fixture |
| Postconditions | Card renders without the pass/fail badge; CTA navigates to ExamResult in pending-essay mode |
| Error conditions | If `mcqScore` is absent from the exam data, the partial-score banner shows `--/--` without crashing |

---

### TR-E11.5-005 — ExamList: stats row count includes submitted_pending_essay

**Priority:** Should  
**Category:** Functional  

The system SHALL count exams with `status === 'submitted_pending_essay'` within the "Da hoan thanh" (Completed) StatCard on the ExamList summary row — consistent with the product contract that this status represents a completed submission awaiting grading.

| Attribute | Detail |
|---|---|
| Trigger | ExamList data contains both `completed` and `submitted_pending_essay` exams |
| Postconditions | StatCard value = count of `completed` + count of `submitted_pending_essay` |
| Error conditions | None specific — standard loading/empty/error states apply |

---

### TR-E11.5-006 — ExamList: filter chip "Cho cham"

**Priority:** Must  
**Category:** Functional  

The system SHALL render a filter chip for `submitted_pending_essay` status on ExamList using the label from `exam.filter.pendingEssay` i18n key. When active, the chip filters the exam card list to show only `submitted_pending_essay` exams.

| Attribute | Detail |
|---|---|
| Trigger | Student activates the "Cho cham" filter chip |
| Preconditions | Filter chip set already includes all, available, completed, expired per E11.1 |
| Postconditions | Only `submitted_pending_essay` cards are visible; all other cards are hidden |
| Error conditions | If no pending-essay exams exist, render the empty state defined in TR-E11.5-018 |

---

### TR-E11.5-007 — ExamBriefing: mixed-exam indicator

**Priority:** Must  
**Category:** Functional  

The system SHALL render additional UI elements on the ExamBriefing screen when `exam.hasEssayQuestions === true`:

1. **Mixed badge** — label from `exam.briefing.mixedType` i18n key; color `--edu-purple` (`#7B5EA7`); positioned adjacent to the exam header/subject badge.
2. **Type row value** — the "Loai bai" metadata cell displays value from `exam.briefing.mixedTypeValue` i18n key ("Trac nghiem + Tu luan") instead of the plain "Trac nghiem" value.
3. **Essay grading note** — a supplementary line below the rules list; text from `exam.briefing.essayGradingNote` i18n key; rendered in `text-muted-foreground` at 12px; not inside the rules list (not numbered).

When `exam.hasEssayQuestions === false` (pure MCQ exam), none of these elements are shown and E11.1 briefing behavior is unchanged.

| Attribute | Detail |
|---|---|
| Trigger | Student navigates to ExamBriefing for an exam with `hasEssayQuestions === true` |
| Preconditions | ExamBriefing screen exists from US-E11.1; exam entity carries `hasEssayQuestions: boolean` |
| Postconditions | Three additional elements visible; pure-MCQ exams show no change |
| Error conditions | If `hasEssayQuestions` is absent from the entity, treat as `false` (safe default) |

---

### TR-E11.5-008 — ExamTaking: essay question textarea input

**Priority:** Must  
**Category:** Functional  

The system SHALL render a `<textarea>` input instead of A/B/C/D option buttons when the current question has `type === 'essay'`. Required behavior:

1. Placeholder text from `exam.taking.essayPlaceholder` i18n key.
2. Maximum character limit: 2000 characters.
3. Character count display below the textarea: format from `exam.taking.essayCharCount` i18n key (`{count}/2000 ky tu`); updated on every keystroke.
4. The answer value (textarea string) is included in the submit payload under the question's `id` key alongside MCQ answers.
5. The question is counted as "answered" in the progress counter once the textarea contains at least one non-whitespace character.

| Attribute | Detail |
|---|---|
| Trigger | ExamTaking renders a question where `question.type === 'essay'` |
| Preconditions | ExamTaking screen exists from US-E11.1; question entity carries `type: 'mcq' \| 'essay'` |
| Postconditions | Student can type a free-text answer; char count updates live; answer included in submit payload |
| Error conditions | Characters beyond 2000 are not accepted (HTML `maxlength` or equivalent); no crash on empty submit (see TR-E11.5-009) |

---

### TR-E11.5-009 — ExamTaking: empty-essay submit warning

**Priority:** Must  
**Category:** Functional  

The system SHALL display an inline warning when the student attempts to submit and one or more essay questions have an empty answer. The warning SHALL:

1. Use text from `exam.taking.essayEmptyWarning` i18n key.
2. Be rendered inside the submit confirmation modal (not blocking submission).
3. Still allow the student to proceed with submission (the warning is advisory, not blocking).

| Attribute | Detail |
|---|---|
| Trigger | Student opens the submit modal; at least one essay question has an empty answer string |
| Preconditions | Submit modal exists from US-E11.1 |
| Postconditions | Warning text is visible in the modal; student can still confirm submission |
| Error conditions | Warning must not appear when all essay questions have non-empty answers |

---

### TR-E11.5-010 — ExamTaking: essay question navigator icon

**Priority:** Must  
**Category:** Functional  

The system SHALL visually differentiate essay questions in the question navigator grid. Essay question buttons SHALL display a `fileText` icon (Lucide, 10px) in addition to — or instead of — the question number, ensuring students can distinguish essay questions from MCQ questions at a glance.

[ASSUMPTION] The icon replaces the number inside the navigator button cell; the question number label is still rendered in the tooltip or accessible name.

| Attribute | Detail |
|---|---|
| Trigger | Navigator renders a question where `question.type === 'essay'` |
| Preconditions | Navigator grid exists from US-E11.1 |
| Postconditions | Essay navigator cells carry the `fileText` icon; MCQ cells show numerals as before |
| Error conditions | Icon render failure must not crash the navigator; fall back to numeral-only |

---

### TR-E11.5-011 — ExamResult: pending-essay score hero

**Priority:** Must  
**Category:** Functional  

The system SHALL render a distinct score hero section when `result.status === 'submitted_pending_essay'`:

1. **Score circle** — displays `mcqScore` (e.g. "6.0") and `/{mcqMax}` on second line with label from `exam.result.mcqLabel` i18n key ("TN"); does NOT show the `/10` total-score format.
2. **Status badge** — displays text from `exam.result.partialResultBadge` i18n key ("CHUA CO DIEM TONG"); NOT the pass/fail badge used in E11.1.
3. **Score gradient** — uses `--edu-warning` as the hero gradient color (not the `scoreColor` derived from pass/fail thresholds).

When `result.status === 'completed'` (essay graded), the system SHALL revert to the standard E11.1 score hero (total score, pass/fail badge, score-based gradient color) without any modification.

| Attribute | Detail |
|---|---|
| Trigger | ExamResult screen receives `result.status === 'submitted_pending_essay'` |
| Preconditions | ExamResult screen exists from US-E11.1; result entity carries `mcqScore`, `mcqMax` |
| Postconditions | Score circle shows MCQ score; badge shows partial-result label; no pass/fail indicator |
| Error conditions | If `mcqScore` is null, circle shows "--" without crashing |

---

### TR-E11.5-012 — ExamResult: pending-essay warning banner

**Priority:** Must  
**Category:** Functional  

The system SHALL render a warning banner on the ExamResult screen when `result.status === 'submitted_pending_essay'`. The banner SHALL:

1. Use `--edu-warning-light` background and `--edu-warning/40` border (1px solid).
2. Display a clock icon (Lucide `clock`, 18px, `--edu-warning` color) on the left side in a 38x38 icon box (`--edu-warning/22` background, radius 10px).
3. Title text from `exam.result.pendingEssayTitle` i18n key.
4. Body text from `exam.result.pendingEssayBody` i18n key with interpolated values `{mcqScore}`, `{mcqMax}`, `{essayMax}`.
5. Carry `role="alert"` and `aria-live="assertive"` attributes (WCAG 2.1 AA live region requirement per AC-6 and AC-9).
6. Be positioned between the score-hero card and the grade-book deep-link button.

| Attribute | Detail |
|---|---|
| Trigger | ExamResult renders with `status === 'submitted_pending_essay'` |
| Preconditions | Score hero renders; i18n keys for banner title and body exist |
| Postconditions | Banner is visible and announced to screen readers on mount |
| Error conditions | If `essayMax` is null, interpolation renders "--" for that placeholder |

---

### TR-E11.5-013 — ExamResult: stats row with essay count

**Priority:** Should  
**Category:** Functional  

The system SHALL extend the three-cell stats row on ExamResult to surface essay question data when `result.status === 'submitted_pending_essay'`. A fourth cell (or replacement of the "Skipped" cell) SHALL display `essayCount` with label from `exam.result.essayPending` i18n key ("Cau tu luan (cho cham)") in `--edu-warning` color.

[ASSUMPTION] The essay cell is appended as a fourth cell in the stats row; the existing three cells (correct/incorrect/skipped) remain visible for the MCQ portion.

| Attribute | Detail |
|---|---|
| Trigger | Result screen renders `submitted_pending_essay` state |
| Postconditions | Essay count cell visible; MCQ stats cells unchanged |
| Error conditions | If `essayCount` is 0 or null, cell is hidden |

---

### TR-E11.5-014 — ExamResult: question review essay label

**Priority:** Must  
**Category:** Functional  

The system SHALL render essay questions in the question review section using a distinct label from `exam.result.essayQuestionLabel` i18n key ("Cau tu luan -- Cho cham") instead of the correct/incorrect/skipped badge used for MCQ questions. Essay questions in the review SHALL NOT show A/B/C/D option rows; they SHALL show the student's submitted essay text (or an empty placeholder if absent).

MCQ questions in the review SHALL render exactly as in E11.1 (no change).

| Attribute | Detail |
|---|---|
| Trigger | Question review renders when result contains mixed question types |
| Preconditions | Question review section exists from US-E11.1 |
| Postconditions | Essay rows show pending label and essay text; MCQ rows unchanged |
| Error conditions | If student submitted no essay text, show placeholder text (empty-answer indicator) rather than a blank space |

---

### TR-E11.5-015 — ExamResult: completed-transition (essay graded)

**Priority:** Must  
**Category:** Functional  

The system SHALL render the standard E11.1 ExamResult view when `result.status === 'completed'` regardless of whether the exam originally had essay questions. No pending-essay UI elements (banner, partial-score circle, partial badge, essay stats cell) SHALL be visible in this case.

| Attribute | Detail |
|---|---|
| Trigger | Student navigates to ExamResult for an exam whose essay has been graded (status transitioned to `completed`) |
| Preconditions | E11.1 ExamResult is already implemented |
| Postconditions | Standard score, pass/fail badge, and full stats row are shown; all E11.5 overlay elements are absent |
| Error conditions | None beyond existing E11.1 error states |

---

### TR-E11.5-016 — Grade-book deep-link

**Priority:** Should  
**Category:** Functional  

The system SHALL render a "Xem diem trong bang diem" button on the ExamResult screen (for both `submitted_pending_essay` and `completed` states) that navigates the student to `/student/grades`. This button SHALL be visible to the student role only and SHALL use the `award` Lucide icon.

[ASSUMPTION] The grade-book route `/student/grades` is already established and accessible to students (it exists per E13.6 design-ready status in screens.md). Navigation uses the existing `onNavigate` prop pattern from E11.1.

| Attribute | Detail |
|---|---|
| Trigger | Student clicks the grade-book deep-link button on ExamResult |
| Postconditions | Student is navigated to `/student/grades` |
| Error conditions | If the grades route is unavailable, the navigation fails silently (no crash on ExamResult) |

---

### TR-E11.5-017 — UI states: all four states required on affected screens

**Priority:** Must  
**Category:** Functional  

All screens modified by this story SHALL implement the four UI states for any asynchronous operation:

| Screen | loading | empty | error | success |
|---|---|---|---|---|
| ExamList | Skeleton card (existing from E11.1) | Empty state per `exam.empty.*` i18n keys | Error state per `exam.errors.*` i18n keys | Card list including pending-essay variant |
| ExamResult | Score-hero skeleton | n/a | Error state | Pending-essay variant OR completed variant |

ExamBriefing and ExamTaking have no new async calls; their existing states from E11.1 remain unchanged.

---

### TR-E11.5-018 — Empty state for "Cho cham" filter

**Priority:** Should  
**Category:** Functional  

The system SHALL render the existing `exam.empty.*` empty state when the "Cho cham" filter chip is active and no `submitted_pending_essay` exams exist in the student's exam list.

---

## 4. Non-Functional Requirements

### NFR-E11.5-001 — Accessibility: warning banner live region

**Priority:** Must  
**Category:** Accessibility  
**Measurable target:** `role="alert"` or `aria-live="assertive"` present on pending-essay banner; axe-core 0 critical/serious violations on ExamResult pending-essay variant; WCAG 2.1 AA

The pending-essay banner (TR-E11.5-012) SHALL be implemented as a live region so screen readers announce it on mount without requiring focus to move to it. The banner title and body text SHALL be included in the live region content.

---

### NFR-E11.5-002 — Accessibility: essay textarea labeling

**Priority:** Must  
**Category:** Accessibility  
**Measurable target:** Each essay `<textarea>` has an associated `<label>` or `aria-label`; char-count element has `aria-describedby` pointing to the textarea; WCAG 2.1 AA 1.3.1 and 3.3.2

The essay textarea input (TR-E11.5-008) SHALL have a programmatic label associating it with the question text. The character count element SHALL be linked to the textarea via `aria-describedby`.

---

### NFR-E11.5-003 — Accessibility: warning badge color contrast

**Priority:** Must  
**Category:** Accessibility  
**Measurable target:** Warning-color text on warning-light background >= 4.5:1 contrast ratio; white text SHALL NOT be used on `--edu-warning` background (per design-system rule for warning color)

All warning-colored badge and banner text SHALL use `--edu-warning-foreground` (`#2A3547`) on `--edu-warning-light` backgrounds, not white. This applies to the status badge on the exam card (TR-E11.5-004) and the pending-result badge on the result hero (TR-E11.5-011).

---

### NFR-E11.5-004 — Accessibility: navigator essay icon

**Priority:** Must  
**Category:** Accessibility  
**Measurable target:** Each essay navigator button carries `aria-label` that identifies the question as an essay type; no icon-only button without accessible name

Essay navigator buttons (TR-E11.5-010) SHALL carry an `aria-label` that includes the question number and indicates it is an essay question (e.g. from `exam.taking.navigatorLabel` extended with essay type context).

---

### NFR-E11.5-005 — Performance: skeleton load

**Priority:** Should  
**Category:** Performance  
**Measurable target:** Skeleton/loading state appears within 320ms of navigation; no layout shift (CLS) when real content replaces skeleton

---

### NFR-E11.5-006 — Responsive: no layout break at 320px

**Priority:** Must  
**Category:** Responsive  
**Measurable target:** All modified screens (ExamList card, ExamResult hero, pending-essay banner) render without horizontal overflow or overlapping elements at 320px viewport width; breakpoints 375/768/1280px all pass visual inspection

The partial-score inline banner on the exam card (TR-E11.5-004) and the pending-essay result banner (TR-E11.5-012) SHALL stack their icon and text vertically on narrow viewports rather than overflowing.

---

### NFR-E11.5-007 — i18n: all strings from exam.* namespace

**Priority:** Must  
**Category:** i18n  
**Measurable target:** Zero hardcoded Vietnamese or English UI strings in .tsx files (outside mock/fixtures); all new keys present in both vi.json and en.json under the `exam` namespace; `tsc --noEmit` passes (typed keys)

All user-visible strings introduced by this story SHALL be delivered via existing `exam.*` i18n keys already present in `src/bootstrap/i18n/messages/vi.json` and `en.json`. No new keys may be added without explicit confirmation that the 14 existing keys are insufficient. Mock/fixture data (exam titles, teacher names) is exempt.

---

### NFR-E11.5-008 — No regression against US-E11.1

**Priority:** Must  
**Category:** Quality  
**Measurable target:** All existing E11.1 Vitest unit tests and Storybook play() assertions continue to pass after E11.5 changes; `bun vitest run` green; `bun build` green

All changes to shared domain entities, mappers, and presentation components SHALL be additive (new branches, new props with defaults). Existing E11.1 tests SHALL not require modification to pass.

---

### NFR-E11.5-009 — Design tokens only

**Priority:** Must  
**Category:** Design System  
**Measurable target:** Zero raw color values (`#`, `rgb`, `oklch` literals) in .tsx files; only semantic tokens from `src/app/tokens.css` used

Warning color palette uses `--edu-warning` and `--edu-warning-light`. Purple badge uses `--edu-purple`. No new tokens are required for this story.

---

## 5. Scope Boundary

### In scope

- `ExamStatus` domain union extension: add `submitted_pending_essay`
- `calculatePartialScore()` pure domain function (MCQ-only)
- `getExamResult` mapper branch for `submitted_pending_essay`
- ExamList card variant: pending-essay badge, partial-score banner, CTA
- ExamList filter chip: "Cho cham" (`submitted_pending_essay`)
- ExamList stats row: completed count includes `submitted_pending_essay`
- ExamBriefing: mixed-exam badge, type-row value, essay grading note
- ExamTaking: essay textarea question type, char count, empty-essay submit warning, navigator icon
- ExamResult: pending-essay score hero, warning banner (with ARIA live region), stats row essay cell, question review essay label
- ExamResult: grade-book deep-link button (already present in E11.1 design; confirm route)
- ExamResult: completed-transition (standard E11.1 view when essay graded)
- Mock fixture: one exam with `hasEssayQuestions: true`, `status: 'submitted_pending_essay'`, `mcqScore`, `mcqMax`, `essayMax`, `essayCount`
- Storybook stories: ExamList_PendingEssayCard, Briefing_MixedIndicator, Taking_EssayQuestion, Result_PendingEssay, Result_CompletedAfterEssay

### Out of scope

- Teacher-side essay grading UI (separate story)
- `POST /lms/exams/:id/submit` real API call (mock-first; no real `lms` service)
- Real-time status polling for essay grading completion
- Email / push notification when essay is graded (noti service, separate epic)
- Parent or teacher views of pending-essay result
- File upload for essay answers (text-only per design)
- Exam creation or editing of essay questions (ExamBank, US-E11.3)
- Any change to the ExamResult screen for pure MCQ exams (E11.1 behavior unchanged)

### External dependencies

| Dependency | Service | Status | Handling |
|---|---|---|---|
| `GET /lms/api/v1/exams` — list with `submitted_pending_essay` status | `lms` | Not shipped (decision 0014) | Mock fixture in `AVAILABLE_EXAMS` |
| `GET /lms/api/v1/exams/:id/result` — pending-essay result payload | `lms` | Not shipped | Mock fixture `PENDING_ESSAY_RESULT` |
| `POST /lms/api/v1/exams/:id/submit` — submit with essay answers | `lms` | Not shipped | Mock submit handler; payload shape assumed `{ answers: [...] }` per story design notes |
| `/student/grades` route | `features/grades` | Design-ready (US-E13.6) | Deep-link button navigates to route; no dependency on grades feature internals |

---

## 6. Constraints

1. **Mock-first.** The `lms` service has not shipped. All data comes from mock fixtures. The repository interface is wired to return mock data when `NEXT_PUBLIC_USE_MOCK=true` (decision 0014). No real HTTP calls to `lms` endpoints are made.

2. **E11.1 must not regress.** All changes are additive. Pure MCQ exams retain their exact E11.1 rendering path. No shared component, entity, or mapper may change its existing behavior for the non-essay path.

3. **i18n reuse.** Fourteen `exam.*` keys are already present in `vi.json` and `en.json`. These SHALL be reused as-is. The FE team SHALL NOT add parallel i18n keys that duplicate existing ones. If a key is found missing, `ba-lead` must be notified before adding it.

4. **Design tokens only.** Warning color = `--edu-warning` / `--edu-warning-light`. Purple = `--edu-purple`. No raw hex values. No new tokens required.

5. **Student RBAC gate.** All exam screens are protected by the `student` role guard at the route layout level (established in E11.1). No additional RBAC work is required for this story.

6. **No new endpoint.** The submit endpoint is the same as E11.1 (`POST /lms/api/v1/exams/:id/submit`); the payload is extended with essay answer strings. No new endpoint constant is required.

---

## 7. MoSCoW Prioritized Requirements Summary

| ID | Requirement | Priority | Rationale |
|---|---|---|---|
| TR-E11.5-001 | ExamStatus domain extension | Must | Core type safety; all other requirements depend on this |
| TR-E11.5-002 | MCQ-only partial score calculation | Must | Domain correctness; drives score display on result screen |
| TR-E11.5-003 | Result mapper submitted_pending_essay branch | Must | Data contract for result screen; required before any result UI |
| TR-E11.5-004 | ExamList pending-essay card variant | Must | Primary student-facing surface for this status |
| TR-E11.5-005 | Stats row count includes pending-essay | Should | Product consistency; students expect submitted exams counted as done |
| TR-E11.5-006 | Filter chip "Cho cham" | Must | Students need to locate pending exams; part of core list UX |
| TR-E11.5-007 | ExamBriefing mixed indicator | Must | Student must know before starting that essay section exists |
| TR-E11.5-008 | ExamTaking essay textarea | Must | Core input mechanic for mixed exams |
| TR-E11.5-009 | Empty-essay submit warning | Must | Prevents silent accidental blank submissions |
| TR-E11.5-010 | Navigator essay icon | Must | Visual differentiation; a11y-required distinct marking |
| TR-E11.5-011 | ExamResult pending-essay score hero | Must | Central result display; drives student understanding of partial result |
| TR-E11.5-012 | ExamResult warning banner (ARIA live) | Must | A11y requirement (AC-6, AC-9); explains pending state to student |
| TR-E11.5-013 | Stats row essay count cell | Should | Informational; improves result comprehension |
| TR-E11.5-014 | Question review essay label | Must | Without this, essay questions incorrectly appear as skipped MCQ |
| TR-E11.5-015 | Completed-transition (essay graded) | Must | Ensures clean exit from pending state; E11.1 behavior restored |
| TR-E11.5-016 | Grade-book deep-link | Should | Useful navigation but not blocking for pending-essay story |
| TR-E11.5-017 | Four UI states on affected screens | Must | Platform standard; loading/empty/error required per harness |
| TR-E11.5-018 | Empty state for "Cho cham" filter | Should | Edge case UX; filter must not show blank screen |
| NFR-E11.5-001 | A11y: warning banner live region | Must | WCAG 2.1 AA SC 4.1.3; explicitly called out in AC-9 |
| NFR-E11.5-002 | A11y: essay textarea labeling | Must | WCAG 2.1 AA SC 1.3.1, 3.3.2 |
| NFR-E11.5-003 | A11y: warning badge contrast | Must | Design-system hard rule; no white text on warning yellow |
| NFR-E11.5-004 | A11y: navigator essay icon label | Must | WCAG 2.1 AA SC 4.1.2 |
| NFR-E11.5-005 | Performance: skeleton ≤320ms | Should | Platform baseline |
| NFR-E11.5-006 | Responsive: no break at 320px | Must | Platform baseline; banner and partial-score inline elements are at risk |
| NFR-E11.5-007 | i18n: all strings via exam.* namespace | Must | Constraint; existing keys must be reused |
| NFR-E11.5-008 | No regression vs E11.1 | Must | Fundamental constraint |
| NFR-E11.5-009 | Design tokens only | Must | Hard rule from design system |

---

## 8. Assumptions

- `[ASSUMPTION]` The essay navigator button cell displays the `fileText` icon in place of the question numeral inside the cell; the question number is exposed via `aria-label` for screen reader accessibility (TR-E11.5-010).
- `[ASSUMPTION]` The stats row essay cell (TR-E11.5-013) is appended as a fourth cell rather than replacing one of the existing three MCQ stats cells.
- `[ASSUMPTION]` The grade-book route `/student/grades` is reachable from the student workspace at the time this story is implemented (design-ready status confirmed in `screens.md`); the deep-link does not depend on US-E13.6 being fully implemented — a placeholder route is sufficient for navigation.
- `[ASSUMPTION]` The exam entity field name from E11.1 is `hasEssayQuestions: boolean` (matching the product contract language in the story packet and the mock data field `hasEssay: true`). The FE team should confirm the exact field name in the existing entity before implementation.
- `[ASSUMPTION]` The submit payload for mixed exams follows the shape `{ answers: [{ questionId, type: 'mcq', selectedOption: number } | { questionId, type: 'essay', text: string }] }`. This is mock-first; the exact contract will be defined when `lms` ships.

---

## 9. Open Questions

1. **Essay question `type` discriminant:** The existing E11.1 question entity was built for pure MCQ. Does it currently carry a `type` field, or does US-E11.5 need to introduce that discriminant? If `type` is absent, the domain entity extension in TR-E11.5-001/002 is more significant than a simple union extension. The FE team should confirm before planning.

2. **Stats row layout at narrow widths:** The four-cell stats row (MCQ correct / incorrect / skipped + essay pending) may not fit at 375px without a layout change. Is a 2x2 grid or a scrollable row acceptable, or should the essay cell replace the "Skipped" cell in the pending-essay state? This is a design decision that `ba-lead` should flag for `uiux-lead` if the FE team raises it.

---

## 10. Handoff Notes

**For `ba-integration-analyst`:**
- Data sources: `lms` service (mock-first). Relevant mock entities: `AVAILABLE_EXAMS[4]` (exam id=5, `submitted_pending_essay`), `PENDING_ESSAY_RESULT` fixture (to be created). Fields required on result payload: `mcqScore`, `mcqMax`, `essayMax`, `essayCount`, `status`. Fields required on exam list item: `mcqScore`, `mcqMax`, `essayMax`, `essayCount`, `hasEssayQuestions`, `status`.
- Submit endpoint: `POST /lms/api/v1/exams/:id/submit` — payload extension assumed; confirm shape with lms team when service ships.
- No new endpoint constants needed; extend `EXAM_EP` from E11.1 only if new paths are added.
- Sensitivity: `Internal` (student exam scores are per-tenant, not public).

**For `ba-use-case-modeler`:**
- Flows to model: (1) Student sees pending-essay card on list → views partial result → returns to list; (2) Student takes mixed exam (MCQ + essay) → submits → lands on pending-essay result; (3) Student returns to result after essay is graded → sees completed result (E11.1 behavior).
- Role variants: student only; no other role variants.
- State variants for each Storybook story: ExamList_PendingEssayCard (success), Briefing_MixedIndicator (success), Taking_EssayQuestion (answering + empty-submit warning), Result_PendingEssay (success + loading + error), Result_CompletedAfterEssay (success — standard E11.1).
- AC-1 through AC-10 from the story packet map directly to TRs: AC-1 → TR-E11.5-004/006; AC-2 → TR-E11.5-007; AC-3 → TR-E11.5-008/009; AC-4 → TR-E11.5-010; AC-5 → TR-E11.5-011; AC-6 → TR-E11.5-012; AC-7 → TR-E11.5-014; AC-8 → TR-E11.5-015; AC-9 → NFR-E11.5-001/002/003/004; AC-10 → NFR-E11.5-007.
