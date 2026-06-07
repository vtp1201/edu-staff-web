# US-E02.1 Teacher Attendance (end-to-end)

## Status

implemented

## Lane

normal

## Product Contract

Giáo viên điểm danh một buổi học: chọn lớp/ngày/tiết → roster học sinh, đặt trạng
thái (`present`/`excused`/`absent`), lưu; xem lịch sử điểm danh của lớp. Mock-first
(decision `0014`) qua `NEXT_PUBLIC_USE_MOCK`; khi BE `core` lên thì swap repo thật
qua DI — không đổi domain/presentation. Render trong App Shell (US-E08.1) + envelope
chuẩn (US-E06.1).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` (attendance screen), `screens.md`
- `.claude/rules/design-system.md`, `.claude/rules/accessibility.md`, `.claude/rules/i18n.md`
- `docs/DESIGN_REVIEW.md`, decision `0014` (mock-first), `0008` (envelope)

## Acceptance Criteria

- [x] Clean Architecture per-feature: `domain/` (entities, failure, i-repo,
  use-cases) + `infrastructure/` (dtos, mapper, real repo + mock repo + fixtures)
  + `presentation/attendance-screen/` (`.i-vm.ts` + components).
- [x] DI mock-first: `bootstrap/di/attendance.di.ts` → `USE_MOCK ? Mock : Real`.
- [x] Real repo nhận **payload** trực tiếp sau envelope (US-E06.1) — không đọc `.data`.
- [x] Page RSC `(app)/teacher/attendance` fetch qua use-cases; Server Action
  `saveAttendanceAction` → `SaveAttendanceUseCase` + `revalidatePath`.
- [x] Screen: filter lớp/ngày/tiết, summary, roster table editable, "tất cả có mặt",
  save (dirty guard + saving state + toast success/error), tab today/history, empty state.
- [x] i18n namespace `attendance.*` (vi nguồn, en mirror) — không hardcode copy.
- [x] Render trong App Shell; a11y + design tokens.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | use-case: get-roster, save-attendance (domain pure) |
| Integration | `attendance.repository` nhận payload sau envelope → map đúng entity |
| E2E / Story | Storybook `Attendance/AttendanceScreen` (WithRoster + Empty) |
| Platform | `bun run build` xanh |
| Release | design-review gate pass |

## Evidence

- Domain: `get-roster.use-case.test.ts` (1) + `save-attendance.use-case.test.ts` (3).
- Integration: `attendance.repository.test.ts` (3) — classes/roster map từ payload
  (boundary post-envelope, không re-read `.data`); save PUT đúng endpoint.
- Story: `attendance-screen.stories.tsx` — `WithRoster` (table + summary + controls)
  + `Empty` (no selection → friendly empty state).
- Wiring: `(app)/teacher/attendance/page.tsx` + `actions.ts` + `attendance.di.ts`
  (mock-first); render trong App Shell `(app)/layout.tsx`.
- Proof: **77 vitest pass**, `tsc --noEmit` clean, `bun run build` green.

### Design review: pass

- design-system: semantic tokens (`--edu-radius-card`, `border-border`,
  `text-muted-foreground`); Card/Tabs/Button reuse; status badge theo color
  mapping (present/excused/absent) + icon/label (không chỉ màu).
- a11y: roster controls keyboard-operable (shadcn Tabs/Button giữ ARIA); toast
  feedback; empty state mô tả bằng text; reduced-motion global-gated.
- impeccable audit: automated flow deferred (project chưa chạy `/impeccable init`,
  scope decision `0012`); chạy `DESIGN_REVIEW.md` checklist thủ công — không
  finding chặn.
- states: empty ✓, loading/saving ✓ (disabled + "Đang lưu…"), success/error ✓
  (toast); WithRoster + Empty trong Storybook; responsive header/controls.

## Harness Delta

Slice E02 thành story chính thức (trước đó code có nhưng chưa track/proof); thêm
integration repo test + Storybook story; xác nhận alignment với envelope (E06.1)
và App Shell (E08.1).
