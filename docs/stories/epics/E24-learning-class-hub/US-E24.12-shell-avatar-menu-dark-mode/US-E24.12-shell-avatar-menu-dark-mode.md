# US-E24.12 Shell: avatar dropdown (Hồ sơ / Chế độ tối / Ngôn ngữ / Đăng xuất) + sidebar bỏ `profile`, footer Hướng dẫn + Thu gọn

## Status

in-progress

## Lane

normal

> Không có BE. Chạm shell mọi role → review + a11y kỹ; dark token thật (Q-D) có thể cần token mới →
> ADR trước khi thêm (design-system rule), reviewer quyết.

## Dependencies

- Depends on: none
- Blocks: none (E24.13 chạm cùng `header.tsx` → **chạy tuần tự: E24.12 trước, E24.13 sau**)
- Feature module(s) chạm: `src/components/layout/app-shell/header/header.tsx` (+ stories/test),
  `sidebar/sidebar.tsx`, `sidebar/nav-config.ts` (+ `nav-config.test.ts` — assert "profile entry last"
  phải đổi), `src/components/layout/theme-toggle.tsx` (bỏ khỏi header, chuyển thành switch trong menu
  hoặc xoá), `src/app/globals.css` `.dark` block (+ `src/app/tokens.css` nếu cần token dark mới),
  `(app)/layout.tsx` (không đổi contract props).
- Shared contract/file: `nav-config.ts` (E24.6 thêm mục student attendance — serialize),
  `header.tsx` (E24.13), `messages/{vi,en}.json` namespace `shell.header`, `shell.nav`.

## Hiện trạng FE (grep 2026-09-06)

- `header.tsx`: bell = `Link` tới `/notifications` + badge unread; **`<ThemeToggle />` icon riêng** trên
  header (next-themes `useTheme`, `aria-label="Toggle theme"` **hardcode tiếng Anh — vi phạm i18n**);
  avatar `DropdownMenu`: userName → block tenant + `StatusBadge` role → "Đổi trường" (US-E23.1, giữ
  nguyên cơ chế `openSwitchDialog` + `menuTriggerRef`) → "Hồ sơ" (`/profile`) → "Đăng xuất". Chưa có dark
  toggle trong menu, chưa có chọn ngôn ngữ.
- `ThemeProvider` (next-themes) đã wrap root; `globals.css` có `.dark {}` **một phần** (US-E17.11:
  bg/card/text/border; comment "Status/role tokens are deliberately untouched (future full dark-mode
  pass)"). `design_src/edu/tokens.js` v3 có `T_DARK` (R2/D9): bg/card/border/text/*Light/
  successText/tealText/chipBg/inputBg dark values — nguồn để map.
- Sidebar footer **đã có** nút Thu gọn inline (`border-t`, `shell.nav.collapseSidebar/expandSidebar`,
  `aria-expanded`) — không có nút collapse "nổi" → yêu cầu "bỏ nút nổi" đã thoả. **Thiếu**: mục
  "Hướng dẫn sử dụng" (icon helpCircle) + separator phía trên Thu gọn.
- `nav-config.ts`: `/profile` là mục cuối của teacher/principal/student/parent (admin không có);
  `nav-config.test.ts` assert điều đó (25 test) → phải cập nhật test cùng commit. `shell.nav.profile`
  key trở thành dead nếu không còn dùng → xoá (vi+en) trừ khi header dùng (header dùng `shell.header.profile`).
- Không có locale switcher nào trong `src/components` (grep `useLocale|setLocale|LocaleSwitcher` chỉ ra
  feature dùng `useLocale` để format). `bootstrap/i18n/routing.ts` export `useRouter`/`usePathname`
  (next-intl) → `router.replace(pathname, { locale })` đổi ngôn ngữ giữ path + query.
- Không có route/trang "Hướng dẫn sử dụng" nào.

## Product Contract

Design v3: `design_src/edu/ui.jsx` → `Header` (dropdown lines ~520–610), `Sidebar` footer (lines
~275–303); `app.jsx` darkMode; design-spec `layout.header`/`layout.sidebar`. Quyết định user **Q-D**:
next-themes + token dark thật, toggle vào avatar dropdown, **không** `invert()`.

