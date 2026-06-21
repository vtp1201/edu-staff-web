# US-E11.5 Mixed Exam Result: submitted_pending_essay Status + Pending-Essay Flow

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E11.1 (Student Exam — base exam flow; this story EXTENDS ExamResult and ExamList for mixed MCQ+essay)
- Blocks: none
- Feature module(s) cham: `src/features/exam/` (extends existing; shared ExamResult component + exam entity)
- Shared contract/file: `bootstrap/endpoint/exam.endpoint.ts` (shared with E11.1); `ExamStatus` union (extend with `submitted_pending_essay`)

## Product Contract

`exam.jsx` (edustaff_5) introduces a fourth exam status `submitted_pending_essay` cho bai thi ket hop MCQ + tu luan (Essay). Day la delta chua duoc cover boi US-E11.1.

**Exam Status Extension:**
Them trang thai: `submitted_pending_essay` = hoc sinh da nop bai, MCQ da cham tu dong, phan essay dang cho giao vien cham tay.

**ExamList — Card update:**
- Card bai thi co trang thai `submitted_pending_essay`: badge "Cho cham tu luan" mau warning (vang).
- CTA: "Xem ket qua tam thoi" (thay vi "Xem ket qua" cua `completed`).
- Stat cards: "Da hoan thanh" count bao gom ca `submitted_pending_essay`.

**ExamBriefing — mixed exam indicator:**
- Khi `exam.hasEssayQuestions === true`: hien badge "Bai thi ket hop" ben canh header.
- Row thong tin "Loai bai": "Trac nghiem + Tu luan".
- Note nho: "Phan tu luan se duoc giao vien cham va cap nhat ket qua sau."

**ExamTaking — no change for MCQ part.**
- Essay questions (type = `essay`): show textarea input (khong co A/B/C/D options).
- Placeholder: "Nhap cau tra loi cua ban..."
- Max length 2000 ky tu, char count hien thi.
- Trong navigator grid: essay questions dung icon biet de phan biet MCQ.

**ExamResult — pending-essay variant:**
- Khi `result.status === 'submitted_pending_essay'`:
  - Score hero: hien "MCQ Score" (diem MCQ da co), khong hien total score ("--/10").
  - Badge: "Cho cham tu luan" (warning mau), thay the pass/fail badge.
  - Warning banner: "Phan tu luan dang duoc giao vien cham. Diem tong se duoc cap nhat sau." (icon `bellRing`; link den grade-book khi da co diem).
  - Stats row: MCQ correct/incorrect/skip + essay count "(cho cham)".
  - Question review: loc MCQ binh thuong; essay question hien "Cau tu luan - Cho cham" label.
- Khi `result.status === 'completed'` (sau khi essay da duoc cham): hien tong diem binh thuong (hien hanh vi E11.1).

**Grade-book deep link:**
- Nut "Xem bang diem" tren ExamResult -> navigate den `/student/grades` (da co trong E11.1 design; xac nhan link dung route).

**RBAC:** Chi student.
Mock-first: `lms` service chua ship (decision 0014).

## Relevant Product Docs

- `design_src/edu/exam.jsx` — `AVAILABLE_EXAMS` mock (bao gom 1 bai co `hasEssayQuestions=true`); `ExamResultScreen` (submitted_pending_essay branch ~lines 500-580); `ExamListScreen` card trang thai; `ExamBriefing` mixed badge; comment "Q4 G2b caveat" + "US-E11.5" reference
- `docs/stories/epics/E11-lms-exams/US-E11.1-student-exam/story.md` — base implementation (tham chieu de hieu scope cu)
- `docs/product/screens.md` — Student section "Exams" row (update de ghi ro mixed exam variant)

## Acceptance Criteria

