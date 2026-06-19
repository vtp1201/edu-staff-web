# US-E13.6 Grade Book Screen (Multi-Role Read View)

## Status

implemented

## Lane

normal

## Dependencies

- Depends on: US-E14.2 (grade entry — data source), US-E12.6/E14.1 (assessment scheme — column definitions), US-E12.4 (student roster)
- Blocks: US-E14.4 (grade approval — reads same data with approve actions)
- Feature module(s) cham: `src/features/grades/` (shared with E14.2)
- Shared contract/file: `bootstrap/endpoint/grades.endpoint.ts` (shared with E14.2); `GradeBookTable` component -> `components/shared/`

## Product Contract

Bang diem (Grade Book) read-only cho nhieu vai tro. Route phu thuoc vao role:
`/teacher/grades`, `/principal/grades`, `/student/grades`, `/parent/grades`.

**Table layout:**
- Header 3 tang: Cot Subject, cac nhom cot theo component (TX=primary, GK=warning, CK=error — mau tint banded header), cot Diem TB.
- Hang: moi hoc sinh 1 hang (ten + lop + avatar); cac o diem theo cot.
- Diem mau: >= 8 success, < 5 error, else text-primary (design system rule).
- Cot cuoi "Diem TB": tinh theo he so, in dam.
- Cot "Hanh kiem": conduct grade (Tot/Kha/TB/Yeu) badge.

**Five-band rank scale summary** (theo DR-001 Thang 10):
- Xuat sac >= 9.5, Gioi >= 8.0, Kha >= 6.5, Trung binh >= 5.0, Yeu < 5.0.
- Distribution chart (bar chart % moi xep loai) hien phia tren bang.

**Column-banded headers (TX/GK/CK):**
- Mau tint theo loai: TX=primary/12, GK=warning/12, CK=error/12.
- Tooltip tren header: ten cot day du + he so.

**Role variants:**
- Teacher: thay lop phu trach; CTA "Nhap diem" -> navigate sang E14.2 grade entry.
- Principal/Admin: thay tat ca lop; read-only.
- Student: chi thay diem ca nhan minh (single-row view).
- Parent: chi thay diem cua con (single-row view, filter theo child).

**gradePublishMode gate:** Student/parent chi thay diem sau khi admin publish
(ADMIN_APPROVAL mode) hoac sau khi teacher save (SELF_PUBLISH mode). Chua publish -> "Chua cong bo" banner.

Selectors: class + subject + term (teacher/principal); term (student/parent).
Mock-first: `core` grade endpoints (US-060 BE planned).

## Relevant Product Docs

- `docs/product/screens.md` — Teacher "Grade Book" + Student "Grades" + Parent "Grades/Schedule"
- `design_src/edu/gradebook.jsx` — GradeBookScreen (multi-role, 1506)
- Epic overview: `docs/stories/epics/E13-teacher-workspace/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton table khi load du lieu diem.
- AC-2 (table structure): Column headers 3-tang (component group -> cac cot con -> Diem TB); banded color TX/GK/CK dung theo tint.
- AC-3 (score colors): Diem >= 8 -> text-success; diem < 5 -> text-error; else text-primary; ap dung cho moi o trong bang.
- AC-4 (rank scale): Distribution chart hien thi phan bo % theo 5 xep loai; mau dung (Xuat sac=success, Gioi=primary, Kha=warning, TB=textMuted, Yeu=error).
- AC-5 (teacher CTA): Teacher thay nut "Nhap diem" -> navigate sang grade entry screen (E14.2).
- AC-6 (student/parent — single row): Student / parent chi thay hang diem cua chinh minh / con minh; khong thay hang cua hoc sinh khac.
- AC-7 (publish gate — student): ADMIN_APPROVAL mode chua approved -> student thay banner "Diem chua duoc cong bo" thay vi gia tri.
- AC-8 (selectors): Thay doi class/subject/term -> bang refresh dung du lieu.
- AC-9 (empty state): Chua co du lieu diem -> empty state "Chua co diem".
- AC-10 (error state): API loi -> error banner co nut thu lai.
- AC-11 (a11y): Table co <caption>; <th> co scope="col"; cot hanh kiem khong chi truyen bang mau (co text); WCAG AA.
- AC-12 (i18n): Tat ca strings qua namespace `grades`.

## Design Notes

- Routes: `/teacher/grades`, `/principal/grades`, `/student/grades`, `/parent/grades`
- Design file: `design_src/edu/gradebook.jsx` — GradeBookScreen, GradeBookTable, RankDistributionChart, ColumnHeader
- Commands: none (read-only; navigation to E14.2 for entry)
- Queries: `getGradeBook` (class x subject x term), `getMyGrades` (student), `getChildGrades` (parent)
- API (mock-first — core planned US-060):
  - `GET /core/api/v1/class-subjects/:csId/gradebook?term=`
  - `GET /core/api/v1/students/me/grades?term=`
  - `GET /core/api/v1/parent/children/:childId/grades?term=`
- Domain rules: Score color mapping: >= 8 success, < 5 error, else text-primary. Weighted avg = sum(score * weight) / sum(weights). gradePublishMode from operational-settings (REAL endpoint — US-059 live).
- UI surfaces: GradeBookTable (shared component candidate); RankDistributionChart; ColumnBandedHeader; PublishGateBanner; ClassSubjectTermSelector

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | calculateWeightedAverage (coefficient-weighted); scoreColorClass (>= 8 / < 5 / else); rankBand (thresholds) |
| Integration | GradesRepository mock (getGradeBook, getMyGrades, getChildGrades) |
| E2E | Storybook: Loading / TeacherView_WithScores / PrincipalView / StudentView_SingleRow / ParentView / PublishGateBanner / EmptyState / ErrorState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E13.6 (planned)
- `docs/product/screens.md`: Teacher "Grade Book" + Student "Grades" + Parent "Grades" -> design-ready
