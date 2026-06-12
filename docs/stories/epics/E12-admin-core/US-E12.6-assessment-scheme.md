# US-E12.6 Grade Scale & Assessment Scheme Config (grade-scoped subject selector)

## Status

planned

## Lane

normal

## Product Contract

Admin cấu hình thang điểm và khung đánh giá (Assessment Scheme) cho từng môn học
theo khối lớp. Đây là bước 4/5 trong onboarding school-setup (sau subjects).

Hai phần chính:

1. **Grade Scale (Thang điểm)**: định nghĩa các mức xếp loại điểm cho trường
   (VD: Xuất sắc ≥9.5, Giỏi ≥8.0, Khá ≥6.5, Trung bình ≥5.0, Yếu <5.0).
   Có thể theo thang 10, thang 4.0, hoặc xếp loại chữ (A/B/C/D/F).

2. **Assessment Scheme (Khung đánh giá)**: cho từng môn học tại từng khối lớp,
   định nghĩa các cột điểm thành phần và trọng số:
   - VD Toán lớp 10: Thường xuyên 20% (2 cột), Giữa kỳ 30% (1 cột), Cuối kỳ 50% (1 cột).
   - Grade-scoped subject selector: chọn môn học từ danh mục (subject catalogue
     US-E12.3) theo khối lớp, sau đó edit scheme.

BE stories tương ứng: US-056 (grade scale config), US-057/058 (assessment scheme
— xem ADR 0037/0038 nếu có).

## Design Dependency

**Design file chưa tồn tại** — màn hình này là NEW-02 theo lộ trình design
(`/admin/assessment`, `target: 'assessment'` trong `design_src/edu/school-setup.jsx`).
Designer cần build `.jsx` file này trước khi implement.

Design request: `docs/design-requests/DR-001-assessment-scheme.md`

Khi designer hoàn thành, cập nhật Relevant Product Docs dưới đây.

## Relevant Product Docs

- `docs/product/screens.md` — mục "Assessment Scheme Config"
- `design_src/edu/school-setup.jsx` — onboarding step 4 links `/admin/assessment`
- `design_src/edu/subject-detail.jsx` — locked fields `requiredAssessmentCount`
  (số bài kiểm tra / kỳ) là input của scheme này
- `docs/design-requests/DR-001-assessment-scheme.md` — design prompt cho designer
- BE API (mock-first — cần xác nhận với BE team):
  - `GET    /api/v1/core/config/grade-scale`
  - `PUT    /api/v1/core/config/grade-scale`
  - `GET    /api/v1/core/assessment-schemes?subjectId=&gradeLevel=`
  - `PUT    /api/v1/core/assessment-schemes/:subjectId/:gradeLevel`

## Acceptance Criteria

- Route `app/[locale]/t/[tenant]/(app)/admin/assessment/page.tsx`.
- **Grade Scale section**:
  - List các mức điểm (label, threshold, color badge).
  - Add/edit/delete mức điểm. Validate: thresholds không overlap; total coverage
    từ 0 đến max (10 hoặc 4.0 tùy cấu hình).
  - Preset buttons: Thang 10 / Thang 4.0 / Chữ (A-F).
- **Assessment Scheme section**:
  - Grade-scoped subject selector: dropdown chọn khối lớp → danh sách môn học
    của khối đó (từ subject catalogue).
  - Hiển thị/edit các cột điểm của môn được chọn: tên cột, số lần (count),
    trọng số (%). Tổng trọng số phải = 100%.
  - Save per-subject-per-grade.
- Mock-first (DI). bun build xanh. Design review pass (khi design available).

## Design Notes

- **Chưa có design file** — xem `docs/design-requests/DR-001-assessment-scheme.md`.
- Khi designer deliver file, update section này với path `design_src/edu/<file>.jsx`.
- Reference visual: màn school-setup step 4 indicator; subject-detail locked field
  `requiredAssessmentCount` là constraint số bài KT / kỳ phải khớp.

## Role Guard

Route `/admin/assessment` — chỉ role `admin` (decision `0022`).
BE dependency: IAM claim `role: "admin"` required.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | grade-scale validation (no overlap, total coverage); scheme weight sum = 100% |
| Integration | save scheme → fetch back correct values |
| E2E | — |
| Platform | `bun build` xanh |
| Release | design-review gate pass (after designer delivers) |

## Harness Delta

Story packet tạo mới. Blocked on designer delivering `design_src/edu/assessment.jsx`
(hoặc tên tương đương). Tracking via `docs/design-requests/DR-001-assessment-scheme.md`.