- **Avatar dropdown** (giữ Radix `DropdownMenu`): userName → tenant block + role badge (giữ) →
  "Đổi trường" (giữ, chỉ khi `canSwitch`) → separator → "Hồ sơ cá nhân" (`/profile`, icon User) →
  hàng "Chế độ tối" với `role="switch"` `aria-checked` (Radix `DropdownMenuCheckboxItem` hoặc `Switch`
  primitive trong item `onSelect preventDefault` để menu không đóng) → hàng "Ngôn ngữ" với 2 nút
  segmented "Tiếng Việt"/"English" (`role="radiogroup"`/`aria-checked`, `bg-primary/12` khi chọn) →
  separator → "Đăng xuất" (`text-edu-error-text`, icon LogOut). **Bỏ mục role-switch** của design
  (mock-era; US-E08.8 đã bỏ). Xoá `<ThemeToggle />` icon khỏi header (và `HeaderPlaceholder` Sun icon).
- Dark toggle: `setTheme(isDark ? "light" : "dark")` (next-themes persist localStorage, class `.dark`).
  Label từ `shell.header.darkMode`; không còn aria-label tiếng Anh.
- Ngôn ngữ: `router.replace(pathname + search, { locale })`; `<html lang>` theo locale (đã có). Không
  gọi BE; cookie `NEXT_LOCALE` do next-intl xử lý.
- **Dark tokens thật**: mở rộng `.dark` trong `globals.css` theo `T_DARK` (bg `#1E2630`-family, card,
  border, text, primaryLight/…Light, `--edu-success-text`/`--edu-teal-text` dark variants). Mọi giá trị
  từ `tokens.js` v3, KHÔNG sáng tạo. Nếu cần biến mới (vd `--edu-chip-bg`, `--edu-input-bg`) → kiểm tra
  map được sang `--muted`/`--background` trước; **token mới thật sự → ADR trước** (`docs/decisions/0077-*`
  "dark theme token set", `harness-cli decision add`) rồi `tokens.css` → `@theme` → `design-system.md`.
  Ảnh/avatar/màu môn/role không đảo. Contrast AA kiểm tra tối thiểu 3 màn D9: Class Hub
  (`/teacher/classes/[id]`), course timeline (`/student/courses/[id]`), Course Player.
- **Sidebar**: xoá `/profile` khỏi 4 role; footer = "Hướng dẫn sử dụng" (icon `CircleHelp`, tone
  text-secondary) + separator + "Thu gọn/Mở rộng" (giữ logic hiện có). Collapsed → icon-only + tooltip
  (pattern `NavLink`). **[OPEN QUESTION Q1]** đích của "Hướng dẫn sử dụng": không có trang/URL nào;
  mặc định nhận prop `helpHref?: string` (env `NEXT_PUBLIC_HELP_URL`), **không render** khi thiếu
  (không tạo dead link — precedent 2026-08-02); mở tab mới `rel="noopener"`.
- Mobile Sheet sidebar (không có `onToggle`) → chỉ hiện "Hướng dẫn" nếu có href.

## Relevant Product Docs

- `docs/product/design-spec.jsonc#layout.header`, `#layout.sidebar` (navMap cần bỏ `profile`),
  `docs/product/design-system.md` (dark section), `docs/product/screens.md` hàng App shell
- `.claude/rules/design-system.md`, `accessibility.md` (contrast dark), `i18n.md`
- `docs/stories/epics/E23-*/US-E23.1-*` (tenant switch trong menu — không regress)

## Acceptance Criteria

- Header không còn icon theme riêng; menu có đủ 4 mục theo thứ tự design; "Đổi trường" vẫn mở dialog
  không keyboard-trap (test E23.1 hiện có xanh).
- Bấm switch "Chế độ tối" → `document.documentElement` có class `dark`, menu **không đóng**; reload giữ
  theme; `aria-checked` đúng; label vi/en.
