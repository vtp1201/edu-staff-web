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

**Namespace decision**: extend the EXISTING `tenant` namespace with a new
`tenant.switch.*` sub-tree — grepped `messages/vi.json` first (`tenant.home.*`
and `tenant.select.*`, lines 2937–2950). `tenant.select.*` is the
already-implemented US-E01.2 ONE-TIME post-login choice screen (simple list,
no "current" badge, no header re-entry point, title "Chọn không gian làm
việc"). This DR's `TenantSelectScreen` is a **different, richer UX**
generated for this batch: card grid with logo/initial, address, role badge,
hover-lift, per-card loading state, and — critically — a **persistent header
menu re-entry point** ("Đổi trường") that `tenant.select.*` has no concept of.
Reusing `tenant.select.*` verbatim would either silently change the shipped
US-E01.2 copy or force two screens to share keys that diverge in shape
(no address/role-badge/current-badge in the old screen). Per the DR's own
instruction, keeping a distinct `tenant.switch.*` sub-tree (still nested
under `tenant`, not a new top-level namespace) — flagging to `uiux-lead`/`/ba`
that they may want to evaluate consolidating `tenant.select` and
`tenant.switch.postLogin` into one screen at implementation time, since they
serve overlapping post-login moments.

```jsonc
// vi.json → ADD "switch" object inside the EXISTING "tenant" namespace
"tenant": {
  // ...existing "home" and "select" keys unchanged...
  "switch": {
    "menuItem": "Đổi trường",
    "dialog": {
      "title": "Chọn trường",
      "description": "Tài khoản của bạn thuộc nhiều trường. Chọn trường để làm việc.",
      "close": "Đóng",
      "current": "Hiện tại",
      "switching": "Đang chuyển…",
      "cardAriaLabel": "{school}, {address}, vai trò {role}",
      "cardAriaLabelCurrent": "{school}, {address}, vai trò {role}, trường hiện tại",
      "toastSwitched": "Đã chuyển sang {school}"
    },
    "postLogin": {
      "title": "Chọn trường để tiếp tục",
      "greeting": "Xin chào {name} — tài khoản của bạn thuộc {count} trường.",
      "greetingNoName": "Tài khoản của bạn thuộc {count} trường.",
      "footnote": "Bạn có thể đổi trường bất kỳ lúc nào từ menu tài khoản."
    },
    "reloadingContext": "Đang tải dữ liệu {school}…"
  }
}
```

```jsonc
// en.json → ADD "switch" object (mirror)
"tenant": {
  // ...existing "home" and "select" keys unchanged...
  "switch": {
    "menuItem": "Switch school",
    "dialog": {
      "title": "Choose a school",
      "description": "Your account belongs to multiple schools. Pick one to work in.",
      "close": "Close",
      "current": "Current",
      "switching": "Switching…",
      "cardAriaLabel": "{school}, {address}, role {role}",
      "cardAriaLabelCurrent": "{school}, {address}, role {role}, current school",
      "toastSwitched": "Switched to {school}"
    },
    "postLogin": {
      "title": "Choose a school to continue",
      "greeting": "Hi {name} — your account belongs to {count} schools.",
      "greetingNoName": "Your account belongs to {count} schools.",
      "footnote": "You can switch schools anytime from the account menu."
    },
    "reloadingContext": "Loading {school}…"
  }
}
```

Notes:
- School name, address, role label are per-membership data (`TS_MEMBERSHIPS`
  mock), passed as interpolation params (`{school}`/`{address}`/`{role}`), not
  baked into strings.
- The role badge label reuses whatever role-name keys already exist
  (`shell.roles.*` — "Giáo viên", "Hiệu trưởng", …) rather than re-keying role
  names a third time; `/fe` should map `tenant.switch` card role text to
  `shell.roles.*` where the role matches an app role 1:1.

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
