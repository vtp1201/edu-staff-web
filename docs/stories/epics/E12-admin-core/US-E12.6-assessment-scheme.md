# US-E12.6 Grade Scale & Assessment Scheme Config (grade-scoped subject selector)

## Status

implemented

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

## Design Status

**Design file da co (1506 handoff)** — `design_src/edu/assessment.jsx` da ship trong
1506 handoff (2026-06-15). Status chuyen tu design-pending (DR-001) sang design-ready.

Design request DR-001 da duoc giai quyet boi 1506 handoff.

## Relevant Product Docs

- `docs/product/screens.md` — muc "Assessment Scheme Config"
- `design_src/edu/assessment.jsx` — AssessmentSchemeScreen (1506 handoff — DESIGN NOW AVAILABLE)
- `design_src/edu/school-setup.jsx` — onboarding step 4 links `/admin/assessment`
- `design_src/edu/subject-detail.jsx` — locked fields `requiredAssessmentCount`
  (so bai kiem tra / ky) la input cua scheme nay
- BE API (REAL — US-059 live):
  - `GET  /core/api/v1/config/grade-scale`
  - `PUT  /core/api/v1/config/grade-scale`
  - `GET  /core/api/v1/subjects/:subjectId/assessment-schemes/:yearLabel`
  - `PUT  /core/api/v1/subjects/:subjectId/assessment-schemes/:yearLabel`

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

- Design file: `design_src/edu/assessment.jsx` — AssessmentSchemeScreen (1506 handoff, DR-001 resolved).
- Presets grade scale: Thang 10 (VN default, Thong tu 22/2021), GPA 4.0, Letter grades.
- Presets assessment scheme: Thong tu 22/2021 (TX x2 20%, GK x1 30%, CK x1 50%), Thong tu 26 THCS, Custom.
- Subject picker: 2-level (grade level -> moi mon hoc cua grade do tu subject catalogue).
- Grade scale bands: tu-de-them/xoa/chinh sua; validate no overlap, continuous coverage from 0 to max.
- Column types: TX (primary tint), GK (warning tint), CK (error tint).
- Reference visual: school-setup step 4 indicator; subject-detail locked field `requiredAssessmentCount` la constraint so bai KT / ky phai khop.

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

## Evidence

### Implementation (2026-06-18)

**Deliverables:**
- `src/features/assessment-scheme/` — new feature module (domain + infra + presentation)
- `src/bootstrap/endpoint/assessment-scheme.endpoint.ts`
- `src/bootstrap/di/assessment-scheme.di.ts` (mock-first, `USE_MOCK` guard)
- `src/app/[locale]/t/[tenant]/(app)/admin/assessment/page.tsx` + `actions.ts`
- `src/bootstrap/i18n/messages/{vi,en}.json` — `assessmentScheme` namespace (59 keys)
- 6 Storybook stories (loading/empty/error/grade-scale-editor/scheme-editor/weight-error)

**Gate results:**
- `bunx tsc --noEmit` → 0 errors
- `bun lint` → exit 0 (1 pre-existing warning in unrelated file)
- `bun vitest run` → 127 files / 651 tests passed (23 new assessment-scheme tests)
- `bun run build` → clean; route `/[locale]/t/[tenant]/admin/assessment` present

**Tech-lead review:** APPROVED (2026-06-18)

**A11y audit:** A11Y-041–046 found, all resolved in fix commit `2ce0954`:
- A11Y-041 (blocking): weight-sum live region — FIXED
- A11Y-042 (critical): count input aria-describedby — FIXED
- A11Y-043 (critical): loading skeleton accessible name — FIXED
- A11Y-044 (major): touch targets 44px — FIXED (button.tsx sm+icon variants)
- A11Y-045 (major): focus management on add/delete row — FIXED
- A11Y-046 (minor): empty-state live region — FIXED

**Design review: PASS**
- design-system: conform — semantic tokens only (`edu-*`, `bg-card`, `text-foreground`, `shadow-card`);
  TX/GK/CK column tints use `bg-edu-*/15` + AA-compliant text tokens per design-system.md;
  StatusBadge reused from `components/shared/status-badge/` (no duplication).
- a11y: WCAG AA — all 6 findings resolved; contrast verified (TX 10.27:1, GK 11.25:1, CK 4.79:1);
  keyboard-operable; focus management on add/delete; live regions for dynamic content.
- impeccable audit: 0 anti-patterns found by hook on all edited files.
- states: loading (skeleton + sr-only), empty (no subjects), error (network), success (save toast),
  weight-validation (inline + live region), grade-scale-validation (alert + aria-describedby).
- responsive: flex-wrap layout, 320px safe.
- No new design tokens needed — all column tints and band colors use existing `edu-*` tokens.

**Open follow-ups (non-blocking):**
- `yearLabel` is fixed to `DEFAULT_YEAR = "2024-2025"` — year selector tied to school academic year
  config is a deferred follow-up.
- 4 dead i18n keys (`applyPreset`, `presetTT22`, `yearLabel`, `yearLabelPlaceholder`) — unused but
  harmless; can be pruned in a chore.

## Harness Delta

Story packet da co. Design unblocked: `design_src/edu/assessment.jsx` da ship trong
1506 handoff (2026-06-15). DR-001 resolved.
Status: implemented (2026-06-18). TEST_MATRIX row US-E12.6: unit=1, integration=1, e2e=0.
