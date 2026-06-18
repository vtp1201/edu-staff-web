# US-E11.2 Lesson Bank (Teacher Upload & Manage, Principal Read)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E12.3 (subject catalogue — subjects for metadata), US-E12.9 (staffing — department for filtering)
- Blocks: none
- Feature module(s) cham: `src/features/lesson-bank/` (new feature)
- Shared contract/file: `bootstrap/endpoint/lesson-bank.endpoint.ts` (new)

## Product Contract

Giao vien upload va quan ly kho bai giang ca nhan / bo mon / truong
(`/teacher/lesson-bank`). Hieu truong xem kho bai giang toan truong (read-only).

**Grid/List view:**
- Toggle grid / list layout.
- Filter: theo mon hoc, theo bo mon, theo visibility (ca nhan / bo mon / toan truong).
- Search theo tieu de.
- Lesson card: thumbnail (placeholder theo file type), tieu de, mon hoc, file type badge (pdf/pptx/mp4/link), visibility badge, ngay tai len, luot xem.
- Sort: moi nhat / xem nhieu nhat / ten A-Z.

**Upload drawer (right slide-in):**
- Drag-and-drop area + "Chon file" button.
- File type vocabulary: pdf / pptx / mp4 / link (URL).
- Meta: tieu de, mon hoc (dropdown tu subject catalogue), bo mon, mo ta, visibility toggle (Ca nhan / Bo mon / Toan truong).
- Validate: tieu de bat buoc; neu la link: URL hop le; file size limit (placeholder 50MB).

**Detail sheet:**
- Preview thumbnail, tieu de, mo ta, file type, visibility, ngay, tac gia, luot xem.
- Nut: Tai xuong / Xem trc / Sua / Xoa (chi tac gia hoac admin).

**Principal view:**
- Xem tat ca bai giang voi visibility = school (toan truong).
- Loc theo bo mon / giao vien.
- Read-only: khong co nut upload / xoa / sua.

RBAC: Teacher upload bai giang cua minh; principal xem school-wide (read-only).
Mock-first: `lms` service chua ship (US-053 BE deferred).

## Relevant Product Docs

- `docs/product/screens.md` — Teacher section (lesson-bank — new row)
- `design_src/edu/lesson-bank.jsx` — LessonBankScreen (1506)
- Epic overview: `docs/stories/epics/E11-lms-exams/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton grid khi load danh sach bai giang.
- AC-2 (grid view): Cards hien thi thumbnail, tieu de, mon hoc, file type badge (pdf/pptx/mp4/link), visibility badge; mau file type badge khop design.
- AC-3 (upload — drag-and-drop): Keo file vao vung drop -> ten file xuat hien trong form; "Chon file" button cung mo file picker.
- AC-4 (upload — link): Chon type "Link" -> hien input URL; validate URL hop le truoc khi submit.
- AC-5 (upload — validation): Tieu de trong -> nut luu disabled; file type phai duoc chon.
- AC-6 (upload success): Submit thanh cong -> bai giang moi xuat hien trong grid; drawer dong; toast "Da upload bai giang".
- AC-7 (detail sheet): Click card -> SideSheet hien thong tin day du + nut Tai xuong / Sua / Xoa.
- AC-8 (delete): Xoa bai giang -> confirm dialog -> bai giang bien mat; toast.
- AC-9 (principal — read-only): Hieu truong khong thay nut Upload; chi thay bai giang visibility = school.
- AC-10 (filter/search): Filter theo mon hoc, visibility; search theo tieu de hoat dong chinh xac.
- AC-11 (empty state): Chua co bai giang -> empty state co CTA "Upload bai giang dau tien".
- AC-12 (a11y): File drop zone co role="button" + aria-label; card co alt text; WCAG AA.
- AC-13 (i18n): Tat ca strings qua namespace `lessonBank`.

## Design Notes

- Routes: `/teacher/lesson-bank` (teacher), `/principal/lesson-bank` (principal — read-only aggregate)
- Design file: `design_src/edu/lesson-bank.jsx` — LessonBankScreen, UploadDrawer, LessonDetailSheet
- Commands: `uploadLesson`, `updateLesson`, `deleteLesson`
- Queries: `getLessons` (filter + search + sort), `getLessonDetail`
- API (mock-first — lms service planned):
  - `GET  /lms/api/v1/lessons?visibility=&subjectId=&search=&sort=`
  - `POST /lms/api/v1/lessons`
  - `PUT  /lms/api/v1/lessons/:id`
  - `DELETE /lms/api/v1/lessons/:id`
- Domain rules: Visibility levels: private (chi minh), dept (bo mon), school (toan truong). File types: pdf/pptx/mp4/link. File size limit: 50MB (placeholder, BE enforces). Teacher can only edit/delete own lessons.
- UI surfaces: LessonCard (grid + list variant); UploadDrawer; LessonDetailSheet; GridListToggle; FilterBar

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | uploadLesson (ok/missing-title/invalid-url-for-link/unsupported-type); deleteLesson (ok/forbidden/not-found) |
| Integration | LessonBankRepository mock (list with filters, upload, update, delete) |
| E2E | Storybook: Loading / GridView_Populated / ListView_Populated / UploadDrawer_Form / UploadDrawer_Link / DetailSheet / PrincipalReadOnly / EmptyState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E11.2 (planned)
- `docs/product/screens.md`: add Teacher "Lesson Bank" row -> design-ready
