# US-E13.7 Grade Book Parent Child-Switcher (DR-002)

## Status

planned

## Lane

normal

## Dependencies

- Depends on: US-E13.6 (grade book multi-role — implemented; provides `GradeBookTable`, `GetChildGradesUseCase`, `MockGradeBookRepository`)
- Blocks: none
- Feature module(s) chạm: `src/features/grades/` (extends existing module — parent view already has `/parent/grades` route)
- Shared contract/file: `bootstrap/endpoint/grades.endpoint.ts` (existing); `components/shared/grade-book-table/` (existing shared component from US-E13.6)

## Product Contract

**DR-002 enhancement** to the existing Grade Book (US-E13.6). Khi phụ huynh (`parent` role)
có **nhiều hơn 1 con** đang học, màn hình `/parent/grades` cần hiển thị bộ chuyển đổi
con (`ChildSwitcher`) để xem bảng điểm của từng con.

US-E13.6 đã implement `ParentView_SingleRow` (1 con, không có switcher). US-E13.7 **bổ sung**
trường hợp đa-con mà không phá vỡ single-child case.

**ChildSwitcher UI (từ `gradebook.jsx` DR-002):**
- Thanh tab ngang phía trên bảng điểm, mỗi tab = tên + lớp của 1 con.
- Đổi tab → reload `GradeBookTable` với dữ liệu của con được chọn (activeIdx thay đổi).
- Single child: switcher ẩn hoàn toàn — hành vi US-E13.6 giữ nguyên.
- Dữ liệu mỗi con: cùng cấu trúc `GradeBookRow[]` + thông tin lớp + sơ đồ phân phối điểm.
- `gradePublishMode` gate giữ nguyên (nếu `ADMIN_APPROVAL`, hiển thị banner "Chưa công bố").

**Scope tối thiểu:**
- Chỉ thêm `ChildSwitcher` component + logic chọn `activeIdx`.
- `GetChildGradesUseCase` đã có trong US-E13.6 — chỉ cần gọi với đúng `childId`.
- Không thay đổi layout, token, hay hành vi hiện tại của single-child parent view.

**Mock data:** `VIEWER_DATA_BY_CHILD` trong `gradebook.jsx` cung cấp seed cho 2 con:
- Child 0: Nguyễn Minh Khoa, lớp 11A2 (grade 11, đầy đủ HK1).
- Child 1: Nguyễn Thị Lan Anh, lớp 8B1 (grade 8, sparser).

## Relevant Product Docs

- `docs/product/screens.md` — Parent section `/parent/grades` (design-ready → update to planned after this story)
- Design source: `edustaff_5/edu/gradebook.jsx` `ChildSwitcher` component (line ~1081) + `VIEWER_DATA_BY_CHILD` (line ~367)
- `Grade Book v2.html` (edustaff_5 root) — standalone preview của DR-002 flow
- Epic overview: `docs/stories/epics/E13-teacher-workspace/EPIC-OVERVIEW.md`

## Acceptance Criteria

**AC1 — Single child (regression):**
- Parent với 1 con → `ChildSwitcher` không render → hành vi y hệt US-E13.6 `ParentView_SingleRow`.

**AC2 — Multi-child switcher renders:**
- Parent với ≥2 con → `ChildSwitcher` hiển thị tabs với tên + lớp của mỗi con.
- Default: tab đầu tiên (child index 0) active.

**AC3 — Switching children:**
- Click tab con khác → `GradeBookTable` reload với `childId` tương ứng.
- Active tab có visual indicator rõ ràng (underline / primary color).
- Loading skeleton hiển thị trong khi fetch.

**AC4 — Grade data per child:**
- Mỗi con có subject list riêng, scores riêng, GPA riêng.
- Điểm chưa công bố (`gradePublishMode=ADMIN_APPROVAL`) hiển thị banner đúng.

**AC5 — No regression on other roles:**
- Teacher, principal, student, admin views của Grade Book không thay đổi.
- Tất cả 739 tests của US-E13.6 vẫn pass.

**AC6 — Accessibility:**
- `ChildSwitcher` tabs dùng `role="tablist"` + `role="tab"` + `aria-selected`.
- `GradeBookTable` tương ứng có `role="tabpanel"`.
- Keyboard: Arrow left/right để di chuyển giữa tabs.

## Design Notes

- Design source: `edustaff_5/edu/gradebook.jsx` `ChildSwitcher` (line ~1081), `VIEWER_DATA_BY_CHILD` (line ~367)
- Commands: không có mutation (read-only view)
- Queries: `GetChildGradesUseCase` (existing từ US-E13.6) — gọi với `childId` khác nhau khi switcher đổi
- API: `core` service — mock-first (decision 0014); endpoint đã có trong `grades.endpoint.ts`
- Domain rules:
  - `childrenList: { childId, name, className }[]` từ parent profile/session claim.
  - `activeChildId` = local state trong `ParentGradeBookScreen`.
  - Khi `childrenList.length === 1`: `ChildSwitcher` không render, `activeChildId = childrenList[0].childId`.
- UI surfaces: `/parent/grades` → đã có RSC page + `GradeBookScreen` client component từ US-E13.6. Chỉ cần thêm `ChildSwitcher` vào `GradeBookScreen`'s parent branch.
- Component placement: `ChildSwitcher` → `features/grades/presentation/child-switcher/` (single-screen use → feature-local; promote to `components/shared/` nếu parent discipline screen cũng cần multi-child selector).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `ChildSwitcher` renders/hides based on childrenList length; `GetChildGradesUseCase` called with correct childId on switch |
| Integration | `MockGradeBookRepository.getChildGrades` với 2 childIds trả đúng data khác nhau |
| E2E | Storybook: `ParentView_SingleChild` (switcher absent), `ParentView_MultiChild_Tab1`, `ParentView_MultiChild_Switch` (tab2 loads different data), `ParentView_SwitchLoading` |
| Platform | — |
| Release | Design review gate passed; US-E13.6 test suite still 739/739 pass |

## Harness Delta

- Add row `US-E13.7` to `docs/TEST_MATRIX.md` when implemented.
- Update `docs/product/screens.md` Parent section `/parent/grades` status.

## Evidence

(empty — fill after implementation)
