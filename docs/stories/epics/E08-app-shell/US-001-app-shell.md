# US-E08.1 App Shell & Navigation

## Status

implemented

## Lane

normal

## Product Contract

Khung dùng chung cho mọi workspace role: Sidebar (collapsible) + Header (search,
notifications, role-switcher, profile menu) + main outlet, theo design-spec
(`docs/product/design-spec.jsonc` → `layout`). Nav data-driven theo role; phân
biệt role qua color accent (decision `0013`). Nguồn: app-shell plan trích từ
brainstorm sprint1, ghi durable ở decision `0014` (backup gốc đã xóa).

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

- `components/layout/app-shell/`: `app-shell.tsx` (holds role + collapse state;
  role-switch via next-intl `useRouter.push('/{role}')` → client nav, no full
  reload), `sidebar/sidebar.tsx` (collapse 260↔72px, `transition-[width] 250ms`,
  icon-only + Radix tooltip labels when collapsed, footer toggle), `nav-config.ts`
  (data-driven per role), `header/` (header + role-switcher).
- Collapse persistence: `sidebar/sidebar-collapse.ts` (pure, storage-injected) +
  `use-sidebar-collapsed.ts` hook (hydrate after mount → no SSR mismatch);
  key `eduportal:sidebar-collapsed`.
- New primitive `components/ui/tooltip/` (Radix umbrella) + story.
- i18n: added `shell.nav.expandSidebar` / `collapseSidebar` (vi + en).
- Active item conforms to design-spec: `bg-primary/12` + 3px left accent bar.
- Proof: **48 vitest pass** (10 new: `nav-config.test.ts` ×6, `sidebar-collapse.test.ts` ×4),
  `tsc --noEmit` clean, `bun run build` green. Storybook: Sidebar (per-role +
  Collapsed + WithToggle), Header, Tooltip stories.

### Design review: pass

- design-system: conform — semantic tokens only (`bg-sidebar`, `border-border`,
  `bg-primary/12`, `--edu-sidebar-width*`, `--edu-radius-*`); no raw color; sidebar
  pattern reused per spec; roles differ only by accent color (`--edu-role-*`).
- a11y: `aria-current="page"` on active link, `aria-label`+`aria-pressed` on
  toggle, collapsed labels exposed via keyboard-focusable tooltip, `SheetTitle`
  sr-only for mobile drawer; reduced-motion globally gated (globals.css); focus
  ring preserved (Radix/shadcn untouched).
- impeccable audit: automated flow deferred — project intentionally has no
  PRODUCT.md/DESIGN.md (`.claude/rules/impeccable.md`, scope decision `0012`), so
  ran the `DESIGN_REVIEW.md` checklist manually. One conflict: impeccable bans
  side-stripe borders >1px; EduPortal design-spec mandates the 3px active accent
  bar → **design system wins** (documented), kept as spec.
- states: shell chrome — nav active/hover/focus states present; collapsed +
  expanded + per-role covered in Storybook; responsive: mobile `Sheet` drawer
  (<lg), no break at 320px; dark mode via existing theme tokens.
