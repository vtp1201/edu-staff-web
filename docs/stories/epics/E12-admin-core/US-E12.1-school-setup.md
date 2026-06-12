# US-E12.1 School Setup — Grade Level Range & Operational Settings

## Status

planned

## Lane

normal

## Product Contract

Admin (Hiệu trưởng / BGH) cấu hình thông số nền tảng của trường trước khi sử dụng
hệ thống: dải khối lớp (minGrade → maxGrade, 1–13), chế độ công bố điểm
(`IMMEDIATE` / `ADMIN_APPROVAL`), và theo dõi trạng thái hoàn thành 5-bước
onboarding. Màn hình hiển thị progress bar + collapsible guide + 4 preset buttons
(Tiểu học / THCS / THPT / K-12). Cảnh báo khi thu hẹp dải có lớp đang hoạt động.

BE stories tương ứng: US-049 (ADR 0035 — GradeLevelRange + Operational Settings).

## Relevant Product Docs

- `docs/product/screens.md` — mục "School Setup"
- `design_src/edu/school-setup.jsx` — **pixel reference** (route `/admin/school-setup`,
  US-049, ADR 0035)
- BE API (mock-first):
  - `GET  /api/v1/core/config/school`
  - `GET  /api/v1/core/config/school/setup-status`
  - `PUT  /api/v1/core/config/school/grade-levels` `{ minGrade, maxGrade }`
  - `PUT  /api/v1/core/config/school/operational-settings` `{ gradePublishMode }`

## Acceptance Criteria

- Route `app/[locale]/t/[tenant]/(app)/admin/school-setup/page.tsx`.
- Onboarding collapsible guide: 5-step checklist (grade levels, calendar, subjects,
  assessment, classes) với progress bar percent và auto-collapse khi all done.
- Grade level range form: preset buttons + manual min/max input + save.
  - Client-side: 1 ≤ minGrade ≤ maxGrade ≤ 13.
  - Warning callout khi `activeClassCount > 0` và range bị thu hẹp.
- Grade publish mode radio: `IMMEDIATE` / `ADMIN_APPROVAL` + save.
- Mock-first: `USE_MOCK` → mock repository; real: calls BE API above.
- `bun build` xanh; vitest unit cho grade-level validation logic.
- Design review pass (pixel-accurate so với `design_src/edu/school-setup.jsx`).

## Design Notes

- Design file: `design_src/edu/school-setup.jsx` — mở `design_src/edu/EduPortal.html`
  trong browser, chọn role=principal → school-setup để xem live.
- Sidebar principal: "Thiết lập trường học" item active state.
- Token colors: success badge cho step done, muted cho step pending.
- Preset button row: 4 pills (primary bg when matched, outline otherwise).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | grade-level validation (min/max/integer/range); setup-status derived flags |
| Integration | mock repository returns seed data; form save calls PUT |
| E2E | — |
| Platform | `bun build` xanh, `tsc --noEmit` clean |
| Release | design-review gate pass |

## Role Guard

Route `/admin/*` — chỉ role `admin` (decision `0022`). Route guard middleware
kiểm tra claim `role === "admin"`. `principal` không có quyền truy cập `/admin/*`.
BE dependency: IAM phải phát hành claim `role: "admin"` (xem decision `0022`).

## Harness Delta

Tạo mới E12-admin-core epic. Story này là entry point cho Admin Core flow
theo thứ tự onboarding: US-E12.1 → US-E12.2 → US-E12.3 → US-E12.4 → US-E12.5 → US-E12.6.
