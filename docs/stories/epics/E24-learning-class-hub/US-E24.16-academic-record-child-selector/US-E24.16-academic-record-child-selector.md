# US-E24.16 Học bạ — phụ huynh chọn con (child selector) trên màn Academic Record

## Status

planned

## Lane

normal

> Read-only; thêm 1 read (danh sách con) đã real; điều hướng giữa route có sẵn. Q-G (parent-links không
> regress) không bị chạm.

## Dependencies

- Depends on: none
- Blocks: none
- Feature module(s) chạm: `src/features/academic-records/presentation/academic-record-screen/**`
  (VM + container + screen slot), `src/app/[locale]/t/[tenant]/(app)/parent/children/[studentId]/
  academic-record/page.tsx` (thêm child list), `components/shared/child-switcher/` (reuse; có thể thêm
  prop `hideWhenSingle`).
- Shared contract/file: `ChildSwitcherVM` (shared, structural), `bootstrap/di/grades.di.ts`
  `makeGetChildListUseCase()` (reuse, không đổi), `messages` namespace `academicRecord` + `Common`.

## Hiện trạng FE (grep 2026-09-06)

- Route parent **hiện có**: `/parent/children/[studentId]/academic-record` (RSC
  `buildAcademicRecordVM({ role: "parent", studentId, year })` → `AcademicRecordContainer` → client
  `AcademicRecordScreen`, year = URL `?year=` qua `router.replace`). **Không có** `/parent/
  academic-record` (design ghi route này ở EPIC; jsx comment line 6 lại ghi
  `/parent/children/:studentId/academic-record`). Entry point: `/parent/children` (index card-per-child,
  US-E20.4) → link `academicRecordHref`.
- `AcademicRecordScreenVM { role, studentId, record, selectedYearId, error }` — không có danh sách con;
  screen multi-role (student/teacher/parent/admin) dùng `roleBadge`, empty copy theo role.
- Child list real: `makeGetChildListUseCase()` (grades.di — parent-links + IAM batch names, trả
  `ChildSummary` khớp `ChildSwitcherChild`) — đã dùng ở `/parent/attendance` và grades. Component
  `components/shared/child-switcher/` (tablist, arrow keys, `Common.childSwitcherLabel`,
  `childOrdinalLabel` fallback, `classPending`) — **canonical**; `discipline/parent-discipline/
  ChildSelector.tsx` là bản feature-local cũ (backlog hợp nhất, không đụng ở US này).
- i18n `academicRecord.*` đầy đủ cho màn; `Common.childSwitcherLabel` có → không cần key mới trừ
  `academicRecord.childSwitcher.hint` (tuỳ).

## Product Contract

Design v3: `design_src/edu/academic-record-view.jsx` (lines ~333–355): với PARENT, hàng nút chọn con
(`aria-pressed`, border 2px màu con, Avatar 34 + tên + "Lớp X", icon check khi chọn) đặt **trên**
`StudentHeader`; màu con index 0 → primary, 1 → success (giống attendance-portal).

- Giữ route hiện có; child selector = **`ChildSwitcher` shared** (tablist, không fork bản aria-pressed —
  decision 0026; ghi deviation "tablist thay aria-pressed, cùng semantics chọn 1"). Chọn con →
  `router.push(/parent/children/{childId}/academic-record)` (**bỏ `?year`** vì năm học khác nhau giữa 2
  con; VM tự chọn năm hiện tại). Active = `studentId` của route.
- Chỉ render khi `childList.length ≥ 2` (khớp rule design-spec discipline `singleChild: hidden`) —
  thêm prop `hideWhenSingle` cho `ChildSwitcher` nếu chưa có (additive, callers cũ không đổi).
- Route với `studentId` không thuộc `childList` → vẫn gọi BE (BE trả 403 → `forbidden` như hiện tại),
  selector không có tab active (không tự chuyển con — không đoán scope).
- Child list lỗi → ẩn selector, màn vẫn render (fail-soft, `Promise.allSettled` trong page).
- **[OPEN QUESTION Q1]** Có thêm route `/parent/academic-record` redirect 308 → con đầu tiên (mục nav
  "Học bạ" cho parent)? Mặc định **không** (parent nav không có mục học bạ; entry qua `/parent/children`);
  nếu uiux/BA yêu cầu → US riêng (đụng `nav-config.ts`).
- Loading khi đổi con: `useTransition` + `aria-busy` trên vùng record; ChildSwitcher `isLoading` chặn
  click con khác trong lúc pending (prop đã có).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` mục academic-record (1506 handoff) — thêm `parent.childSelector`
  (fe sync); `docs/product/screens.md` hàng Academic Record (per child)
- `docs/stories/epics/E20-*/US-E20.4-*`, `US-E20.5-*` (ChildSwitcher promotion, child list real)
- `.claude/rules/component-organization.md` (decision 0026), `accessibility.md`

## Acceptance Criteria

- Parent có ≥2 con: mở học bạ con A → selector hiện 2 tab, tab A `aria-selected`; chọn B → URL đổi sang
  `/parent/children/B/academic-record` (không có `?year`), record của B hiển thị, năm mặc định = năm
  hiện tại của B (page.test).
- Parent 1 con → không render selector (Storybook + test).
- Child list thất bại → không selector, record vẫn render; không toast lỗi thừa.
- studentId lạ → `forbidden` state như hiện tại; selector không active tab (test).
- Keyboard: arrow trái/phải di chuyển focus, Enter/Space chọn (test hiện có của ChildSwitcher không đổi;
  test mới cho `hideWhenSingle`).
- Student/teacher/admin route: VM không có `childSwitcher` → màn không đổi (snapshot/regression stories
  hiện có xanh).
- i18n: không key mới bắt buộc; nếu thêm `academicRecord.childSwitcher.*` → vi + en.
- Gate xanh; design-review + a11y.

## Design Notes

- VM: `AcademicRecordScreenVM.childSwitcher?: ChildSwitcherVM` (optional, parent only); container
  `onSwitchChild(childId)` → `router.push` (tenant base path tính ở page, truyền `basePath`).
- Page: `Promise.allSettled([buildAcademicRecordVM(...), makeGetChildListUseCase().execute()])`.
- UI: slot trên header trong `academic-record-screen.tsx`, chỉ khi `vm.childSwitcher`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `hideWhenSingle`; href builder |
| Integration | page.test parent: 2 con / 1 con / child-list error / foreign studentId |
| E2E | Storybook parent-with-switcher + switching pending |
| Platform | tsc/vitest/build |
| Release | design-review + a11y |

## Harness Delta

Backlog: hợp nhất `discipline/parent-discipline/ChildSelector.tsx` vào `ChildSwitcher` shared
(decision 0026) — ngoài scope US này.

## Evidence

(chưa có — planned)
