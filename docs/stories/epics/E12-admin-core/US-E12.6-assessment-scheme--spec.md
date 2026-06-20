# BA Spec — US-E12.6 Assessment Scheme Config

**Story:** US-E12.6  
**Route:** `(app)/admin/assessment`  
**Role gate:** `admin` only  
**Lane:** normal  
**Status:** implemented (2026-06-18) — spec produced retroactively as the formal BA artifact  
**Design source (normative):** `design_src/edu/assessment.jsx` · `docs/product/design-spec.jsonc` §assessmentScheme  
**Design request:** DR-001 (delivered 2026-06-20)  
**Packet:** `docs/stories/epics/E12-admin-core/US-E12.6-assessment-scheme.md` (story) + this file (spec)

---

## Feature Intake Gate

**Input type:** spec slice (implementing selected behavior from accepted screen design DR-001)

**Risk flags:**

| Flag | Applied? | Reason |
|------|----------|--------|
| Authorization | YES | admin-only route; no other role may access |
| Data model | YES | grade-scale bands + assessment-scheme columns are school-level config records |
| Public contracts | YES | BE mock-first: endpoints defined but `core` service not built; mock contract must match future real shape |
| Existing behavior | YES | onboarding step 4/5 — depends on subjects step (US-E12.3) being complete |

**Flag count:** 4 — **normal with stronger validation** (no hard gate tripped; authorization is present but the route itself is new, not changing existing authorization rules).

**Hard gate check:**
- Auth: not touched (uses existing session + role read from cookie).
- Authorization: new admin-only route — not weakening existing gates.
- Data loss: no deletion of critical records; grade-scale replacement is admin-controlled config.
- Validation weakening: not applicable.

**Lane: normal**

---

## Part 1 — Requirements (TR-XXX)

### Actors

| Actor | Role token | Access |
|-------|-----------|--------|
| School administrator | `admin` | Full read/write on this screen |
| Principal | `principal` | No access — route is admin-only |
| Teacher | `teacher` | No access |
| Student | `student` | No access |
| Parent | `parent` | No access |

### Functional Requirements

**TR-001 Route guard**
The route `(app)/admin/assessment` MUST be accessible only to users whose active session carries the `admin` role on the current tenant. Any other role receives a redirect to their own workspace (per decision `0022`).

**TR-002 Two-column layout**
The page renders a 2-column grid (4fr left | 6fr right, gap 18px) within a max-width 1280px centered wrapper. On viewport < 768px the grid collapses to a single column.

**TR-003 Page header with breadcrumb and onboarding badge**
The page displays:
- Breadcrumb: Home → Thiết lập trường → Thang điểm & Khung ĐG
- Icon box (44×44, percent icon, primary color)
- Title "Thang điểm & Khung đánh giá" (22px/800)
- Step badge "Bước 4/5 · Onboarding" (pill, primary tint)
- ADMIN badge (error color, shield icon)

**TR-004 Grade Scale — preset selection**
Three preset pills are displayed: Thang 10 (VN default, TT 22/2021), Thang 4.0 (GPA), Xếp loại chữ (A–F). Activating a preset replaces the current band list with the preset's default bands. The active preset pill is visually distinguished (primary border + tint background). Selecting a preset marks the grade scale as dirty.

**TR-005 Grade Scale — band list CRUD**
The admin can:
- View the current band list (label, from threshold, to threshold, color swatch, color hex, rank badge)
- Add a new band via the "Thêm mức điểm" inline button at the bottom of the list
- Edit any band's label, from/to thresholds, and color via in-row inputs
- Delete a band (removes the row)
- Reorder bands via move-up/move-down icon buttons

Each band row has: color swatch (12×12), label input, from number input, to number input, color picker (native `<input type="color">`) with hex label, move up/down stacked buttons (disabled at boundaries), delete button.

**TR-006 Grade Scale — validation rules (non-blocking)**
Two validation states are shown as inline callouts below the band list:
- Gap warning (callout kind: warning): shown when bands do not fully cover the domain min (0) to domain max (10 for Thang 10, 4.0 for Thang 4.0). Key: `errorGapsInCoverage`.
- Overlap error (callout kind: error): shown when two or more bands share score ranges. Key: `errorOverlappingThresholds`.
- Empty error: at least one band is required. Key: `errorEmptyBands`.

Validation is non-blocking (save is not disabled by warnings; save IS blocked only by overlap errors and empty-band state).

**TR-007 Grade Scale — save**
"Lưu thang điểm" button is disabled when not dirty. On successful save, an inline success toast appears (success-light background, auto-dismiss 2400ms, animated via `as-fadein 0.2s`, gated on `prefers-reduced-motion`). The unsaved indicator in the section header disappears on save.

**TR-008 Assessment Scheme — grade-scoped subject selector**
A two-level selector (grade dropdown → subject dropdown) is shown in the right column header area:
- Grade dropdown: lists all configured grade levels for the school (e.g., 10, 11, 12). Label "Khối lớp" (UPPERCASE, 10.5px/800, muted). Placeholder "— Chọn khối —".
- Subject dropdown: disabled until a grade is selected; lists all active subjects for the selected grade level from the subject catalogue (US-E12.3). Label "Môn học". Placeholder "— Chọn môn —". If grade has no subjects: shows disabled option "Không có môn học nào cho khối này."
- Grid: 1fr | 2fr, gap 12.

**TR-009 Assessment Scheme — no-subjects banner (not-configured state)**
When the subject catalogue has zero active subjects across all grades, a warning banner is shown above the two-column grid (not inside the right column). Banner contains: alertTriangle icon box (36×36, warning+'22' tint), title "Cần thiết lập danh mục môn học trước" (14px/800, `--edu-warning-text` color per ADR 0046), body text, and a CTA button "Đến Danh mục môn học" navigating to `/admin/subjects`.

