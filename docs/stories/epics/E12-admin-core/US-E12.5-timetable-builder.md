# US-E12.5 Timetable Builder — Weekly Schedule with Conflict Detection

## Status

implemented

## Lane

normal

## Product Contract

Admin/BGH xây dựng thời khoá biểu tuần: mỗi slot (ngày × tiết × lớp) gán
giáo viên + môn học + phòng. Hệ thống tự detect conflict khi một giáo viên được
assign hai slot trùng (cùng ngày + tiết). Slot conflict hiển thị badge đỏ; click
mở editor để resolve bằng cách đổi giáo viên hoặc xóa slot.

BE story: US-045 (timetable with conflict detection, ADR 0029 — TeachingAssignment).

## Relevant Product Docs

- `design_src/edu/timetable.jsx` — **pixel reference** (route `/admin/timetable`,
  US-045, ADR 0029)
- BE API (mock-first):
  - `GET  /api/v1/core/timetable?classId=&yearId=`
  - `PUT  /api/v1/core/timetable/slots/:slotId`
  - `DELETE /api/v1/core/timetable/slots/:slotId`
  - `GET  /api/v1/core/timetable/conflicts?classId=&yearId=`

## Acceptance Criteria

- Route `app/[locale]/t/[tenant]/(app)/admin/timetable/page.tsx`.
- Class selector + academic year selector.
- Weekly grid (Mon–Sat × N periods). Filled slot: subject badge + teacher name +
  room. Empty slot: dashed placeholder "Thêm".
- Click slot → SlotEditor panel: subject select → teacher select (filtered to
  teachers with TeachingAssignment for that subject + class, per ADR 0029) → room
  input → Save / Clear.
- Conflict detection: conflict badge (red) on slot if teacher already assigned in
  another class at same (day, period). Conflict summary panel listing all conflicts.
- "Xuất PDF" button (mocked — placeholder toast).
- Mock-first (DI); vitest unit cho conflict-detection algorithm.
- Design review pass.

## Design Notes

- Design file: `design_src/edu/timetable.jsx`.
- Teacher select filter: chỉ show teachers có `TeachingAssignment` cho môn học +
  lớp đang chọn (quy tắc từ ADR 0029 — xem mock data `TT_TEACHERS` trong
  timetable.jsx).
- Conflict visual: `error/15` bg + error color border + conflict icon top-right.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | conflict detection algorithm (same teacher, same day+period, different class) |
| Integration | assign slot → conflict appears; resolve → conflict clears |
| E2E | — |
| Platform | `bun build` xanh |
| Release | design-review gate pass |

## Role Guard

Route `/admin/timetable` — chỉ role `admin` (decision `0022`).

## Evidence

```
Design review: pass
- design-system: conform — tokens-only, edu-* semantic vars, subject color tints via inline hex+'26' (documented exception for computed colors); no raw Tailwind color classes; typography/spacing/radius per scale
- a11y: WCAG AA — 9 findings (A11Y-001..009) identified by fe-accessibility-auditor, all fixed by fe-nextjs-engineer before close; contrast fixes (A11Y-001,002,003), dialog DOM order (A11Y-004), focus management (A11Y-005), label association (A11Y-006), scroll region keyboard (A11Y-007), in-dialog error (A11Y-008), aria-required/autocomplete (A11Y-009); prefers-reduced-motion gated globally; touch targets ≥44px; table with scope="col/row" headers
- impeccable audit: not run via CLI — WCAG AA audit by fe-accessibility-auditor serves as equivalent review for this story; findings resolved above
- states: loading (isPending transition), empty (dashed placeholder "Thêm" in each cell), error (in-dialog role="alert" + toast), success (dialog closes, grid updates); conflict state (badge + border + icon + ConflictSummary panel); 4 Storybook stories (Default/Empty/NoConflicts/WithSlotEditorOpen); overflow-x-auto with tabIndex on narrow viewports
```

## Harness Delta

- Story status: implemented
- Unit proof: 12 new (detectConflicts ×7, update-slot ×4, clear-slot ×1)
- Integration proof: 4 new (seed conflicts, assign→conflict, clear→resolve, class-scoped)
- Total: 233/233 Vitest pass (44 files); tsc --noEmit clean; bun build green
- Route: /[locale]/t/[tenant]/admin/timetable (ƒ Dynamic)
- TEST_MATRIX: row added (implemented)
