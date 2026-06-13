# Rule: EduPortal Design System

Source of truth runtime: `src/app/tokens.css` (mapped to shadcn semantic vars
trong `src/app/globals.css` `@theme`). Contract đọc hiểu:
`docs/product/design-system.md`. Khi viết BẤT KỲ UI nào, tuân theo file này.

> Design này derive từ legacy handoff — coi là **spec hình ảnh/UX**, không phải
> kiến trúc (decision `0011`). Token đã chốt, **không tự sáng tạo** palette/layout
> ngược handoff.

## Token rules (cứng)

- CHỈ dùng semantic token: `bg-background`, `text-foreground`, `bg-muted`,
  `bg-primary`, `border-border`, và `bg-edu-*`/`text-edu-*` đã define.
- KHÔNG raw color (`#fff`, `slate-100`, `text-gray-500`, `bg-[#...]`).
- Cần token mới → thêm vào `src/app/tokens.css` TRƯỚC, map ở `@theme` trong
  `globals.css`, RỒI mới dùng. Đồng bộ `docs/product/design-system.md`.
- Conflict giữa doc và code runtime → `tokens.css` thắng.

## Font & Typography

Font: **Plus Jakarta Sans** (`--font-sans`, đã wire qua `next/font`).

| Vai trò | Size | Weight | Màu |
| --- | --- | --- | --- |
| page-title | 22px (`text-2xl`) | 800 | text-primary |
| section-title | 18px | 800 | text-primary |
| card-title | 15px | 700 | text-primary |
| body | 13–14px (`text-sm`) | 400–500 | text-primary |
| label | 12px | 700 | text-muted, UPPERCASE + tracking |
| caption | 11px | 400 | text-muted |
| stat-value | 26px | 800 | text-primary |

## Palette & semantic mapping

Brand `--edu-primary #5D87FF` (light `#ECF2FF`, dark `#4570EA`). Status:
success `#13DEB9`, warning `#FFAE1F`, error `#FA896B`, info `#539BFF`, purple
`#7B5EA7`, teal `#00B8A9`. Surfaces: bg `#F5F7FA`, card `#FFF`, border `#E5EAF2`.
Text: primary `#2A3547`, secondary `#5A6A85`, muted `#8898A9`.

> ⚠️ Warning vàng → text dùng `--edu-warning-foreground` (#2A3547), KHÔNG trắng
> (a11y, decision `0013`).

### Role → màu (chỉ khác MÀU, không khác tông — decision 0013)

`teacher → primary` · `principal → success` · `student → warning` ·
`parent → purple`. Dùng `--edu-role-*`.

### Score / performance màu

`score ≥ 8 → success` · `score < 5 → error` · còn lại `text-primary`.
GPA: `≥8.5 Giỏi→success` · `≥7 Khá→primary` · `≥5 TB→warning` · `<5 Yếu→error`.

## Spacing / radius / shadow

Sidebar 260px (collapsed 72px), header 64px, card padding 20–24px, gap 16px.
Radius: btn 8px, card 12px, role-icon 16px, badge full, otp 10px. Shadow:
`shadow-card` default, `shadow-card-hover` hover, `shadow-toggle`.

## Component patterns (tái dùng — đừng tự chế lại)

- `StatCard`: white card, icon box 52×52 (`bg = iconColor/18`, radius 12), value
  26px/800, trend ↑green/↓red.
- `Badge`: padding 3px 10px, radius full, 11px/600, `bg = color/18`.
- `ProgressBar`: track `--edu-border`, fill color prop, `transition width .6s`.
- `Sidebar`: active item `bg primary/12` + 3px left accent bar, fw700;
  collapse persist localStorage.
- Primitives qua `bun ui:add <name>` (KHÔNG copy-paste shadcn web). Variant của
  primitive sửa thẳng trong `components/ui/<name>/`; composed dùng ≥2 screen để
  `components/shared/<name>/`, chỉ 1 screen tạm để `features/<x>/presentation/`
  rồi promote. **Một component = một nơi, cấm trùng lặp** — xem
  `.claude/rules/component-organization.md` (decision `0026`).

## Status / badge mappings

- Assignment: pending ≤1d `error`, ≤3d `warning`, >3d `success`; submitted
  `primary`; graded `success`.
- Schedule: done `muted`, live `success` + left accent, upcoming `warning`.
- Discipline severity: Nhẹ `warning`, Vừa `error`, Nặng `destructive`.

## Liên quan

- A11y + motion: `.claude/rules/accessibility.md` (decision `0013`).
- Tailwind v4 / shadcn flow: `.claude/rules/tailwind-v4.md`.
- Design-review gate: `docs/DESIGN_REVIEW.md` + `.claude/rules/impeccable.md`.
- Screen inventory: `docs/product/screens.md`.
- **Per-screen spec (normative layout)**: `docs/product/design-spec.jsonc` — khi
  build một màn, coi entry tương ứng là spec layout/giá trị bắt buộc (decision `0011`/`0014`).
