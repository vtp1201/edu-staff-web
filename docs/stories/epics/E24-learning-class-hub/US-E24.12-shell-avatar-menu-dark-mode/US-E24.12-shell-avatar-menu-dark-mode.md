# US-E24.12 Shell: avatar dropdown (Hồ sơ / Chế độ tối / Ngôn ngữ / Đăng xuất) + sidebar bỏ `profile`, footer Hướng dẫn + Thu gọn

## Status

planned

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

## Harness Delta

ADR ứng viên `0077` "Dark theme token set (adopt T_DARK v3, supersede partial .dark của US-E17.11)" —
chỉ khi phải thêm biến mới; nếu chỉ đổi giá trị biến đã có → ghi Evidence, không ADR.

## Evidence

(chưa có — planned)
