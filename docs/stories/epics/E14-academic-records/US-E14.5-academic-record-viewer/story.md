# US-E14.5 Academic Record Viewer / Hoc Ba (Multi-Role Read)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E14.4 (grade approval — grades must be LOCKED before sealing), US-E14.6 (academic record seal — sealed records get seal indicator)
- Blocks: none
- Feature module(s) cham: `src/features/academic-records/` (new feature)
- Shared contract/file: `bootstrap/endpoint/academic-records.endpoint.ts` (new)

## Product Contract

Xem hoc ba (bang diem theo nam hoc) cho tat ca vai tro. Routes:
- `/student/academic-record` — student xem cua minh
- `/teacher/students/:id/academic-record` — teacher xem hoc sinh trong lop
- `/parent/children/:id/academic-record` — parent xem hoc ba cua con
- `/admin/students/:id/academic-record` — admin xem hoc ba bat ky hoc sinh

**Timeline nam hoc (multi-year):**
- Horizontal timeline chon nam hoc (VD: 2023-2024, 2024-2025, 2025-2026).
- Moi nam: hien thi bang diem theo mon hoc x hoc ky (HK1, HK2, Ca nam).
- Cot: ten mon hoc, Diem HK1, Diem HK2, Diem ca nam, Xep loai, Hanh kiem HK1, Hanh kiem HK2.
- Footer dong: Diem TB chung, Xep loai hoc luc tong, Hanh kiem nam.
- Seal status indicator: "Hoc ba da niêm phong" (success badge + lock icon) | "Chua niêm phong" (muted).

**Score colors:** >= 8 success, < 5 error, else text-primary (design system rule).
**Conduct grade:** Tot=success, Kha=primary, TB=warning, Yeu=error.

**Export:** "In hoc ba" / "Xuat PDF" button (placeholder — scope out for this story).

RBAC:
- Student: chi thay cua chinh minh.
- Parent: chi thay hoc ba cua con da lien ket.
- Teacher: thay hoc sinh lop phu trach (GVCN + GVBM assigned).
- Admin: thay tat ca.

Mock-first: `core` academic-record endpoints chua ship (US-064 BE planned).

## Relevant Product Docs

- `docs/product/screens.md` — Student "Grades" row + Teacher "Classes/Students" + Parent "Grades"
- `design_src/edu/academic-record-view.jsx` — AcademicRecordViewScreen (1506, multi-role)
- Epic overview: `docs/stories/epics/E14-academic-records/EPIC-OVERVIEW.md`

## Acceptance Criteria

- AC-1 (loading): Skeleton khi load hoc ba.
- AC-2 (timeline): Chon nam hoc trong timeline -> bang diem cua nam do hien thi.
- AC-3 (grade table): Mon hoc x cot diem (HK1/HK2/Ca nam/Xep loai/Hanh kiem); diem mau dung (>= 8 success, < 5 error); Hanh kiem badge mau dung.
- AC-4 (summary row): Dong cuoi hien Diem TB chung + Xep loai hoc luc + Hanh kiem nam; in dam.
- AC-5 (seal indicator): Hoc ba da niêm phong -> success badge "Da niêm phong" + lock icon; chua phong -> muted badge.
- AC-6 (student — own only): Student chi thay hoc ba cua minh; khong co UI chon hoc sinh khac.
- AC-7 (parent — child only): Parent thay ten con + lop o dau trang; chi thay hoc ba cua con duoc lien ket.
- AC-8 (teacher — roster filter): Teacher co dropdown chon hoc sinh (trong lop phu trach); default load hoc sinh dau tien.
- AC-9 (admin — student search): Admin co search/select hoc sinh bat ky trong truong.
- AC-10 (empty state): Chua co du lieu hoc ba cho nam duoc chon -> empty state ro rang.
- AC-11 (error state): API loi -> error banner co nut thu lai.
- AC-12 (a11y): Timeline co role="tablist"; bang co caption + scope=col/row; seal badge co aria-label; WCAG AA.
- AC-13 (i18n): Tat ca strings qua namespace `academicRecord`.

## Design Notes

- Routes: `/student/academic-record`, `/teacher/students/:id/academic-record`, `/parent/children/:id/academic-record`, `/admin/students/:id/academic-record`
- Design file: `design_src/edu/academic-record-view.jsx` — AcademicRecordViewScreen (multi-role variants)
- Commands: none (read-only)
- Queries: `getAcademicRecord` (studentId + year), `listAcademicYears` (available years for timeline)
- API (mock-first — core planned US-064):
  - `GET /core/api/v1/academic-records/:studentId?year=2025-2026`
  - `GET /core/api/v1/academic-records/:studentId/years`
- Domain rules: Score colors: >= 8 success, < 5 error, else text-primary. Conduct: Tot >= 90pts, Kha >= 70, TB >= 50, Yeu < 50. Sealed record = all grades in year are LOCKED + admin has sealed (from E14.6).
- UI surfaces: YearTimeline; AcademicRecordTable; SubjectRow; SummaryRow; SealStatusBadge; StudentSelector (teacher/admin variant)

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | calculateYearAverage (weighted terms); conductGradeFromPoints; academicRecordMapper (API -> entity) |
| Integration | AcademicRecordRepository mock (getRecord by studentId+year, listYears) |
| E2E | Storybook: Loading / StudentView / TeacherView_StudentSelector / ParentView / AdminView / SealedIndicator / EmptyYear / ErrorState |
| Platform | bun build + tsc clean |
| Release | design-review gate pass |

## Harness Delta

- `docs/TEST_MATRIX.md`: add row US-E14.5 (planned)
- `docs/product/screens.md`: update Student/Teacher/Parent grade rows -> design-ready; add academic-record route references
