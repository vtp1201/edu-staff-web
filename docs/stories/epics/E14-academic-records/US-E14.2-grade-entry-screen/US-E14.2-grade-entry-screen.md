# US-E14.2 Grade Entry Screen — Teacher Enters Component Scores

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E12.6 / E14.1 (assessment scheme configured), US-E12.4 (students enrolled), BE US-060 (grade entry API — planned)
- Blocks: none
- Feature module(s) chạm: `src/features/grades/` (new feature)
- Shared contract/file: `bootstrap/endpoint/grades.endpoint.ts` (new)

## Product Contract

Giáo viên bộ môn (GVBM) nhập điểm thành phần cho từng học sinh theo khung đánh
giá đã cấu hình. Màn hình `/teacher/grades`.

**Luồng:**
1. Chọn lớp + môn học (class-subject) + học kỳ.
2. Hiển thị bảng nhập điểm: hàng = học sinh, cột = các cột trong AssessmentScheme
   (VD: TX1, TX2, GK, CK). Header hiển thị tên cột + hệ số.
3. Inline cell editing — click cell → input số thập phân [0..10] (thang 10) hoặc
   [0..4] (thang 4), validation real-time.
4. Điểm TB tự động tính = sum(score × coefficient) / sum(coefficients).
5. Save draft (auto-save mỗi cell change hoặc button) → Publish (lock, ADMIN_APPROVAL mode cần hiệu trưởng approve).
6. Published grades: teacher read-only. Nếu SELF_PUBLISH mode → lock ngay khi save.

RBAC: GVBM nhập điểm của class-subject được assign. ADMIN/Principal có thể approve (ADMIN_APPROVAL mode). Student xem điểm của mình (read-only — scope thuộc E11 LMS).

**Mock-first flag**: BE US-060 `planned` (branch `feat/us-060-grade-entry` exists in edu-api but has not been merged to core main as of 2026-06-14; openapi not updated). Domain + mock-first implement trước; wire real khi BE US-060 ships.

**gradePublishMode**: `GET /core/api/v1/config/school/operational-settings` returns `gradePublishMode` enum `[SELF_PUBLISH, ADMIN_APPROVAL]` — this endpoint is **REAL**. US-E14.2 should read `gradePublishMode` to drive Publish flow: SELF_PUBLISH → lock immediately on publish; ADMIN_APPROVAL → set state "Chờ duyệt" (pending approval) as per AC-5.

## Relevant Product Docs

- `docs/product/screens.md` — "Grade Book" row (Teacher section)
- `design_src/edu/teacher.jsx` — `TeacherGrades` component (pixel reference)
- BE story: `edu-api/docs/stories/epics/E06-assessment/US-060-grade-entry/`
- BE API (MOCK-FIRST — US-060 planned):
  - `GET /core/api/v1/class-subjects/:csId/grades` — list student scores
  - `PUT /core/api/v1/class-subjects/:csId/grades/:studentId` — save/update scores
  - `POST /core/api/v1/class-subjects/:csId/grades/publish` — publish (lock)
- Score color per design system: ≥8 success, <5 error, else text-primary.

## Acceptance Criteria

- AC-1: Teacher chọn class + subject + term → bảng điểm render với đúng cột từ AssessmentScheme.
- AC-2: Inline edit: click cell → input; blur/Enter → auto-save draft; validation 0 ≤ score ≤ max_score.
- AC-3: Điểm TB cột cuối tự tính real-time theo hệ số.
- AC-4: Publish → confirm dialog "Điểm sau khi publish không thể sửa. Tiếp tục?"; success → all cells read-only.
- AC-5: ADMIN_APPROVAL mode: Publish → trạng thái "Chờ duyệt" (pending approval).
- AC-6: Score ≥8 → text success; score < 5 → text error (design system rule).
- AC-7: Empty state khi chưa có học sinh enrolled.
- AC-8: WCAG 2.1 AA — cell tab navigation, aria-label per cell.
- AC-9: Tất cả strings qua i18n namespace `gradeEntry`.

## Design Notes

- `TeacherGrades` component trong `teacher.jsx` — adapt: dynamic columns từ AssessmentScheme.
- Kéo AssessmentScheme config từ `GET /core/api/v1/subjects/:subjectId/assessment-schemes/:yearLabel` (REAL API — US-059 đã live).
- Grade score colors: reuse `trendColorClass()` pattern từ StatCard, hoặc inline conditional `cn()`.
- Commands: `saveDraftScore`, `publishGrades`.
- Queries: `getGradeSheet` (class-subject + term).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | Use-cases: saveScore (valid/out-of-range), publishGrades (no-unpublished-columns), calculateAverage (coefficient-weighted) |
| Integration | GradesRepository (mock-first: CRUD + publish) |
| E2E | Storybook: Loading/EmptyClass/WithScores/PublishConfirm/PublishedReadonly |
| Platform | bun build + tsc clean |

## Harness Delta

- `docs/TEST_MATRIX.md`: thêm hàng US-E14.2 (mock-first).
- `docs/product/screens.md`: update "Grade Book" (Teacher) → `🎨 design-ready`.