**TR-010 Assessment Scheme — no-subject-picked state**
When no subject has been selected via the picker, the right column body shows a centered empty-state: bookOpen icon (30px, border color), title "Chọn khối và môn học để bắt đầu" (13px/700, text-secondary), body text (11.5px).

**TR-011 Assessment Scheme — empty state (subject selected, no scheme configured)**
When a subject+grade is selected but no assessment scheme has been saved yet, the right column body shows: clipboardList icon (30px), title "Chưa có khung đánh giá cho môn học này." (14px/800), body text, and inline preset-create buttons (one per preset: TT22/2021, THCS TT26, Tùy chỉnh). Clicking a preset-create button initialises the editor with that preset's columns and marks as dirty.

**TR-012 Assessment Scheme — subject heading tile**
When a subject is selected (scheme exists or newly created from empty), the right column shows a subject heading tile: primary+'0A' background, primary+'33' border, radius 12. Contains: grade icon box (40×40, "LỚP" label 9px/800 + grade number 14px/900 tabular-nums, primary tint), title "Khung đánh giá — {subjectName}" (15px/800), subject code (11px monospace, muted), and two locked-meta tiles for periodCount ("Số tiết / năm") and requiredAssessmentCount ("Số bài KT / kỳ") — both read-only from subject master, with lock icon and tooltip "Khoá theo Subject master — chỉ chỉnh tại Danh mục môn học".

**TR-013 Assessment Scheme — preset pills**
Above the scheme editor, preset pills are displayed with a "Khung mẫu" label (10.5px/800 muted uppercase). Three presets: Theo Thông tư 22/2021, THCS Thông tư 26, Tùy chỉnh. Activating a preset replaces the current column list with preset defaults and marks as dirty.

**TR-014 Assessment Scheme — column list editor**
The scheme editor shows a list of assessment columns (components):
- Columns: kind (TX/GK/CK type badge), label (text input), count (number input, integer ≥ 1), weight (number input, %, integer), delete button
- Header row: "Cột điểm" | "Số lần" | "Trọng số" | (delete col)
- Column type tints: TX = primary/15 tint, GK = warning/15 tint, CK = error/15 tint (per design-system.md)
- Kind selector label: "Loại cột" (10.5px/800 muted uppercase)
- Add column button: "Thêm cột điểm" (full-width dashed border, primary color)

**TR-015 Assessment Scheme — weight validation (blocking)**
The total weight of all columns is displayed in real time as "Tổng trọng số: {value}% — hợp lệ" (success tint) or "Tổng trọng số: {value}% — chưa đủ 100%" (error tint). A weight-sum live region (`aria-live="polite"`) announces changes for screen reader users. Save is blocked when weight ≠ 100%. An error callout is shown when weight ≠ 100%: title "Tổng trọng số phải bằng 100% (hiện tại {value}%)" (12.5px/800), body "Học bạ sẽ không lưu được khung này..." (11.5px).

**TR-016 Assessment Scheme — save per subject**
"Lưu khung đánh giá" button. Disabled when weight ≠ 100% OR not dirty. On successful save: inline success toast (same pattern as grade scale, auto-dismiss 2400ms, `prefers-reduced-motion` gate). Unsaved indicator disappears.

**TR-017 Unsaved changes indicator**
Both the grade scale section header and the assessment scheme section header display a pill indicator "Chưa lưu" (10.5px/800, warning color, 6px dot, warning-light background) when the corresponding section has unsaved edits. The indicator disappears on successful save.

**TR-018 Loading state**
While data is being fetched (grade scale, grade levels, subjects, scheme), the screen shows accessible skeleton loaders. The main loading skeleton has an `aria-label` visible to screen readers (i18n key: `loading`).

**TR-019 Error state**
On network/server errors, an error callout is displayed with a retry action. Error keys: `errorNotFound`, `errorForbidden`, `errorNetwork`, `errorUnknown`.

### Non-Functional Requirements

**TR-020 Accessibility (WCAG 2.1 AA)**
- All icon-only buttons (move up, move down, delete band, delete column) MUST have `aria-label` in Vietnamese from the i18n namespace.
- Weight-sum progress: `aria-live="polite"` live region on the total-weight display.
- Count input: `aria-describedby` pointing to the column label for context.
- Loading skeleton: accessible name via `aria-label`.
- Focus management on add-row and delete-row: focus returns to the add button after deletion, or advances to the new row after addition.
- Touch targets: minimum 44×44px on all interactive controls (buttons, inputs, color picker wrapper).
- Empty-state live region: `aria-live` on state transitions.

**TR-021 Motion-safe**
The success toast fade-in animation (`as-fadein 0.2s ease-out`) MUST be gated behind `@media (prefers-reduced-motion: no-preference)`. Under `prefers-reduced-motion: reduce`, the toast appears immediately without animation.

**TR-022 Token-only styling**
No raw color values (`#fff`, `slate-100`, etc.) in the implementation. All colors use semantic tokens from `src/app/tokens.css`. The `--edu-warning-text: #9a6a0f` token (ADR 0046) MUST be added to `src/app/tokens.css` before implementing the NoSubjectsBanner title color.

**TR-023 i18n**
All UI strings use the `assessmentScheme` namespace from `src/bootstrap/i18n/messages/{vi,en}.json`. No hardcoded Vietnamese strings in `.tsx` files.