- Chọn "English" → URL đổi prefix locale, giữ path+query, `<html lang="en">`; nút đang chọn
  `aria-checked=true`.
- `NAV_BY_ROLE[*]` không chứa `/profile`; `nav-config.test.ts` cập nhật (assert không còn profile, admin
  không đổi); `/profile` route vẫn truy cập được qua menu.
- Sidebar footer: "Hướng dẫn sử dụng" render chỉ khi `helpHref`; "Thu gọn" giữ `aria-expanded`,
  persist localStorage (test `sidebar-collapse.test.ts` xanh).
- Dark mode: 3 màn D9 không còn nền trắng/chữ navy lệch (Storybook `globals.backgrounds`/`.dark`
  stories cho Header, Sidebar, StatCard, StatusBadge); text thường ≥4.5:1 trên nền dark (ghi số đo
  trong Evidence cho `--edu-success-text`, `--edu-teal-text`, `--edu-warning-text`, error-text).
- Không raw color; token mới (nếu có) có ADR + `design-system.md` sync cùng commit.
- i18n: `shell.header.{profile,darkMode,language,languageVi,languageEn,help}` vi+en; xoá dead
  `shell.nav.profile`; `theme-toggle.tsx` xoá hoặc i18n hoá nếu còn dùng ở Storybook.
- Gate xanh; design-review + a11y (menu item ≥44px touch trên mobile, focus ring visible ở dark).

## Design Notes

- UI: `header.tsx` (menu items), `header/language-switcher.tsx` (nhỏ, local), `sidebar.tsx` footer;
  `theme-toggle.tsx` → xoá nếu không còn consumer (grep trước).
- State: theme = next-themes; locale = URL; collapse = localStorage (đã có). Không TanStack.
- Tokens: `.dark` block chỉ đổi giá trị biến `--edu-*`/shadcn vars; `@theme inline` không đổi.
- Storybook: `header.stories.tsx` thêm `Dark`, `MenuOpen`; `sidebar.stories.tsx` thêm `WithHelp`,
  `CollapsedWithHelp`.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `nav-config.test.ts` (no profile), locale-switch href builder pure |
| Integration | header.test (menu items, switch không đóng menu, theme class), sidebar footer |
| E2E | Storybook interaction: menu open → toggle dark → aria-checked; language radio |
| Platform | tsc/vitest/build; `bun lint` |
| Release | design-review + a11y (contrast dark đo cụ thể) |

## Plan (fe-planner)

### 0. Code-verified corrections to "Hiện trạng FE"

- `DropdownMenuCheckboxItem` and `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`
  **already exist** in `src/components/ui/dropdown-menu/dropdown-menu.tsx` (exported) — no
  primitive work needed, use as-is.
- `Switch` primitive exists (`src/components/ui/switch/switch.tsx`) but the menu-item switch
  will use `DropdownMenuCheckboxItem`'s own checkmark treatment is wrong for a toggle look —
  use `DropdownMenuCheckboxItem` with `role="menuitemcheckbox"` (Radix default) re-labelled via
  `aria-checked`/visual thumb, OR embed the `Switch` primitive inside a plain `div` row (not
  `DropdownMenuItem`) with `onClick`/`onKeyDown` `preventDefault`+`stopPropagation` so Radix's
  `Escape`/`Enter` typeahead doesn't fight it. **Decision: use `DropdownMenuCheckboxItem`**
  (simpler, Radix already handles `onSelect preventDefault` for it, gets `role="menuitemcheckbox"`
  which satisfies `aria-checked` requirement without extra ARIA surgery) — style its check
  indicator to look like a switch thumb via `data-[state=checked]` classes if design-review wants
  the visual toggle look; functionally equivalent to AC's `role="switch"` intent (reviewer may
  request literal `role="switch"` override via `role` prop — `DropdownMenuCheckboxItem` accepts
  arbitrary props, `role="switch"` can be passed through to override Radix's default).
