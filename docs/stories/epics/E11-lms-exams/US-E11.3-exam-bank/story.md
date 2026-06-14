# US-E11.3 Exam Bank + Builder (Teacher Create/Edit MCQ, Admin Aggregate)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.3 (subject catalogue — subject names for MCQ tagging)
- Blocks: US-E11.1 (exam bank is source of exams published to students)
- Feature module(s) cham: `src/features/exam-bank/` (new feature)
- Shared contract/file: `bootstrap/endpoint/exam-bank.endpoint.ts` (new)

## Product Contract

Giao vien tao va chinh sua kho de thi trac nghiem (MCQ) va publish de hoc sinh
lam (`/teacher/exam-bank`). Admin co the xem kho de thi tong hop toan truong
(`/admin/exam-bank`).

**Exam Bank list (`/teacher/exam-bank`):**
- Filter: theo mon hoc, theo trang thai (draft / published).
- Search theo tieu de.
- Cards: tieu de, mon hoc badge, so cau, trang thai badge (draft=warning, published=success), ngay tao.
- CTA: "Tao de thi moi" + "Chinh sua" / "Publish" / "Xoa" tren moi card.

**Exam Builder (`/teacher/exam-bank/create` hoac `/teacher/exam-bank/:id/edit`) — full-screen 2-col:**
- Cot trai (30%): danh sach cau hoi keo-tha de sap xep; "Them cau" button; question index + preview.
- Cot phai (70%): MCQ editor cho cau dang chon:
  - Noi dung cau hoi (textarea).
  - 4 options (A/B/C/D) — input text moi option.
  - Radio chon dap an dung.
  - Difficulty: Easy / Medium / Hard.
  - Tag mon hoc.
- Header: tieu de de thi (editable), mon hoc selector, duration (minutes), maxAttempts.
- Action bar: Luu nhap / Publish.

**Admin aggregate view (`/admin/exam-bank`):**
- Xem tat ca de thi toan truong (filter theo giao vien, mon hoc, trang thai).
- Read-only: khong tao / sua.

Draft -> Published pipeline:
- Draft: chi giao vien thay, chua giao cho hoc sinh.
- Published: giao cho hoc sinh lam (xuat hien trong ExamList E11.1).

Mock-first: `lms` service chua ship (US-054, US-055 BE deferred).

## Relevant Product Docs

- `docs/product/screens.md` — Teacher section (exam-bank — new row), Admin section (admin exam-bank — new row)
- `design_src/edu/exam-bank.jsx` — ExamBankScreen, ExamBuilderScreen (1506)
- Epic overview: `docs/stories/epics/E11-lms-exams/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (list loading): Skeleton cards khi load danh sach de thi.
- AC-2 (list success): Cards hien thi tieu de, mon hoc, so cau, trang thai (draft=warning, published=success); filter va search hoat dong.
- AC-3 (builder — add question): Click "Them cau" -> cau moi xuat hien trong cot trai + form editor o phai.
- AC-4 (builder — MCQ edit): Nhap noi dung cau hoi + 4 options + chon dap an dung + difficulty -> luu vao draft.
- AC-5 (builder — reorder): Keo tha cau hoi trong cot trai de thay doi thu tu.
- AC-6 (builder — validation): Cau hoi thieu noi dung hoac thieu dap an dung -> khong cho publish; error highlight.
- AC-7 (save draft): "Luu nhap" -> toast "Da luu"; trang thai "Nhap"; co the mo lai tiep tuc chinh sua.
- AC-8 (publish): "Publish" -> confirm dialog "De thi se xuat hien trong danh sach bai thi cua hoc sinh" -> confirm -> trang thai "Da publish"; de thi xuat hien trong ExamList (E11.1).
- AC-9 (admin read-only): Admin thay tat ca de thi nhung khong co nut tao/sua.
- AC-10 (delete draft): Chi xoa duoc de thi o trang thai draft; published khong xoa duoc.
- AC-11 (empty state): Chua co de thi -> empty state co CTA "Tao de thi dau tien".
- AC-12 (a11y): Builder co keyboard navigation giua cac cau hoi; drag-handle co aria-label; WCAG AA.
- AC-13 (i18n): Tat ca strings qua namespace `examBank`.

## Design Notes

- Routes: `/teacher/exam-bank` (list), `/teacher/exam-bank/create`, `/teacher/exam-bank/:id/edit` (builder), `/admin/exam-bank` (admin aggregate)
- Design file: `design_src/edu/exam-bank.jsx` — ExamBankScreen, ExamBuilderScreen (2-col layout)
- Commands: `createExam`, `updateExam`, `publishExam`, `deleteExam`
- Queries: `getExamBank` (teacher own + admin all), `getExamDetail`
- API (mock-first — lms service planned, US-054/055):
  - `GET  /lms/api/v1/exam-bank?status=&subjectId=`
  - `POST /lms/api/v1/exam-bank`
  - `PUT  /lms/api/v1/exam-bank/:id`
  - `POST /lms/api/v1/exam-bank/:id/publish`
  - `DELETE /lms/api/v1/exam-bank/:id`
- Domain rules: Published exam cannot be deleted (only draft). Each question needs: content (non-empty) + exactly 1 correct answer + at least 2 options. Minimum 1 question to publish.
- UI surfaces: ExamCard (list); ExamBuilderScreen (2-col full-screen); QuestionList (draggable); MCQEditor; PublishConfirmDialog

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | publishExam (ok/no-questions/question-missing-answer/question-empty-content); createExam; deleteExam (ok/cannot-delete-published) |
| Integration | ExamBankRepository mock (CRUD, publish, admin aggregate) |
| E2E | Storybook: ExamList_Loading / ExamList_DraftAndPublished / Builder_AddQuestion / Builder_MCQEdit / Builder_Validation / PublishConfirm / AdminReadOnly / EmptyState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E11.3 (planned)
- `docs/product/screens.md`: add Teacher "Exam Bank" + Admin "Exam Bank" rows -> design-ready