**TR-024 Performance**
Initial page load: grade levels and existing grade scale fetched in parallel (two concurrent mock calls). Scheme data fetched on-demand when a subject is selected (not preloaded for all subjects).

---

## Part 2 — Integration Map (mock-first)

### Service Context

The `core` service is **not yet built** (decision `0014`). All BE endpoints for this screen are mock-first. The DI factory uses a `USE_MOCK` guard to route to in-memory mock data. The mock shapes MUST match the future real contract exactly so the switch to real BE requires only removing the `USE_MOCK` guard.

When the `core` service is ready, the real endpoints will be at:

| Endpoint | HTTP | Purpose |
|----------|------|---------|
| `GET /core/api/v1/config/grade-scale` | GET | Fetch current school grade scale bands |
| `PUT /core/api/v1/config/grade-scale` | PUT | Save updated grade scale bands |
| `GET /core/api/v1/grade-levels` | GET | Fetch configured grade levels for the school |
| `GET /core/api/v1/subjects?gradeLevel={n}` | GET | Fetch active subjects for a grade level |
| `GET /core/api/v1/subjects/{subjectId}/assessment-schemes/{yearLabel}` | GET | Fetch scheme for subject × year |
| `PUT /core/api/v1/subjects/{subjectId}/assessment-schemes/{yearLabel}` | PUT | Save scheme for subject × year |

All endpoints follow the standard edu-api response envelope (decision `0008`): `{ success, data, error, meta }`. The HTTP client (`bootstrap/lib/http.ts`) unwraps to `data` automatically; repositories receive the payload directly.

### Data Contracts

**GradeScaleBand (domain entity)**
```ts
interface GradeScaleBand {
  id: string          // client-side uuid (stable key for React)
  label: string       // "Xuất sắc", "Giỏi", etc.
  from: number        // lower threshold (inclusive), e.g. 9.5
  to: number          // upper threshold (inclusive), e.g. 10
  color: string       // hex string e.g. "#13DEB9"
}
```

**GradeScaleDto (BE response shape — camelCase per api-integration rule)**
```ts
interface GradeScaleResponseDto {
  bands: Array<{
    label: string
    from: number
    to: number
    color: string
  }>
  preset: "vn10" | "gpa4" | "letter" | "custom"
  updatedAt: string   // ISO 8601
}
```

**AssessmentColumn (domain entity)**
```ts
interface AssessmentColumn {
  id: string
  kind: "TX" | "GK" | "CK"   // column type
  label: string               // "Điểm thường xuyên"
  count: number               // number of assessments (≥ 1)
  weight: number              // integer percent, e.g. 20
}
```

**AssessmentSchemeDto (BE response shape)**
```ts
interface AssessmentSchemeResponseDto {
  subjectId: string
  gradeLevel: number
  yearLabel: string
  columns: Array<{
    kind: "TX" | "GK" | "CK"
    label: string
    count: number
    weight: number
  }>
  updatedAt: string
}
```

**SubjectForPickerDto (from subjects endpoint)**
```ts
interface SubjectPickerItemDto {
  id: string
  name: string          // "Toán lớp 10"
  code: string          // "MATH10"
  gradeLevel: number
  periodCount: number
  requiredAssessmentCount: number
}
```

### Auth/Token Requirements

All endpoints require `Authorization: Bearer <accessToken>` (from httpOnly cookie via `createServerHttpClient()`). IAM claim `role: "admin"` must be present on the token. BE enforces role check; FE also enforces at route level via role guard middleware (decision `0022`).

### Error Mapping

| BE error code | Domain failure | UI key |
|---------------|----------------|--------|
| `FORBIDDEN` / 403 | `forbidden` | `errorForbidden` |
| `NOT_FOUND` / 404 | `notFound` | `errorNotFound` |
| Network / transport error | `networkError` | `errorNetwork` |
| Any other | `unknown` | `errorUnknown` |

### Mock-First Configuration

```
src/
└── features/assessment-scheme/
    ├── domain/
    │   ├── entities/grade-scale-band.entity.ts
    │   ├── entities/assessment-column.entity.ts
    │   ├── entities/subject-picker-item.entity.ts
    │   ├── failures/assessment-scheme.failure.ts
    │   └── repositories/
    │       ├── i-grade-scale.repository.ts
    │       └── i-assessment-scheme.repository.ts
    └── infrastructure/
        ├── repositories/
        │   ├── grade-scale.repository.ts           (real — calls PUT /config/grade-scale)
        │   └── assessment-scheme.repository.ts      (real — calls GET/PUT /subjects/:id/...)
        └── repositories/
            ├── grade-scale.mock.repository.ts       (USE_MOCK guard)
            └── assessment-scheme.mock.repository.ts (USE_MOCK guard)
```

DI factory (`bootstrap/di/assessment-scheme.di.ts`) toggles on `process.env.USE_MOCK === "true"`. Mock seed data uses the DR-001 examples (Thang 10 bands; Toán lớp 10 TT22 scheme).

**yearLabel is currently fixed** to `"2024-2025"` (DEFAULT_YEAR constant). A year selector driven by the academic calendar (US-E12.2) is a deferred follow-up.

---

## Part 3 — Use Cases & Acceptance Criteria

### UC-01: Admin views the assessment config screen

**Actors:** Admin  
**Preconditions:** Authenticated as `admin`; school has at least one grade level configured (US-E12.1 done)

**Main Flow:**
1. Admin navigates to `/admin/assessment` (from sidebar or school-setup step 4 link).
2. System shows the role guard — admin passes.
3. System fetches grade scale and grade level list in parallel (mock calls).
4. System renders the page: header with breadcrumb + onboarding badge, left column (grade scale), right column (assessment scheme selector).

