# US-E08.1 App Shell & Navigation

## Status

planned

## Lane

normal

## Product Contract

Khung dùng chung cho mọi workspace role: Sidebar (collapsible) + Header (search,
notifications, role-switcher, profile menu) + main outlet, theo design-spec
(`docs/product/design-spec.jsonc` → `layout`). Nav data-driven theo role; phân
biệt role qua color accent (decision `0013`). Nguồn: trích brainstorm
`.harness-backup/.../sprint1.md` (decision `0014`).

## Relevant Product Docs

- `docs/product/design-spec.jsonc` (layout.sidebar / layout.header), `screens.md`
- `.claude/rules/design-system.md`, `.claude/rules/accessibility.md`
- `docs/DESIGN_REVIEW.md`

## Acceptance Criteria

- `components/layout/app-shell/`: `app-shell.tsx` ('use client') + `sidebar/`
  (`sidebar.tsx`, `nav-config.ts` — nav items per role, data-driven) +
  `header/` (`header.tsx`, `role-switcher.tsx`).
- Sidebar: 260px / 72px collapsed, transition 0.25s, active item `primary/12` +
  3px left accent bar, collapse state ở `localStorage`; mobile dùng `Sheet`.
- Header: 64px, search 220px, notification bell 38px + badge, avatar dropdown,
  role-switcher đổi role **không full reload**.
- Plus Jakarta Sans qua `next/font/google` (latin + vietnamese, `display:swap`).
- A11y: keyboard nav, focus ring, tooltip label khi sidebar collapsed; reduced-motion.
- Layout `app/[locale]/(app)/layout.tsx` render AppShell.

## Design Notes

- UI surfaces: shell cho teacher/principal/student/parent + (shared) profile/messages/notifications.
- nav-config.ts: map role → nav items (icon, label key i18n, href). i18n namespace `shell.*`.
- **Role-guard KHÔNG thuộc story này** — dependency: server-side guard +
  redirect `/select-role` đến từ E05.1 (tenant resolver) + E01 (auth). Shell chỉ
  *consume* role/tenant đã resolve.
- Tái dùng shadcn: `sheet`, `dropdown-menu`, `scroll-area`, `tooltip`,
  `collapsible`, `avatar`, `input`, `badge` (qua `bun ui:add`).

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | nav-config trả đúng items theo role; collapse persist localStorage |
| Integration | role-switcher đổi role cập nhật nav không reload |
| E2E | đăng nhập → shell hiển thị đúng nav theo role |
| Platform | `bun build` xanh; Storybook shell story |
| Release | design-review gate pass (`docs/DESIGN_REVIEW.md`) |

## Harness Delta

Trích app-shell plan từ brainstorm (decision `0014`) thành story để không mất.

## Evidence

Add after implementation.