- `theme-toggle.tsx` has **zero other consumers** (grep confirmed: only `header.tsx` imports it,
  no `.stories.tsx`, no test file) → safe to **delete outright** once removed from `header.tsx`
  (not "i18n-ify it", per AC's either/or — deletion is the smaller diff and the file becomes fully
  dead).
- Mobile Sheet's `<Sidebar>` instance in `app-shell.tsx` (line ~119) is called **without**
  `onToggle` — the footer block in `sidebar.tsx` is currently gated `{onToggle && (...)}`, so on
  mobile the whole footer (collapse button) already doesn't render — confirms packet's read.
  Adding "Hướng dẫn sử dụng" requires **decoupling** the footer's visibility from `onToggle`:
  render the footer `<div>` when `onToggle || helpHref` is truthy, and inside it conditionally
  render the collapse button (`{onToggle && (...)}`) and the help link (`{helpHref && (...)}`)
  independently, with a `<Separator/>`-style `border-t` between them only when **both** are present.
- `nav-config.test.ts`: only 2 of its ~20 assertions reference `/profile` — line 37-43 ("always
  exposes the shared profile entry last", loops teacher/principal/student/parent) and line 82-93
  (`student` exact-list assertion, includes `"/profile"` as last element). Line 28's
  `SHARED_HREFS = new Set(["/profile", "/messages"])` becomes a no-op for `/profile` once removed
  (harmless but should be simplified to just `"/messages"` to avoid a stale reference confusing
  future readers).
- `messages/vi.json` already has `shell.header.profile: "Hồ sơ"` (reused, not new) —
  `shell.nav.profile: "Hồ sơ"` is the ONLY dead key (confirmed sole consumer was `sidebar.tsx`'s
  `t("profile")` via the now-removed nav item; no other grep hit for `"shell.nav"` namespace usage
  of `profile`).
- `(app)/layout.tsx` (`src/app/[locale]/t/[tenant]/(app)/layout.tsx`) already reads
  `process.env.NEXT_PUBLIC_*` directly and passes results down as props (established pattern,
  e.g. `NEXT_PUBLIC_USE_MOCK`) — `NEXT_PUBLIC_HELP_URL` follows the same shape: read in the RSC
  layout, pass `helpHref={process.env.NEXT_PUBLIC_HELP_URL}` into `AppShell` → `Sidebar` (both
  desktop + mobile instances).

### 1. Dark tokens — exact `T_DARK` v3 values (`design_src/edu/tokens.js:43-52`) + gap analysis

```
bg:        #151B23   card:       #1E2630   border:     #33404E
chipBg:    #2A333E   inputBg:    #161D26
textPrimary:   #EAEFF5   textSecondary: #B4C0CE   textMuted: #8494A7
primaryLight:  #28344E   successLight:  #123330   warningLight: #3A2F16
errorLight:    #3B2620   errorDarkLight: #43201F  infoLight:    #1D2E47
purpleLight:   #2E2743   tealLight:     #12312F
successText:   #3FD0B3   tealText:      #4FC3B5
warningForeground: #EAEFF5
```

- **Gap in `T_DARK`**: it does NOT override `errorText`/`warningText` (design_src's own oversight
  — those tones keep the light-mode value `#C0392B`/`#9A6A0F` when merged via `applyTheme`, which
  is a real design-source gap, not something to silently "fix" by inventing a value).
- **`globals.css` `.dark` already has a DIFFERENT, already-AA-verified pair** for exactly this
  problem: US-E21.2 (A11Y-001) computed `--edu-error-light:#5c0007`/`--edu-error-text:#ffdad6`
  and `--edu-warning-light:#4d3300`/`--edu-warning-text:#ffd699` specifically because the naive
  light-value-on-dark-card combo failed contrast — these were verified ≥9.5:1 (comment in
  `globals.css:179-189`). **Decision: KEEP these two pairs as-is** (do not overwrite with
  `T_DARK.errorLight`/`warningLight`, which were never paired with a working dark text tone) —
  they are the correct answer to the exact gap `T_DARK` left open. This IS a divergence from
  "every value from `tokens.js`, no invention" for these 2 pairs specifically, but the invention
  already happened (and was reviewed) in US-E21.2 — re-deriving from `T_DARK` would regress a
  fixed bug. Flag this explicitly in the PR description / Evidence for `fe-tech-lead-reviewer`.
- **What actually changes in `.dark`** (`src/app/globals.css:164-214`):
  - Replace `--background`, `--edu-bg` (`#0b1020`→`#151B23`), `--edu-card`/`--card`/`--popover`
    (`#131a2e`→`#1E2630`), `--edu-border`/`--border`/`--input` (`#232b45`→`#33404E`),
    `--edu-text-primary`/`--foreground`/`--card-foreground`/`--popover-foreground`
    (`#e5eaf2`→`#EAEFF5`), `--edu-text-secondary`/`--muted-foreground`
    (`#8898a9`→`#B4C0CE`), `--edu-text-muted` (`#8898a9`→`#8494A7`) — these were invented
    at ADR 0023/US-E17.11 time and are **superseded** by real `T_DARK` values (per packet's
    ADR-0077 candidate title).
  - Add dark overrides (currently absent, so light-mode value leaks through today) for:
    `--edu-primary-light` (`#28344E`), `--edu-success-light` (`#123330`), `--edu-info-light`
    (`#1D2E47`), `--edu-purple-light` (`#2E2743`), `--edu-teal-light` (`#12312F`),
    `--edu-success-text` (`#3FD0B3`), `--edu-teal-text` (`#4FC3B5`).
  - `--secondary`/`--muted`/`--accent`/`--sidebar`/`--sidebar-accent` (currently `#1c2541`,
    hand-picked to sit between old bg/card) need re-deriving to sit sensibly between the NEW
    `#151B23`/`#1E2630` — closest available `T_DARK` value is `chipBg` (`#2A333E`); use it for
    these "one shade up from card" roles (matches design_src's own use of `chipBg` as the
    tonal-surface-on-card color). `--sidebar`/`--sidebar-primary`/etc mirror `--card`/`--primary`
    as today (unchanged mechanism, only base values move).
  - `--input` (currently `#232b45`, i.e. same as `--border`): T_DARK's dedicated `inputBg`
    (`#161D26`) is darker than `card` (`#1E2630`) — closer to design intent of a recessed input
    well. Use `#161D26` for `--input` (shadcn's `--input` token is a background/border seed, not
    strictly one or the other — this repo's own convention already reused `--border`'s value for
    it, so reusing `inputBg` here is consistent with that convention, not a new pattern).
  - `--ring`, `--primary`, `--primary-foreground`, `--destructive` stay as today
    (`var(--edu-primary-dark)` / `var(--edu-error)`) — unrelated to this token set, ADR 0023 already
    covers the primary-on-dark contrast fix.
- **No genuinely new CSS variable is required.** `chipBg`/`inputBg` from `tokens.js` map onto
  **existing** `--edu-*`/shadcn vars (`--secondary`/`--muted`/`--accent` and `--input`
  respectively) — confirmed no component in this repo consumes a literal `--edu-chip-bg` or
  `--edu-input-bg` today (Badge/Chip patterns use `bg-{color}/12` opacity utilities per
  `design-system.md`, not a dedicated chip-bg var). **ADR 0077 is NOT required** — this is a
  value-only change to already-declared tokens; record as Evidence per packet's own conditional
  ("nếu chỉ đổi giá trị biến đã có → ghi Evidence, không ADR"). If `fe-tech-lead-reviewer` disagrees
  (e.g. wants a literal `--edu-chip-bg` for future Chip components) that's a fresh decision at
  review time, not a blocker for this plan.

### 2. Order of work (minimizes churn — i18n/tests first, dark tokens last/independent)

**Phase 1 — i18n + nav-config (no UI change yet, cheapest to review)**
- Files: `src/bootstrap/i18n/messages/{vi,en}.json` (add `shell.header.{darkMode,language,
  languageVi,languageEn,help}`; remove `shell.nav.profile`), `src/components/layout/app-shell/
  sidebar/nav-config.ts` (remove the trailing `{ href: "/profile", labelKey: "profile", icon:
  User }` entry from teacher/principal/student/parent arrays; drop now-unused `User` icon import
  if nothing else in the file uses it — check first, `Settings2`/others stay).
- Test first (red): update `nav-config.test.ts` — line 37-43 test becomes "no role's nav list
  contains `/profile`" (loop all `ROLES`, `expect(items.some(i => i.href === "/profile")).toBe
  (false)`); line 82-93 student exact-list drops `"/profile"` (6 items, not 7 — update the test's
  own comment/count too); simplify `SHARED_HREFS` to `new Set(["/messages"])`.
- Done when: `bun vitest run nav-config.test.ts` green with the new assertions (not just not-red
  — must assert the NEW behavior, not merely delete the old assertion).

**Phase 2 — Header: menu restructure + dark toggle + language switcher**
- Files: `src/components/layout/app-shell/header/header.tsx` (remove `<ThemeToggle />` + its
  import + `Sun` icon import if now unused there; remove `HeaderPlaceholder`'s standalone `Sun`
  icon button — placeholder shrinks to bell + avatar only, matching the mounted state's 2-icon
  header once the theme toggle moves into the menu; reorder menu: profile → dark-mode row →
  language row → separator → logout, with "Đổi trường" kept exactly where it is today, before the
  separator that precedes profile), new `src/components/layout/app-shell/header/
  language-switcher.tsx` (small presentational, receives `locale: "vi"|"en"` — no own state, calls
  `router.replace(pathname, { locale })` from `@/bootstrap/i18n/routing` on click, guards
  `pathname` against `null`), delete `src/components/layout/theme-toggle.tsx`.
- Test first (red): `header.test.tsx` — (a) menu no longer contains a standalone theme-icon
  button outside the dropdown; (b) clicking the dark-mode row does NOT close the menu (`menuOpen`
  stays true — assert dropdown content still in the DOM after click) AND toggles
  `document.documentElement.classList.contains("dark")`; (c) the language row's currently-selected
  button has `aria-checked="true"`, clicking the other one calls `router.replace` with the new
  locale preserving `pathname`; (d) existing "Đổi trường"/`openSwitchDialog` tests (US-E23.1) stay
  green untouched — assert no regression by re-running that describe block as-is.
- Done when: `header.test.tsx` green; `derive-tenant-menu.test.ts` untouched/green (no logic there
  changes).

**Phase 3 — Sidebar footer: "Hướng dẫn sử dụng" + help-href prop threading**
- Files: `sidebar.tsx` (add `helpHref?: string` prop; restructure footer render condition from
  `{onToggle && (...)}` to `{(onToggle || helpHref) && (<div>...{helpHref && <a .../>}...
  {onToggle && <button.../>}...)}`, `CircleHelp` icon import, separator only when both present),
  `app-shell.tsx` (thread new `helpHref?: string` prop to BOTH `<Sidebar>` instances — desktop
  and the mobile `Sheet` one), `(app)/layout.tsx` (read `process.env.NEXT_PUBLIC_HELP_URL`, pass
  as `helpHref` into `<AppShell>`).
- Test first (red): a `sidebar.test.tsx`(new, or extend if one exists — verify first) asserting:
  no `helpHref` → no "Hướng dẫn sử dụng" link rendered (AC's no-dead-link rule); `helpHref` set →
  renders `<a href={helpHref} target="_blank" rel="noopener">` above the collapse button with a
  visual separator; collapsed state → icon-only + tooltip (reuse existing `NavLink`'s
  `Tooltip`/`TooltipTrigger` pattern, don't fork a second tooltip wiring).
- Done when: new/updated sidebar tests green; existing `sidebar-collapse.test.ts` (localStorage
  persistence) stays green untouched (footer restructure must not touch `onToggle`'s own logic).

**Phase 4 — Dark tokens (independently testable, do last since it's pure CSS)**
- Files: `src/app/globals.css` `.dark` block only (values per §1 above; NO new `@theme inline`
  mappings needed since no new CSS variable name is introduced — only value changes to vars
  already mapped).
- Test first (proof, not unit-testable): Storybook `Dark` stories — `header.stories.tsx` add
  `Dark` (background addon `.dark`, `MenuOpen` state combined), `sidebar.stories.tsx` add `Dark`;
  also add/verify a `Dark` story on `StatCard` and `StatusBadge` (per AC's explicit mention) if
  they don't already have one (grep first — `US-E17.11` may have added some already).
- Done when: Storybook interaction suite (`vitest.storybook.mts`) green; manual contrast
  measurement recorded in Evidence for the 3 named screens (see §4).

### 3. Component/state sketch

```
header.tsx (DropdownMenuContent)
 ├─ user/tenant block (unchanged)
 ├─ "Đổi trường" (unchanged, canSwitch-gated)
 ├─ DropdownMenuSeparator
 ├─ DropdownMenuItem "Hồ sơ cá nhân"        (unchanged position, just re-ordered relative to below)
 ├─ DropdownMenuCheckboxItem "Chế độ tối"   (NEW — next-themes useTheme(), checked={resolvedTheme==="dark"})
 ├─ [row] "Ngôn ngữ" → <LanguageSwitcher/>  (NEW component, header/language-switcher.tsx)
 ├─ DropdownMenuSeparator
 └─ DropdownMenuItem "Đăng xuất"            (unchanged)

sidebar.tsx footer
 ├─ {helpHref && <a>Hướng dẫn sử dụng</a>}  (NEW, icon CircleHelp)
 ├─ {helpHref && onToggle && <div className="border-t"/>}  (separator only if both)
 └─ {onToggle && <button>Thu gọn/Mở rộng</button>}          (unchanged)
```
- State: `theme` = next-themes context (already provided at root, no new provider). `locale` =
  URL segment (next-intl `useRouter`/`usePathname`, no client state at all — the switcher is a
  stateless pair of links/buttons deriving "selected" from the current `locale` param already
  available via `useLocale()`). `helpHref` = server-derived env value threaded as a prop, never
  client-fetched. No TanStack Query anywhere in this story (no server data).
- No new shared/ui component warranted: `language-switcher.tsx` is single-consumer (header only)
  → stays in `features`-adjacent `header/` folder per the "1 screen tạm" rule
  (`component-organization.md`) — promote only if a 2nd surface needs a locale switcher.

### 4. Contrast validation plan (AC's "3 màn D9")

Screens to check in dark mode (`.dark` class + each screen's live data, not Storybook isolation —
composited surfaces matter for chip-on-card contrast):
1. `/teacher/classes/[id]` (Class Hub) — StatCard values, StatusBadge tones (attendance/conduct),
   subject-color chips.
2. `/student/courses/[id]` (course timeline) — timeline item status chips (done/live/upcoming),
   progress bar fill vs new dark track color.
3. Course Player — media-surface chrome (`--edu-media-surface`, explicitly THEME-INDEPENDENT per
   ADR 0050 — confirm it still reads correctly against the new card/bg, since it was tuned against
   the OLD dark bg `#0b1020` which was close to its own `#0f1117`; new bg `#151B23` is now lighter
   than media-surface — verify no visible seam/regression), caption/transcript text on the
   always-dark chrome.