**Given/When/Then:**

```
Given the user is authenticated as admin on tenant T
When they navigate to /admin/assessment
Then the page renders with:
  - breadcrumb "Trang chủ → Thiết lập trường → Thang điểm & Khung ĐG"
  - page title "Thang điểm & Khung đánh giá" at 22px/800
  - step badge "Bước 4/5 · Onboarding"
  - ADMIN badge with shield icon
  - left column Grade Scale section visible
  - right column Assessment Scheme section visible with subject picker (grade select enabled, subject select disabled)
```

---

### UC-02: Admin views the not-configured state (no subjects)

**Preconditions:** Subject catalogue has zero active subjects

**Given/When/Then:**

```
Given the subject catalogue has no active subjects
When admin opens /admin/assessment
Then the NoSubjectsBanner is displayed ABOVE the two-column grid
  AND the banner shows alertTriangle icon, title "Cần thiết lập danh mục môn học trước"
  AND the title color uses --edu-warning-text (#9a6a0f) NOT white (ADR 0046 — contrast on warningLight)
  AND a "Đến Danh mục môn học" CTA button is visible
  AND clicking the CTA navigates to /admin/subjects
```

---

### UC-03: Admin applies a grade scale preset

**Preconditions:** Admin is on the assessment config screen

**Given/When/Then:**

```
Given the grade scale section is displayed with existing bands
When admin clicks the "Thang 10" preset pill
Then the band list is replaced with the Thang 10 default bands:
  Xuất sắc [9.5, 10] #13DEB9
  Giỏi [8.0, 9.4] #5D87FF
  Khá [6.5, 7.9] #FFAE1F
  Trung bình [5.0, 6.4] #8898A9
  Yếu [0, 4.9] #FA896B
  AND the "Thang 10" pill becomes active (primary border + tint)
  AND the unsaved indicator "Chưa lưu" appears in the section header
  AND the "Lưu thang điểm" button becomes enabled
```

---

### UC-04: Admin edits grade scale bands

**Given/When/Then:**

```
Given a band list is displayed
When admin edits the "from" value of the "Giỏi" band to 7.5
Then the from input shows 7.5
  AND the validation rules re-evaluate immediately:
    - if 7.5 creates a gap with "Khá" band, a warning callout appears
    - if 7.5 overlaps "Xuất sắc", an error callout appears
  AND the unsaved indicator appears
  AND the band row's rank badge updates to reflect the new threshold (preview)
```

```
Given admin clicks "Thêm mức điểm"
Then a new empty row appears at the bottom of the band list
  AND focus moves to the label input of the new row
  AND the unsaved indicator appears
```

```
Given admin clicks the delete button on a band row
Then that band row is removed
  AND focus returns to the "Thêm mức điểm" button
  AND validation re-evaluates
```

```
Given admin clicks move-up on the topmost band row
Then the move-up button for that row is disabled (opacity 0.35)
  AND clicking it has no effect
```

---

### UC-05: Admin saves the grade scale (success)

**Given/When/Then:**

```
Given the grade scale has valid bands (no overlap errors, not empty) and is dirty
When admin clicks "Lưu thang điểm"
Then the system calls PUT /core/api/v1/config/grade-scale (mock) with the band payload
  AND on success:
    - the inline success toast appears ("Đã lưu thang điểm.")
    - the unsaved indicator disappears
    - the save button becomes disabled (not dirty)
    - the toast auto-dismisses after 2400ms
    - if prefers-reduced-motion is set, the toast appears without animation
```

---

### UC-06: Admin saves the grade scale with overlap error (blocked)

**Given/When/Then:**

```
Given two bands have overlapping score ranges (e.g. Giỏi [8.0, 9.4] and Xuất sắc [9.0, 10])
When admin attempts to click "Lưu thang điểm"
Then the save button is disabled
  AND an error callout "Các ngưỡng bị chồng lấn" is visible with error styling
  AND the aria-describedby on affected inputs points to the callout
  AND no API call is made
```

---

### UC-07: Admin selects a grade level in the subject picker

**Given/When/Then:**

```
Given grade levels [10, 11, 12] are configured
When admin selects "Lớp 10" in the grade dropdown
Then the subject dropdown becomes enabled
  AND the subject dropdown is populated with active subjects for grade 10
  AND the right column body shows the NoSubjectPicked state ("Chọn khối và môn học để bắt đầu") until a subject is picked
```

```
Given grade 11 has no active subjects in the catalogue
When admin selects "Lớp 11"
Then the subject dropdown shows disabled option "Không có môn học nào cho khối này."
  AND the NoSubjectPicked state remains in the body
```

---

### UC-08: Admin selects a subject (scheme exists)

**Given/When/Then:**

```
Given admin has selected grade 10 and selects "Toán lớp 10"
  AND a scheme for Toán lớp 10 / 2024-2025 already exists in the mock
When the scheme data is fetched
Then the SchemeEditor is displayed with:
  - subject heading tile: "Khung đánh giá — Toán lớp 10" with grade icon box showing "LỚP" / "10"
  - locked meta tiles: Số tiết / năm = 105, Số bài KT / kỳ = 4
  - lock icon and tooltip "Khoá theo Subject master — chỉ chỉnh tại Danh mục môn học" on both tiles
  - preset pills: TT22/2021 (active if matching), TT26, Tùy chỉnh
  - column list: Điểm thường xuyên (TX, 2 lần, 20%), Điểm giữa kỳ (GK, 1 lần, 30%), Điểm cuối kỳ (CK, 1 lần, 50%)
  - weight display: "Tổng trọng số: 100% — hợp lệ" (success tint)
  - "Lưu khung đánh giá" button disabled (not dirty)
```

