# US-E11.1 Student Exam: List + Briefing + Taking + Results

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.3 (subject catalogue — subject names), US-E12.4 (student roster — student in class)
- Blocks: none
- Feature module(s) cham: `src/features/exam/` (new feature)
- Shared contract/file: `bootstrap/endpoint/exam.endpoint.ts` (new)

## Product Contract

Hoc sinh lam bai thi trac nghiem qua 4 buoc: ExamList -> ExamBriefing -> ExamTaking -> ExamResult.

**ExamList (`/student/exams`):**
- 3 StatCards: Can lam, Da hoan thanh, Diem TB.
- Filter: Tat ca / Co the lam / Da xong / Het han.
- Cards: subject badge, tieu de, giao vien, mo ta, duration, so cau, han nop, trang thai badge (available/completed/expired).
- CTA: "Bat dau lam bai" (available) | "Xem ket qua" (completed) | disabled (expired).

**ExamBriefing:**
- Header card: subject color, tieu de, giao vien; 3 thong so (thoi gian, so cau, loai bai).
- Rules list (5 quy dinh danh so).
- Checkbox dong y truoc khi bat dau.
- CTA "Bat dau lam bai ngay" chi active khi da tick checkbox.

**ExamTaking (full-screen, route: `/student/exams/:id`):**
- Top bar: tieu de, tien do (da tra loi / tong so cau), countdown timer (green->warning->error).
- Nut "Nop bai" trong top bar.
- Left pane (70%): question text card + 4 answer options (A/B/C/D button).
- Right pane (240px): navigator grid (5 cot) voi states: current/answered/flagged/unanswered.
- Legend: 4 mau trang thai.
- Progress bar trong navigator.
- Flag button: "Danh dau" toggle per question.
- Prev/Next buttons.
- Timer auto-submit khi ve 0.

**Submit modal:**
- Hien so cau da tra loi / tong, so cau chua lam (warning).
- "Xem lai" | "Nop bai ngay".

**ExamResult:**
- Score hero section: gradient, score circle (xx/10), pass/fail badge, rank/percentile/time.
- Stats row: so cau dung, sai, bo qua.
- Question review: filter All/Dung/Sai/Bo qua; moi cau hien thi options voi mark correct/incorrect.

Exam states: available / completed / expired.
RBAC: Chi student.
Mock-first: `lms` service chua ship (US-053 BE deferred).

## Relevant Product Docs

- `docs/product/screens.md` — Student section "Exams" row
- `design_src/edu/exam.jsx` — ExamListScreen, ExamBriefing, ExamTakingScreen, ExamResultScreen (1506)
- Epic overview: `docs/stories/epics/E11-lms-exams/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (exam list loading): Skeleton khi load danh sach bai thi.
- AC-2 (exam list success): Cards hien thi dung subject, tieu de, trang thai badge (available=primary, completed=success, expired=muted); expired cards mo nhat (opacity 0.65).
- AC-3 (briefing — checkbox gate): Nut "Bat dau lam bai" disabled cho den khi tick checkbox dong y.
- AC-4 (taking — timer): Dong ho dem nguoc chinh xac; mau green > 10p, warning 5-10p, error < 5p; timer = 0 -> auto-submit.
- AC-5 (taking — answer selection): Click option -> option duoc highlight (border + background primary); chi chon duoc 1 option tren 1 cau.
- AC-6 (taking — flag): Click "Danh dau" -> cau hien thi flag badge; navigator grid cap nhat mau (warning).
- AC-7 (taking — navigator): Click so cau trong navigator -> nhay den cau do; state mau dung: current/answered/flagged/unanswered.
- AC-8 (submit modal): "Nop bai" -> modal hien so cau da lam / tong; so cau chua lam hien warning text; "Nop bai ngay" -> chuyen sang result screen.
- AC-9 (result — score): Score circle hien dung diem; pass (>= 5) = badge "DAT" green; fail < 5 = "CHUA DAT" red; scoreColor: >= 8 success, >= 5 primary, < 5 error.
- AC-10 (result — question review): Filter Dung/Sai/Bo qua loc chinh xac; correct option hien thi green highlight; wrong option hien thi red.
- AC-11 (a11y): Timer co aria-live="polite"; option buttons co aria-label "Chon dap an A/B/C/D"; navigator buttons co aria-label "Cau N"; motion-safe timer animation.
- AC-12 (i18n): Tat ca strings qua namespace `exam`.

## Design Notes

- Routes: `/student/exams` (list), `/student/exams/:id` (briefing -> taking -> result flow)
- Design file: `design_src/edu/exam.jsx` — ExamScreen router + all sub-components
- Commands: `submitExam`
- Queries: `getAvailableExams`, `getExamQuestions`, `getExamResult`
- API (mock-first — lms service planned, US-053):
  - `GET  /lms/api/v1/exams?studentId=`
  - `GET  /lms/api/v1/exams/:id/questions`
  - `POST /lms/api/v1/exams/:id/submit`
  - `GET  /lms/api/v1/exams/:id/result`
- Domain rules: Auto-submit at timer = 0 (same as manual submit with current answers). Flag = local UI state only (not persisted to BE). maxAttempts enforced by BE (mock: 1 attempt). Score color: >= 8 success, < 5 error, else primary.
- UI surfaces: ExamCard; ExamBriefing; ExamTakingScreen (2-pane); SubmitModal; ExamResultScreen; QuestionNavigatorGrid; QuestionReviewList

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | submitExam use-case (ok/max-attempts-exceeded/after-deadline); calculateScore (correct/total * 10); scoreColorClass (>= 8 / >= 5 / < 5) |
| Integration | ExamRepository mock (getExams, getQuestions, submit, getResult) |
| E2E | Storybook: ExamList_Loading / ExamList_AllStatuses / ExamBriefing_CheckboxGate / ExamTaking_AnswerFlow / ExamTaking_Timer / SubmitModal / ExamResult_Pass / ExamResult_Fail / QuestionReview |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E11.1 (planned)
- `docs/product/screens.md`: Student "Exams" row -> design-ready
