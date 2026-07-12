# DR-018 — Multi-Tenant Switch (đa trường)

- **US**: US-E23.1 (header menu + dialog) + US-E23.2 (post-login select
  screen) — new epic E23.
- **Route(s)**: header user-menu (all app routes, shell-level); post-login
  select screen at `(auth)/select-tenant` (only rendered when user belongs to
  ≥2 tenants).
- **Mockup**: `design_src/edu/tenant-switch.jsx` — `TenantSelectScreen`;
  header user-menu + dialog logic embedded in `design_src/edu/app.jsx`
  (search markers "P7 Multi-tenant").
- **Type**: **RECONCILE** — generated + audited (P7 in
  `PROMPTS-group-b-ui-gen.md`, P8 confirms "P7 tenant-switch ... đạt spec").
  No redesign.
- **Already-implemented check**: no dedicated tenant-switch feature/route in
  `src/` yet; `features/tenant` exists (used for the existing multi-role
  select-tenant flow, US-E01.2) — **coordinate namespace with that**, do not
  fork a parallel `tenantSwitch` i18n namespace if `tenant` already covers
  this shape. `uiux-ux-writer` must grep the existing `tenant` namespace in
  `messages/vi.json` first and extend it if the keys fit, otherwise add a
  clearly-scoped `tenant.switch.*` sub-tree (not a new top-level namespace).

## Scope

1. **Header user-menu**: current-tenant block (logo/initial, name, role badge
   at that tenant); "Đổi trường" item (only if ≥2 tenants) opens dialog.
2. **"Chọn trường" dialog**: card list — logo/initial 56px (role-icon radius
   16 token), name, short muted address, role badge, "Hiện tại" badge on the
   active one. Cards are real `<button>` ≥64px tall, hover-lift (shadow
   token), clear focus ring. Selecting another → per-card loading state →
   toast "Đã chuyển sang <Tên trường>" + context reload.
3. **Post-login select-tenant screen** (`TenantSelectScreen`, auth-layout like
   `login.jsx`): "Chọn trường để tiếp tục" + same card grid + note "đổi bất kỳ
   lúc nào từ menu tài khoản".
4. **Single-tenant users**: zero-noise — no menu item, no select screen.

## States

Loading (per-card switching state), success (toast + reload), n/a
empty/error at this granularity (tenant list comes from the authenticated
session — `/ba` to define the error path if `GET
/api/v1/members/me/tenants` fails).

## Design-spec entry

`docs/product/design-spec.jsonc` → `screens.tenantSwitch` (dialog card
dimensions, header menu block) + `screens.selectTenant` (post-login screen,
reusing the auth 2-col layout tokens from `screens.login`) — added by
`uiux-designer`.

## UX copy (i18n keys)

Check `tenant` namespace first (existing, from US-E01.2 select-role/tenant
flow). Extend with `tenant.switch.*` if compatible; otherwise document why a
separate namespace was needed.

<!-- UX-WRITER: insert tenant.switch.* (or documented alternative) key block here -->

## A11y (WCAG 2.1 AA)

- Tenant cards are real `<button>`, name+role read as one accessible unit.
- "Hiện tại" state conveyed by text, not style-only.
- Dialog: standard focus-trap semantics (Radix Dialog).

## BE contract

Service `iam`. `GET /api/v1/members/me/tenants`, `POST
/api/v1/members/switch-tenant`.

## Dependencies

None blocking within this batch.

## Status

- [ ] delivered