---

### UC-09: Admin selects a subject (no scheme yet — empty state)

**Given/When/Then:**

```
Given admin selects a subject that has no saved scheme
When the fetch returns no data for that subject × year
Then the NoSchemeYet state is displayed:
  - clipboardList icon
  - title "Chưa có khung đánh giá cho môn học này."
  - three preset-create buttons: "Tạo khung đánh giá · Theo Thông tư 22/2021", "· THCS Thông tư 26", "· Tùy chỉnh"
```

```
Given the NoSchemeYet state is showing
When admin clicks "Tạo khung đánh giá · Theo Thông tư 22/2021"
Then the SchemeEditor appears pre-populated with TT22 defaults:
  Điểm thường xuyên TX 2 lần 20%
  Điểm giữa kỳ GK 1 lần 30%
  Điểm cuối kỳ CK 1 lần 50%
  AND the scheme is marked dirty
  AND weight display shows "Tổng trọng số: 100% — hợp lệ"
  AND "Lưu khung đánh giá" is enabled
```

---

### UC-10: Admin edits scheme weights — weight ≠ 100%

**Given/When/Then:**

```
Given the SchemeEditor shows columns totalling 100%
When admin changes "Điểm cuối kỳ" weight from 50% to 40%
Then:
  - weight display updates to "Tổng trọng số: 90% — chưa đủ 100%" (error tint)
  - the aria-live region announces the change to screen readers
  - an error callout appears: "Tổng trọng số phải bằng 100% (hiện tại 90%)"
  - "Lưu khung đánh giá" button is disabled
```

---

### UC-11: Admin saves the assessment scheme (success)

**Given/When/Then:**

```
Given the scheme has weight total = 100% and is dirty
When admin clicks "Lưu khung đánh giá"
Then the system calls PUT /core/api/v1/subjects/{subjectId}/assessment-schemes/{yearLabel} (mock)
  AND on success:
    - success toast "Đã lưu khung đánh giá." appears with auto-dismiss 2400ms
    - prefers-reduced-motion: toast appears without animation if set
    - unsaved indicator disappears
    - save button becomes disabled (not dirty)
```

---

### UC-12: Admin adds a new column to the scheme

**Given/When/Then:**

```
Given the SchemeEditor is showing
When admin clicks "Thêm cột điểm"
Then a new column row appears at the bottom with empty label, count=1, weight=0
  AND focus moves to the label input of the new row
  AND weight total updates immediately (now ≠ 100% if it was = 100% before)
  AND the scheme is marked dirty
```

---

### UC-13: Admin deletes a column from the scheme

**Given/When/Then:**

```
Given the scheme has 3 columns
When admin clicks the delete button on the second column
Then that column is removed
  AND focus returns to the "Thêm cột điểm" button
  AND weight total recalculates immediately
```

```
Given the scheme has exactly 1 column
When admin attempts to click the delete button
Then the delete action is blocked (button disabled or shows tooltip "Cần ít nhất 1 cột")
  AND the column is NOT removed
```

---

### UC-14: Admin encounters a network error on save

**Given/When/Then:**

```
Given the save API call fails with a network error
When admin clicks "Lưu thang điểm" or "Lưu khung đánh giá"
Then an error message "Lưu thất bại. Vui lòng thử lại." is displayed
  AND the form data is preserved (no data loss)
  AND the save button becomes enabled again so admin can retry
```

---

### UC-15: Non-admin attempts to access the route (role guard)

**Given/When/Then:**

```
Given a user is authenticated as teacher (or principal, student, parent)
When they navigate to /admin/assessment directly
Then they are redirected to their own workspace
  AND no assessment config content is rendered
  AND no API calls for this screen are made
```

---

### UC-16: Admin uses keyboard navigation

**Given/When/Then:**

```
Given the assessment config screen is focused
When admin uses Tab to navigate
Then every interactive element is reachable in logical order:
  preset pills → band rows (label → from → to → color picker → move up → move down → delete) →
  add band button → save button → grade selector → subject selector →
  (scheme editor) preset pills → column rows (kind → label → count → weight → delete) →
  add column button → save scheme button

When admin focuses a move-up or move-down icon-only button
Then the button has a visible focus ring (--ring)
  AND has an accessible aria-label: "Di chuyển lên" / "Di chuyển xuống"

When admin focuses the delete-band or delete-column icon-only button
Then it has aria-label "Xoá mức điểm" / "Xoá cột"
```

---

## Part 4 — Engineering-Ready Spec

### Summary for FE Team

This screen is the step-4 admin config for two school-wide data sets: the grade scale (which maps score ranges to grade labels used on transcripts) and the assessment scheme (which maps grade-book column structure — count × weight — to a specific subject × grade × year). Both are admin-only, school-scoped, and currently mock-first against the `core` service.

### Token Prerequisite (BLOCKING before implementation)

ADR 0046 requires adding `--edu-warning-text: #9a6a0f` to `src/app/tokens.css` before implementing the `NoSubjectsBanner` title. This token is used for amber text on `warningLight` backgrounds (14px/800 or larger only per the usage constraint). Without it, the banner title would require a raw hex, violating the tokens-only rule.

**FE must run this first:**
1. Add `--edu-warning-text: #9a6a0f` to `src/app/tokens.css`
2. Map in `globals.css` `@theme` block: `--color-edu-warning-text: var(--edu-warning-text)`
3. Update `docs/product/design-system.md` §Palette

### I18n Consolidation Resolution