- AC-1 (exam list — pending-essay badge): Card bai co `submitted_pending_essay` hien badge "Cho cham tu luan" mau warning; khong co pass/fail; CTA "Xem ket qua tam thoi".
- AC-2 (briefing — mixed indicator): Bai co `hasEssayQuestions=true` hien badge "Bai thi ket hop" va note ve essay duoc cham sau.
- AC-3 (taking — essay textarea): Question type `essay` hien textarea thay vi A/B/C/D; placeholder hien thi; char count den 2000; nhan Submit voi essay trong van duoc phep nhung hien warning.
- AC-4 (taking — navigator essay icon): Essay questions trong navigator grid dung icon/styling khac biet de phan biet MCQ.
- AC-5 (result — pending score display): `submitted_pending_essay` result: score hero hien diem MCQ (vi du "18/24 cau dung") va "--/10" cho tong; khong hien pass/fail.
- AC-6 (result — warning banner): Banner "Cho cham tu luan" hien voi icon bellRing, mau warning, text giai thich ro rang; `role="alert"` hoac `aria-live="assertive"`.
- AC-7 (result — question review essay): Essay questions trong review hien "Cau tu luan - Cho cham" label thay vi correct/incorrect mark; MCQ phan review hoat dong binh thuong.
- AC-8 (result — completed transition): Khi `status === 'completed'` (sau khi essay cham xong), hien tong diem va pass/fail nhu E11.1 binh thuong.
- AC-9 (a11y): Warning banner co ARIA live region; essay textarea co label; char count co aria-describedby; motion-safe.
- AC-10 (i18n): Tat ca strings moi qua namespace `exam` (ke ca "submitted_pending_essay" UI strings).

## Design Notes

- Commands: `submitExam` (extend — same endpoint, payload bao gom essay answers); no new endpoint
- Queries: `getExamResult` (extend — handle `submitted_pending_essay` in result mapper)
- API: `POST /lms/api/v1/exams/:id/submit` — body gia su `{ answers: [...] }` bao gom essay text; mock-first
- Tables: none
- Domain rules: `ExamStatus` union extend: `'available' | 'completed' | 'expired' | 'submitted_pending_essay'`; `calculateScore()` chay tren MCQ questions only khi essay chua cham
- UI surfaces: `src/features/exam/presentation/exam-result/` (extend); `src/features/exam/presentation/exam-list/` (card badge extension); `src/features/exam/presentation/exam-briefing/` (mixed indicator); `src/features/exam/presentation/exam-taking/` (essay textarea question type)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `ExamStatus` extension; `calculatePartialScore()` (MCQ-only); result mapper `submitted_pending_essay` branch; essay question render logic |
| Integration | Exam mapper handles `submitted_pending_essay` in list + result responses |
| E2E | Storybook: ExamList_PendingEssayCard; Briefing_MixedIndicator; Taking_EssayQuestion; Result_PendingEssay; Result_CompletedAfterEssay; play() assertions |
| Platform | bun build green; tsc --noEmit 0 errors; all E11.1 tests remain green (no regression) |
| Release | design-review gate PASS |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E11.5 as `planned`
- `docs/product/screens.md`: update Student "Exams" row to note mixed exam variant

## Evidence

- Unit: 13 new tests (calculatePartialScore x5, isResultFinal x2, mapExamResult pending-essay x6); 924/924 pass
- Integration: mock repo returns MOCK_PENDING_ESSAY_RESULT for exam-005; mapper handles submitted_pending_essay branch
- E2E: 5 Storybook stories with play() assertions — ExamList_PendingEssayCard, Briefing_MixedIndicator, Taking_EssayQuestion, Result_PendingEssay, Result_CompletedAfterEssay
- tsc --noEmit: 0 errors
- bun build: green (via pre-push hook)
- Tech-lead: Approved (all 15 gates pass)
- A11y: WCAG AA pass after A11Y-001..006 fixes (contrast, visible label, alert role, distinct link text)
- Design-review: PASS with minor notes (DR-E11.5-001..003 all applied)
- QA: Go — 10/10 ACs covered
- ADR-0048: Accepted (nullable score/passed for pending-essay status)
- Branch: feat/us-e11.5-mixed-exam-result → merged to main 2026-06-21
