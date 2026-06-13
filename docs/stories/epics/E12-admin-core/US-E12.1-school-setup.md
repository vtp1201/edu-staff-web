# US-E12.1 School Setup — Grade Level Range & Operational Settings

## Status

implemented

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

## Implementation Evidence (2026-06-13)

### Phase 1 — Admin Role Enabler
- `nav-config.ts`: Role union + admin 7 items + DEFAULT_ROUTE export + ROLE_LABEL_KEY.admin
- `auth-user.entity.ts`: UserRole union includes "admin" (mock-first, decision 0014/0022)
- i18n: 7 shell.nav.* keys + shell.roles.admin + full adminSchoolSetup namespace (vi + en)
- Tests: nav-config.test.ts admin block (7 items, /admin hrefs, DEFAULT_ROUTE)

### Phase 2 — School Setup Screen
- Domain: validate-grade-range.use-case (13 unit tests), get-setup-progress.use-case (4 unit tests)
- Infrastructure: MockSchoolConfigRepository + SchoolConfigRepository (server-only, mock-first)
- Bootstrap: admin-school-setup.endpoint.ts + admin-school-setup.di.ts (USE_MOCK pattern)
- Presentation: SchoolSetupScreen ('use client'), .i-vm.ts, .stories.tsx (4 states)
- Route: app/[locale]/t/[tenant]/(app)/admin/school-setup/page.tsx (RSC) + actions.ts ('use server')

### Proof
- Tests: 126 passed (24 test files); domain TDD red→green confirmed
- tsc --noEmit: clean
- bun run build: all routes compiled; /admin/school-setup emitted
- Tech-lead review: Approved (4 should-fix follow-ups: mapper cast fixed, foreground token fixed)
- A11y audit: 9 blocking contrast violations fixed (A001–A009); 3 critical fixed (A010, A015, A018); touch targets fixed (A014); focus ring fixed (A013)
- Design review: PASS
  - design-system: conform (tokens-only, typography scale, card/badge/progress patterns)
  - a11y: WCAG AA fixed; keyboard OK (focus rings, fieldset+legend+label radio); reduced-motion OK
  - impeccable audit: deferred (PRODUCT.md not yet initialized — separate Harness item)
  - states: empty (unconfigured), error (validation + network), success (saved), loading/null handled; Storybook 4 stories

### Open Follow-ups (non-blocking)
- `school-config.repository.ts`: real-service error mapping (unauthorized + retryable) — deferred until core service live
- Storybook: add save-error story + play() interaction
- ADR for `--edu-role-admin` token (role-switcher uses primary color as fallback)
- Route role-guard story: `/admin/*` needs guard — amplified urgency now admin config surface exists (PRODUCT.md + guard story scope to be created)