The designer flagged three key conflicts between older keys (from initial implementation) and newer keys (added during the 1506 design handoff iteration). Resolution:

| Conflict | Old key (keep or retire) | New key (canonical) | Decision |
|----------|--------------------------|---------------------|----------|
| `totalWeightLabel` vs `weightSumLabel` | Retire `weightSumLabel` | **`totalWeightLabel`** | The implemented UI uses `totalWeightLabel` for the "Tổng trọng số" label in the column table. `weightSumLabel` / `weightSumTarget` are older keys from the initial PR that describe the numeric running total. Both can coexist but the visible table header uses `totalWeightLabel`. FE should use `totalWeightLabel` for the column header and `weightSumValid` / `weightSumInvalid` / `weightSumInvalidSR` for the live running total. |
| `addBand` vs `addBandLabel` | Retire `addBand` | **`addBandLabel`** | `addBandLabel` = "Thêm mức điểm" (full phrase with noun) is the canonical key for the add-band button label. `addBand` = "Thêm mức" is a shorter variant from the first iteration. FE uses `addBandLabel`. `addBand` can be pruned in a chore. |
| `gradeLevelHeader` ("LỚP") | **Keep** | `gradeLevelHeader` | "LỚP" (9px/800, uppercase, letterSpacing 0.06em) is the label shown INSIDE the grade icon box in the subject heading tile — it is not a duplicate of `gradeLevelLabel` ("Khối lớp") which labels the dropdown. They serve different UI surfaces. Both must be kept. |

**Dead keys identified (harmless — prune in a chore):**
- `applyPreset` — unused (preset application is handled by clicking the pill, no separate "apply" button)
- `presetTT22` — superseded by `applyPresetTT22` (direct apply); the pill label itself uses `presetThang10`, `presetThang4`, `presetLetter` for grade scale and the scheme preset labels are inline
- `yearLabel` / `yearLabelPlaceholder` — year is currently fixed to DEFAULT_YEAR; selector is deferred

### Feature Module Layout

```
src/features/assessment-scheme/
├── domain/
│   ├── entities/
│   │   ├── grade-scale-band.entity.ts       # { id, label, from, to, color }
│   │   ├── assessment-column.entity.ts      # { id, kind, label, count, weight }
│   │   └── subject-picker-item.entity.ts   # { id, name, code, gradeLevel, periodCount, requiredAssessmentCount }
│   ├── failures/
│   │   └── assessment-scheme.failure.ts    # union: forbidden | notFound | networkError | unknown
│   ├── repositories/
│   │   ├── i-grade-scale.repository.ts
│   │   └── i-assessment-scheme.repository.ts
│   └── use-cases/
│       ├── get-grade-scale.use-case.ts
│       ├── save-grade-scale.use-case.ts
│       ├── get-subjects-for-grade.use-case.ts
│       ├── get-assessment-scheme.use-case.ts
│       └── save-assessment-scheme.use-case.ts
├── infrastructure/
│   ├── dtos/
│   │   ├── grade-scale-response.dto.ts
│   │   └── assessment-scheme-response.dto.ts
│   ├── mappers/
│   │   ├── grade-scale.mapper.ts
│   │   └── assessment-scheme.mapper.ts
│   └── repositories/
│       ├── grade-scale.repository.ts           # real (USE_MOCK=false)
│       ├── grade-scale.mock.repository.ts
│       ├── assessment-scheme.repository.ts     # real
│       └── assessment-scheme.mock.repository.ts
└── presentation/
    ├── assessment-scheme-screen/
    │   ├── assessment-scheme-screen.i-vm.ts
    │   └── assessment-scheme-screen.tsx        # 'use client'
    ├── grade-scale-section/
    │   ├── grade-scale-section.i-vm.ts
    │   └── grade-scale-section.tsx
    └── scheme-editor/
        ├── scheme-editor.i-vm.ts
        └── scheme-editor.tsx
```

### Endpoint Constants

```ts
// bootstrap/endpoint/assessment-scheme.endpoint.ts
export const ASSESSMENT_SCHEME_EP = {
  gradeScale:      '/core/api/v1/config/grade-scale',
  gradeLevels:     '/core/api/v1/grade-levels',
  subjectsByGrade: (grade: number) => `/core/api/v1/subjects?gradeLevel=${grade}`,
  scheme:          (subjectId: string, yearLabel: string) =>
    `/core/api/v1/subjects/${subjectId}/assessment-schemes/${yearLabel}`,
} as const
```

### Component Placement Rules

| Component | Placement | Reason |
|-----------|-----------|--------|
| `AssessmentSchemeScreen` | `features/assessment-scheme/presentation/` | Single-screen root |
| `GradeScaleSection` | `features/assessment-scheme/presentation/` | Feature-specific |
| `SchemeEditor` | `features/assessment-scheme/presentation/` | Feature-specific |
| `BandRow` | `features/assessment-scheme/presentation/` | Feature-specific |
| `Callout` | `components/shared/callout/` | Used by ≥2 screens (assessment + discipline + others) — promote to shared |
| `NoSubjectsBanner` | `features/assessment-scheme/presentation/` | Currently single-screen use; promote if reused |
| `StatusBadge` | `components/shared/status-badge/` | Already shared (US-E07.4) |
| `AsPill` / preset pills | `features/assessment-scheme/presentation/` | Feature-specific variant |

### State Architecture