Token pairs to measure + record in `## Evidence` (with tool/method, e.g. WebAIM contrast checker
or `color-mix` computed): `--edu-success-text` (#3FD0B3) on `--edu-card` (#1E2630) and on
`--edu-success-light` (#123330); `--edu-teal-text` (#4FC3B5) likewise; `--edu-warning-text`
(kept `#ffd699`, US-E21.2 value) on the kept `--edu-warning-light` (#4d3300); `--edu-error-text`
(kept `#ffdad6`) on kept `--edu-error-light` (#5c0007) — re-confirm these two still hold since
`--card`/`--bg` changed even though the light/text pair itself didn't (they're likely composited
directly against each other, not against the new bg, so should be unaffected, but verify — don't
assume). Also base `--foreground` (#EAEFF5) on new `--card`/`--background` (#1E2630/#151B23) for
the plain-text ≥4.5:1 baseline.

### 5. Test plan (maps to packet's Validation table)

| Layer | File | Behavior |
| --- | --- | --- |
| Unit | `nav-config.test.ts` | no role list contains `/profile`; student list is 6 items |
| Unit | `header/language-switcher.test.ts` (new, pure) | href/locale-preserving-path builder if extracted as a pure fn (prefer extracting the "next locale for a click" derivation as a pure function to unit-test rather than only testing via RTL) |
| Integration | `header.test.tsx` | menu order incl. new rows; dark toggle doesn't close menu + sets `.dark`; language radio `aria-checked`; existing tenant-switch tests stay green |
| Integration | `sidebar.test.tsx` (new/extended) | help link renders only with `helpHref`; separator only when both present; collapsed tooltip; `sidebar-collapse.test.ts` untouched |
| E2E/Story | `header.stories.tsx` `Dark`/`MenuOpen`, `sidebar.stories.tsx` `WithHelp`/`CollapsedWithHelp` | Storybook interaction: open menu → toggle dark → assert `aria-checked` + `.dark` class; language radio interaction |
| Platform | — | `bunx tsc --noEmit`; `bun lint`; `bun vitest run`; `bun build` (touches `globals.css`/`messages` — must build clean per rule) |
| Release | — | design-review gate (`docs/DESIGN_REVIEW.md`) + a11y pass (44px touch targets on mobile menu rows, focus ring visible on dark switch/radio buttons) |

### 6. Risks / open questions

- **[RISK]** `--edu-media-surface`/`--edu-media-surface-foreground` (ADR 0050, theme-independent)
  was tuned when the app's dark `--edu-bg` was `#0b1020` (near-black, close to media-surface's
  `#0f1117` — low seam). New `T_DARK.bg` (`#151B23`) is visibly lighter — Course Player may now
  show a visible seam between page chrome and player chrome. Flag to `fe-tech-lead-reviewer`; not
  a new token needed (ADR 0050 already says media surface is intentionally independent), just a
  visual QA check.
- **[RISK]** `--secondary`/`--muted`/`--accent`/`--sidebar-accent` don't have a direct `T_DARK`
  source value (design_src doesn't name a distinct "secondary surface" token) — plan reuses
  `chipBg` (#2A333E) for these; reviewer may want a different tonal step. Low risk (these are
  hover/muted surfaces, not primary content).
- **[OPEN QUESTION]** `DropdownMenuCheckboxItem` vs literal `role="switch"` override for the
  dark-mode row — plan defaults to `DropdownMenuCheckboxItem` (functionally satisfies
  `aria-checked` requirement); flag to `fe-accessibility-auditor` in case a screen-reader user
  expects switch semantics specifically (VoiceOver/NVDA announce "checkbox" vs "switch"
  differently) — cheap to override `role` prop if the auditor insists.
- **[OPEN QUESTION]** exact copy for `shell.header.help` label ("Hướng dẫn sử dụng" per packet) —
  no UX-writer pass exists for this string; using the packet's own Vietnamese wording verbatim,
  English mirror `"Help"` (short, matches sidebar's terse nav labels) — flag if
  `fe-tech-lead-reviewer`/design-review wants a different EN phrasing (e.g. "User guide").
- **No ADR required for dark tokens** (see §1) — this is the single biggest scope question the
  packet flagged ("Q-D... có thể cần token mới → ADR trước") and this plan resolves it: NO new
  CSS variable name, only value changes to already-declared `--edu-*` vars, so ADR 0077 is
  **not needed** for this story. If `fe-tech-lead-reviewer` finds a spot needing a literal
  `--edu-chip-bg`, that's a fresh finding at review time, not something this plan pre-empts.

## Harness Delta

ADR ứng viên `0077` "Dark theme token set (adopt T_DARK v3, supersede partial .dark của US-E17.11)" —
chỉ khi phải thêm biến mới; nếu chỉ đổi giá trị biến đã có → ghi Evidence, không ADR.

## Evidence

(chưa có — planned)