- **Grade scale state**: local React state (dirty flag, current bands list, active preset, validation state). Not remote-cached — loaded once on page mount, saved via Server Action.
- **Subject picker state**: local state (selectedGrade, selectedSubject). Grade levels fetched via TanStack Query key `['grade-levels']` on mount.
- **Assessment scheme state**: local React state (dirty flag, current columns, weight total). Loaded via TanStack Query key `['assessment-scheme', subjectId, yearLabel]` when subject is selected.
- **No global state** — no Zustand, no cross-feature store.
- Server Action (`saveGradeScaleAction`, `saveAssessmentSchemeAction`) is passed as a prop to the presentation component, not imported directly.

### Validation Logic (Domain Layer)

These rules live in the use-case layer (pure TypeScript, no framework):

```
validateBands(bands: GradeScaleBand[]): ValidationResult
  - empty: bands.length === 0 → error: errorEmptyBands
  - overlap: for any two bands i, j where i.from <= j.to && j.from <= i.to → error: errorOverlappingThresholds
  - gap: min(bands[].from) > 0 OR max(bands[].to) < domainMax → warning: errorGapsInCoverage
  (Non-blocking: gap warning does not prevent save; overlap error does)

validateColumns(columns: AssessmentColumn[]): ValidationResult
  - empty: columns.length === 0 → error: errorEmptyColumns
  - weight: sum(columns[].weight) !== 100 → error: errorWeightSumNot100 (blocking)
  - invalid count: any column.count < 1 → error: errorInvalidCount
```

### A11y Requirements (Checklist for FE)

All items below must be addressed before the story can be closed. A11Y findings resolved in fix commit `2ce0954` are already in the codebase — this list serves as the canonical behavioral spec:

| Ref | Element | Requirement |
|-----|---------|-------------|
| A11Y-041 | Weight-sum display | `aria-live="polite"` on the total-weight display region |
| A11Y-042 | Count input per column | `aria-describedby` pointing to the column label element |
| A11Y-043 | Loading skeleton | `aria-label` from `assessmentScheme.loading` i18n key |
| A11Y-044 | All icon-only buttons | Minimum 44×44px touch target; button.tsx `sm+icon` variant |
| A11Y-045 | Add/delete row | Focus to new row input on add; focus to "Thêm cột điểm" on delete |
| A11Y-046 | Empty state | `aria-live` on the no-subject-picked / no-scheme-yet containers |
| — | Move up/down buttons | `aria-label`: "Di chuyển lên" / "Di chuyển xuống" (assessmentScheme namespace) |
| — | Delete band button | `aria-label`: "Xoá mức điểm" |
| — | Delete column button | `aria-label`: "Xoá cột" |
| — | Color picker | `aria-label`: band label + " — chọn màu" |
| — | Success toast | `role="status"` or `aria-live="polite"` |
| — | Warning callout | `role="alert"` for overlap errors |

### Design-Review Gate Checklist

Per `docs/DESIGN_REVIEW.md`:
- Token compliance: all colors via semantic tokens only (no raw hex except inside native `<input type="color">` value attribute)
- `--edu-warning-text` token added before NoSubjectsBanner is implemented
- Column type tints: TX = `bg-edu-primary/15`, GK = `bg-edu-warning/15`, CK = `bg-edu-error/15` (per design-system.md §Status/badge mappings)
- StatusBadge reused from `components/shared/status-badge/` (no inline duplication)
- Storybook: 6 required states — loading / no-subjects / no-subject-picked / no-scheme-yet / grade-scale-editor / scheme-editor / weight-error
- `/impeccable audit` must pass (0 anti-patterns)

---

## Traceability Matrix

| Requirement | Use Case(s) | i18n Key(s) | BE Endpoint | Test Layer |
|-------------|-------------|-------------|-------------|------------|
| TR-001 Route guard | UC-15 | — | IAM auth cookie | Unit (route guard) |
| TR-002 Two-column layout | UC-01 | — | — | Storybook |
| TR-003 Page header | UC-01 | `pageTitle`, `pageSubtitle`, `step4Badge`, `breadcrumbSchoolSetup`, `breadcrumbAssessment` | — | Storybook |
| TR-004 Grade scale presets | UC-03 | `presetThang10`, `presetThang4`, `presetLetter`, `presetThang10Desc`, `presetGPA4Desc`, `presetLetterDesc` | — | Unit (preset replace) |
| TR-005 Band CRUD | UC-04 | `addBandLabel`, `removeBand`, `bandMoveUp`, `bandMoveDown`, `bandLabelPlaceholder` | — | Unit + Storybook |
| TR-006 Grade scale validation | UC-06 | `errorGapsInCoverage`, `errorOverlappingThresholds`, `errorEmptyBands`, `overlapCalloutTitle`, `overlapCalloutBody` | — | Unit (validateBands) |
| TR-007 Grade scale save | UC-05, UC-14 | `saveBands`, `scaleSavedToast`, `saveError`, `unsavedLabel` | PUT /config/grade-scale | Integration + Storybook |
| TR-008 Subject picker | UC-07 | `gradeLevelLabel`, `gradeLevelPlaceholder`, `subjectLabel`, `subjectPlaceholder`, `gradeLevelHeader`, `pickGrade`, `pickSubject`, `pickGradeFirst`, `noSubjectsForGrade` | GET /grade-levels, GET /subjects?gradeLevel= | Storybook |
| TR-009 No-subjects banner | UC-02 | `noSubjectsBannerTitle`, `noSubjectsBannerBody`, `goToSubjectCatalogue` | — | Storybook (no-subjects state) |
| TR-010 No-subject-picked | UC-07 | `noSubjectPickedTitle`, `noSubjectPickedBody` | — | Storybook |
| TR-011 Empty (no scheme) | UC-09 | `noSchemeTitle`, `noSchemeBody`, `createSchemeWithPreset` | GET /subjects/:id/... | Storybook (empty state) |
| TR-012 Subject heading tile | UC-08 | `schemeHeadingLabel`, `gradeLevelHeader`, `periodsPerYear`, `requiredExamsPerTerm`, `lockedFieldTooltip` | — | Storybook |
| TR-013 Scheme presets | UC-09 | `schemePresetsLabel`, `presetTT22`, `presetTT26`, `presetCustom`, `applyPresetTT22`, `presetTT26Desc`, `presetCustomDesc` | — | Unit (preset replace) |
| TR-014 Column list editor | UC-10, UC-12, UC-13 | `columnHeader`, `columnTimesHeader`, `columnWeightHeader`, `columnTypeTX`, `columnTypeGK`, `columnTypeCK`, `addColumnLabel`, `removeColumnLabel`, `removeColumnMinOne`, `columnKindLabel`, `columnNamePlaceholder` | — | Unit + Storybook |
| TR-015 Weight validation | UC-10 | `totalWeightLabel`, `weightSumValid`, `weightSumInvalid`, `weightSumInvalidSR`, `weightNotHundredTitle`, `weightNotHundredBody`, `errorWeightSumNot100`, `errorEmptyColumns`, `errorInvalidCount` | — | Unit (validateColumns) |
| TR-016 Scheme save | UC-11, UC-14 | `saveScheme`, `schemeSavedToast`, `saveError`, `unsavedLabel`, `unsavedChangesBody` | PUT /subjects/:id/schemes/:year | Integration + Storybook |
| TR-017 Unsaved indicator | UC-04, UC-10 | `unsavedLabel` | — | Storybook |
| TR-018 Loading state | UC-01 | `loading` | — | Storybook (loading state) |
| TR-019 Error state | UC-14 | `errorNotFound`, `errorForbidden`, `errorNetwork`, `errorUnknown` | — | Storybook (error state) |
| TR-020 A11y | UC-16 | all `aria-label` keys | — | A11y audit (A11Y-041–046) |
| TR-021 Motion-safe | UC-05, UC-11 | — | — | Manual + Storybook |
| TR-022 Token-only | all | — | — | Tech-lead review |
| TR-023 i18n | all | all `assessmentScheme.*` | — | `tsc --noEmit` |
| TR-024 Performance | UC-01 | — | parallel fetch | Integration |

### AC Coverage Status

| Use Case | AC Coverage | State |
|----------|-------------|-------|
| UC-01 View screen | Full | COVERED |
| UC-02 No-subjects banner | Full | COVERED |
| UC-03 Apply grade scale preset | Full | COVERED |
| UC-04 Edit grade scale bands | Full (add/edit/delete/reorder/boundary) | COVERED |
| UC-05 Save grade scale success | Full (toast + motion-safe) | COVERED |
| UC-06 Save blocked by overlap | Full | COVERED |
| UC-07 Grade/subject selector | Full (empty grade case) | COVERED |
| UC-08 Subject selected — scheme exists | Full (heading tile + locked fields + weight = 100%) | COVERED |
| UC-09 Subject selected — no scheme yet | Full (empty state + preset-create) | COVERED |
| UC-10 Edit scheme weight ≠ 100% | Full (live region + callout + save blocked) | COVERED |
| UC-11 Save scheme success | Full (toast + motion-safe) | COVERED |
| UC-12 Add column | Full (focus management + weight recalc) | COVERED |
| UC-13 Delete column (min 1) | Full (min-one guard + focus) | COVERED |
| UC-14 Network error on save | Full (form preserved + retry) | COVERED |
| UC-15 Role guard | Full | COVERED |
| UC-16 Keyboard navigation | Full (focus ring, aria-labels, tab order) | COVERED |

**UNCOVERED items:** None — all states and roles are covered.

**Open follow-ups (non-blocking, tracked in story):**
- Year selector (currently DEFAULT_YEAR = "2024-2025") — deferred to academic calendar integration
- Dead i18n keys prune (`applyPreset`, `presetTT22`, `yearLabel`, `yearLabelPlaceholder`) — chore

---

## Handoff to /fe

This spec is complete. The implementation already exists at `src/features/assessment-scheme/`. This BA spec serves as the retroactive formal artifact anchoring the delivered behavior.

**If re-implementing or extending this screen**, FE team must:

1. **FIRST:** Add `--edu-warning-text: #9a6a0f` to `src/app/tokens.css` + map in `globals.css` `@theme` + update `docs/product/design-system.md` (ADR 0046). This is a blocking prerequisite for the NoSubjectsBanner title color.
2. Reference `design_src/edu/assessment.jsx` (AssessmentSchemeScreen component) as the normative visual reference.
3. Reference `docs/product/design-spec.jsonc` §assessmentScheme (from line 1698) as the normative layout/value law.
4. Use only `assessmentScheme.*` i18n keys from `messages/{vi,en}.json` (51 canonical keys; 4 dead keys can be pruned).
5. i18n consolidation: use `totalWeightLabel` (not `weightSumLabel`) for the column header; use `addBandLabel` (not `addBand`) for the add-band button.
6. All icon-only buttons must have Vietnamese `aria-label` from the i18n namespace.
7. Success toast animations must be gated on `@media (prefers-reduced-motion: no-preference)`.
8. Column type tints: TX = `bg-edu-primary/15`, GK = `bg-edu-warning/15`, CK = `bg-edu-error/15`.

**FE command:** `/fe` → `fe-lead` → read this spec + the story file at `docs/stories/epics/E12-admin-core/US-E12.6-assessment-scheme.md`.
